import { LaunchLogin, EcosystemFooter, InteractiveManual, QuickManual } from "./WebsiteManual";
import { DEFAULT_RULES, parseRules } from "./naming";
import {
  captureDrop,
  fileEntry,
  mergeSelection,
  type DropSelection,
} from "./drop-files";
import { AnalysisCache, analysisQueue, analyzeFile } from "./analysis-engine";
import { ProcessingPanel, type RunProgress } from "./ProcessingPanel";
import { analysisWarning } from "./analysis-errors";
import { isImage, workflowComplete } from "./domain";
import { GuideReply } from "./GuideReply";
import { BatchReview } from "./BatchReview";
import { CopyAudit } from "./CopyAudit";
import { SavedCopyReport } from "./SavedCopyReport";
import { useEffect, useRef, useState, useMemo, lazy, Suspense } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  FolderOpen,
  ShieldCheck,
  Sparkles,
  FileText,
  Check,
  ChevronRight,
  ChevronLeft,
  Monitor,
  MessageCircle,
  X,
  Play,
  CheckCircle2,
  LoaderCircle,
  Download,
  Layers,
  FolderTree,
  Heart,
  ArrowLeft,
  Info,
  Copy,
  Undo2,
  Menu,
  Terminal,
  Cloud,
  LockKeyhole,
  Workflow,
  Code2,
  Server,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Entry,
  extension,
  supported,
  validatePlan,
  destination,
  uniqueApprovedNames,
  completePlan,
  type ScanIssue,
} from "./domain";
import {
  inventory,
  copyApproved,
  rollback,
  Manifest,
  CopyInterruptedError,
} from "./files";
import { sampleDocuments } from "./samples";
import { BrowserChecks } from "./BrowserChecks";
import { guideEndpoint } from "./guide-client";
import { answerSchema } from "../server/contracts";
const OrganizerBenchmark = import.meta.env.DEV
  ? lazy(() =>
      import("./OrganizerBenchmark").then((module) => ({
        default: module.OrganizerBenchmark,
      })),
    )
  : () => null;
type Page = "home" | "organize" | "family" | "demo" | "help";
const links = [
  ["DeTLeng", "https://www.detleng.com/"],
  ["Automation", "https://automation.detleng.com/"],
  ["LFDS", "https://lfds.detleng.com/"],
  ["Network", "https://network.detleng.com/"],
];
const nav: [Page, string][] = [
  ["home", "Home"],
  ["organize", "Organize Files"],
  ["family", "Meet the AI Family"],
  ["demo", "Interactive Demo"],
  ["help", "Quick Guide"],
];
const family: {
  name: string;
  role: string;
  intro: string;
  description: string;
  where: string;
  access: string;
  status: string;
  icon: LucideIcon;
  url: string;
  accent: string;
}[] = [
  {
    name: "Local Organizer",
    role: "The organization engine",
    intro: "Every thoughtful team needs a place to think.",
    description:
      "Local code preserves useful filenames, extracts document titles and applies consistent folder rules. It needs no AI model or account.",
    where: "Your computer",
    access: "Only the files you select; no document network requests.",
    status: "Available immediately in your browser",
    icon: Monitor,
    url: "https://github.com/Navid-Ishaq/arrangemyfilesai-detleng",
    accent: "mint",
  },
  {
    name: "Document Readers",
    role: "The evidence readers",
    intro: "A little clarity for those mysterious filenames.",
    description:
      "Document readers extract title metadata, headings and opening text. Naming rules use this evidence; missing titles keep the original name.",
    where: "Inside a local browser worker",
    access: "Bounded extracted text; no independent folder access.",
    status: "No model installation required",
    icon: Sparkles,
    url: "https://github.com/Navid-Ishaq/arrangemyfilesai-detleng",
    accent: "peach",
  },
  {
    name: "GroqCloud",
    role: "The conversational intelligence",
    intro: "Sometimes the next useful thing is a good explanation.",
    description:
      "GroqCloud powers the online DeTLeng AI Guide. Ask about setup, general folder strategies, or what a warning means. Your private file inventory is never automatically included.",
    where: "Cloud, through our secure backend",
    access: "Your chat message and explicitly shared stage/error codes.",
    status: "Live Guide backend · Groq conversation verified",
    icon: MessageCircle,
    url: "https://groq.com/",
    accent: "lilac",
  },
  {
    name: "Mastra",
    role: "The agent framework",
    intro: "Helpful intelligence benefits from thoughtful structure.",
    description:
      "Mastra gives the Guide its instructions, curated help tool, and structured replies. The framework runs inside the Guide backend on Render; Mastra Platform is optional and is not connected.",
    where: "Node.js Guide backend on Render",
    access: "Guide messages and allowlisted context only.",
    status: "Framework integrated · Platform not connected",
    icon: Workflow,
    url: "https://mastra.ai/",
    accent: "mint",
  },
  {
    name: "Render",
    role: "The Guide hosting home",
    intro: "A welcoming home for your online Guide.",
    description:
      "Render hosts the secure Guide API. It connects the optional Guide to GroqCloud; private document analysis stays on your computer. The local organizer works independently.",
    where: "Hosted Guide backend",
    access: "Guide messages and explicitly shared stage/error codes.",
    status: "Guide API live · local organizer independent",
    icon: Server,
    url: "https://render.com/",
    accent: "peach",
  },
  {
    name: "Codex",
    role: "The development collaborator",
    intro: "And behind the workshop, a collaborator helping build with care.",
    description:
      "Codex helps develop, test, and refine the application. Visitors do not need to install Codex or connect an account to use the organizer.",
    where: "Development workflow",
    access: "No runtime role in your document processing.",
    status: "Development collaborator",
    icon: Code2,
    url: "https://openai.com/codex/",
    accent: "lilac",
  },
];
function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={secondary ? "button secondary" : "button"}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function App() {
  const [page, setPage] = useState<Page>("home");
  const [mobile, setMobile] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [scanIssues, setScanIssues] = useState<ScanIssue[]>([]);
  const [scanAcknowledged, setScanAcknowledged] = useState(false);
  const [source, setSource] = useState<FileSystemDirectoryHandle>();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const analysisCache = useRef(new AnalysisCache());
  const [run, setRun] = useState<RunProgress>();
  const [dragActive, setDragActive] = useState(false);
  const [allowSnapshotCopy, setAllowSnapshotCopy] = useState(false);
  const [ruleText, setRuleText] = useState(() => {
    try {
      const saved = localStorage.getItem("arrangemyfiles-folder-rules");
      if (saved) {
        parseRules(saved);
        return saved;
      }
    } catch {
      /* use defaults when storage is unavailable */
    }
    return DEFAULT_RULES;
  });
  const [errorCode, setErrorCode] = useState("NONE");
  const [manifest, setManifest] = useState<Manifest>();
  const [outDir, setOutDir] = useState<FileSystemDirectoryHandle>();
  const [outputLabel, setOutputLabel] = useState("");
  const [copyInterruption, setCopyInterruption] = useState("");
  const [guide, setGuide] = useState(false);
  const [familyIndex, setFamilyIndex] = useState(-1);
  const [loginOpen, setLoginOpen] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const supportedBrowser =
    typeof window.showDirectoryPicker === "function" && window.isSecureContext;
  const go = (p: Page) => {
    setPage(p);
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  useEffect(() => {
    document.title = `${nav.find((n) => n[0] === page)?.[1]} · Arrange My Files AI`;
  }, [page]);
  const outputEntries = useMemo(() => completePlan(entries), [entries]);
  const approved = outputEntries.filter((e) => e.approved);
  const suggested = entries.filter((e) => e.status === "suggested");
  const stage = manifest
    ? "results"
    : suggested.length
      ? "review"
      : busy.includes("Analyz")
        ? "analysis"
        : entries.length
          ? "choose"
          : "setup";
  function report(e: unknown) {
    const raw = e instanceof Error ? e.message : "";
    const code =
      ["MODEL_MISSING", "INFERENCE_FAILED", "OLLAMA_UNREACHABLE"].find((c) =>
        raw.includes(c),
      ) ||
      ((e as DOMException)?.name === "NotAllowedError"
        ? "PERMISSION_DENIED"
        : "NONE");
    setErrorCode(code);
    setNotice(
      code === "NONE"
        ? raw || "The operation could not finish. Your originals are preserved."
        : `${code.replaceAll("_", " ")}. Open the Quick Guide for recovery steps.`,
    );
  }
  async function addSelection(selection: DropSelection) {
    const result = await mergeSelection(entries, selection);
    setEntries(result.entries);
    setSource(undefined);
    setAllowSnapshotCopy(true);
    setScanIssues((old) => [...old, ...result.issues]);
    setScanAcknowledged(false);
    setRun(undefined);
    setNotice(
      `${result.entries.length} files in the combined batch. ${result.duplicates} repeated items ignored. All files are included unless you explicitly exclude them.`,
    );
  }
  function clearBatch() {
    if (
      entries.length &&
      !window.confirm(
        "Clear this input batch and its proposed edits? Original files and saved outputs are not deleted.",
      )
    )
      return;
    setEntries([]);
    setSource(undefined);
    setManifest(undefined);
    setOutDir(undefined);
    setRun(undefined);
    setScanIssues([]);
    setScanAcknowledged(false);
    analysisCache.current.clear();
    setCopyInterruption("");
    setNotice("Batch cleared. Add files or folders to start a new batch.");
  }
  function scanProgress(count: number, path: string) {
    setBusy(`Scanning: ${count} files found · ${path}`);
  }
  function dropDocuments(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (busy || manifest) {
      setNotice(
        "Finish the current operation, or start a new batch before adding files. This drop was not added.",
      );
      return;
    }
    try {
      const read = captureDrop(event.dataTransfer, scanProgress);
      setBusy("Scanning dropped files and folders…");
      void read()
        .then(addSelection)
        .catch(report)
        .finally(() => setBusy(""));
    } catch (error) {
      report(error);
    }
  }
  async function choose() {
    try {
      const root = await window.showDirectoryPicker({ mode: "read" });
      setBusy("Scanning folder…");
      const result = await inventory(root, scanProgress);
      await addSelection({ ...result, source: root });
    } catch (e) {
      if ((e as DOMException).name !== "AbortError") report(e);
    } finally {
      setBusy("");
    }
  }
  function loadSamples() {
    if (
      entries.length &&
      !window.confirm("Replace this batch with synthetic examples?")
    )
      return;
    setScanIssues([]);
    setScanAcknowledged(false);
    setAllowSnapshotCopy(false);
    analysisCache.current.clear();
    setRun(undefined);
    setEntries(
      sampleDocuments.map((s, i) => ({
        id: String(i),
        path: "Synthetic samples/" + s.name,
        name: s.name,
        size: new Blob([s.text]).size,
        file: new File([s.text], s.name, { type: "text/plain" }),
        status: "inventoried",
        approved: true,
        title: "",
        category: "",
        subcategory: "",
      })),
    );
    setSource(undefined);
    setManifest(undefined);
    setOutDir(undefined);
    setNotice(
      "Synthetic files loaded in browser memory. Build a local rule-based plan. Copying these samples is disabled; use the generated fixture folder for copy tests.",
    );
  }
  async function analyze(rebuild = false) {
    let rules;
    try {
      rules = parseRules(ruleText);
    } catch (error) {
      report(error);
      return;
    }
    if (
      rebuild &&
      approved.length &&
      !window.confirm(
        "Rebuild names and category proposals using the Folder rules currently shown above? Manual name/category edits will reset. Included/excluded files stay unchanged. Original files are not modified.",
      )
    )
      return;
    const included = entries.filter((e) => e.approved);
    const queue = rebuild ? included : analysisQueue(included);
    if (!queue.length) {
      setNotice(
        "Existing successful suggestions are preserved. Only failed or unprocessed files need analysis.",
      );
      return;
    }
    const started = Date.now();
    setRun({
      started,
      total: queue.length,
      completed: 0,
      failed: 0,
      cached: 0,
      stage: "Preparing local analysis",
      fileStarted: started,
      fileNumber: 1,
      durations: [],
      active: true,
    });
    setBusy("Analyzing documents…");
    setNotice("");
    abort.current = new AbortController();
    try {
      for (const current of queue) {
        if (abort.current.signal.aborted) break;
        const fileStarted = Date.now();
        setRun(
          (old) =>
            old && {
              ...old,
              fileStarted,
              fileNumber: queue.indexOf(current) + 1,
              stage: "Preparing local file",
            },
        );
        let reused = false;
        let updated = {
          ...current,
          approved: current.approved,
          reviewAccepted: false,
          keepForReview: false,
          suggestion: undefined,
          title: "",
          category: "",
          subcategory: "",
          warning: undefined,
        } as Entry;
        if (current.scanError) {
          updated.status = "needs attention";
          updated.warning = current.scanError;
        } else if (!supported.has(extension(current.name))) {
          updated.status = "unsupported";
          updated.warning = isImage(current.name)
            ? "Not supported in this release—original preserved"
            : "Unsupported format; file preserved.";
          setErrorCode("UNSUPPORTED");
        } else
          try {
            const analyzed = await analyzeFile(
              current.file,
              analysisCache.current,
              abort.current.signal,
              (stage) => setRun((old) => old && { ...old, stage }),
              rules,
            );
            if (abort.current.signal.aborted) break;
            reused = analyzed.cached;
            const content = { warning: analyzed.value.warning };
            const result = analyzed.value.suggestion;
            updated = {
              ...updated,
              status: "suggested",
              suggestion: result,
              coverage: analyzed.value.coverage,
              title: result.title,
              category: result.category,
              subcategory: result.subcategory,
              warning:
                content.warning ||
                (result.needsReview
                  ? "Please review this rule-based suggestion."
                  : undefined),
            };
          } catch (e) {
            if (abort.current.signal.aborted) break;
            updated.status = "needs attention";
            const code = (e as Error).message.split(":")[0];
            setErrorCode(
              [
                "MODEL_MISSING",
                "INFERENCE_FAILED",
                "OCR_REQUIRED",
                "OVERSIZED",
                "EMPTY",
              ].includes(code)
                ? code
                : "EXTRACTION_FAILED",
            );
            updated.warning = analysisWarning(e);
          }
        setRun(
          (old) =>
            old && {
              ...old,
              completed: old.completed + 1,
              failed: old.failed + (updated.status === "suggested" ? 0 : 1),
              cached: old.cached + (reused ? 1 : 0),
              durations: [...old.durations, Date.now() - fileStarted],
            },
        );
        setEntries((previous) =>
          previous.map((e) => (e.id === current.id ? updated : e)),
        );
      }
      setNotice(
        abort.current.signal.aborted
          ? "Planning stopped. Completed suggestions are available."
          : "Plan ready. Every included file will be copied: accepted plans into categories; uncertain or unsupported files unchanged into Needs Review.",
      );
    } finally {
      setBusy("");
      abort.current = null;
      setRun((old) => old && { ...old, active: false });
    }
  }
  async function organize() {
    if (!source && !allowSnapshotCopy) return;
    try {
      const output = await window.showDirectoryPicker({ mode: "readwrite" });
      if (
        !window.confirm(
          `Copy ${approved.length} included files: ${approved.filter((e) => e.copyRoute === "organized").length} into category folders and ${approved.filter((e) => e.copyRoute === "review").length} unchanged into Needs Review? ${entries.length - approved.length} explicitly excluded. Originals remain unchanged.`,
        )
      )
        return;
      setBusy("Copying and verifying included files…");
      setCopyInterruption("");
      setOutputLabel(output.name);
      const result = await copyApproved(
        source,
        output,
        outputEntries,
        setManifest,
        scanIssues,
      );
      setManifest(result.manifest);
      setOutDir(result.dir);
      const copied = result.manifest.results.filter(
        (r) => r.status === "copied",
      ).length;
      setNotice(
        `${copied} verified copies in ${output.name}/${result.manifest.session}. ${result.manifest.results.length - copied} failed. Review the operation results below.`,
      );
    } catch (e) {
      if (e instanceof CopyInterruptedError) {
        setManifest(e.manifest);
        setOutDir(e.dir);
        setCopyInterruption(e.message);
      }
      report(e);
    } finally {
      setBusy("");
    }
  }
  async function undo() {
    if (
      !outDir ||
      !manifest ||
      !window.confirm(
        "Remove only unchanged copies created by this session? Modified outputs will be retained.",
      )
    )
      return;
    setBusy("Verifying outputs for rollback…");
    try {
      setManifest(await rollback(outDir, manifest));
      setNotice(
        "Rollback checked each output hash. Changed files and original documents were preserved.",
      );
    } catch (e) {
      report(e);
    } finally {
      setBusy("");
    }
  }
  function downloadManifest() {
    if (!manifest) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(manifest, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "operation-manifest.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header>
        <a
          className="brand"
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
        >
          <span className="brandmark">
            <Layers size={23} />
          </span>
          <span>
            Arrange My Files <b>AI</b>
            <small>BY DETLENG</small>
          </span>
        </a>
        <button
          className="mobile-menu"
          aria-label="Toggle navigation"
          onClick={() => setMobile(!mobile)}
        >
          <Menu />
        </button>
        <nav className={mobile ? "open" : ""}>
          {nav.map(([id, label]) => (
            <button key={id} aria-current={page === id ? "page" : undefined} className={page === id ? "active" : ""} onClick={() => go(id)}>{id === "demo" ? "How it works" : id === "family" ? "About" : label}</button>
          ))}
          <button onClick={() => { go("help"); setTimeout(() => document.getElementById("privacy")?.scrollIntoView(), 0); }}>Privacy</button>
          <a className="button desk-link" href="https://automation.detleng.com/#desk" target="_blank" rel="noopener noreferrer">Discuss at Automation Desk ↗</a>
          <button className="button guide-launcher header-guide-launcher" aria-expanded={guide} onClick={() => { setGuide(!guide); setMobile(false); }}><span aria-hidden="true">🤖</span> DeTLeng AI Guide</button>
          <button className="login-trigger" onClick={() => setLoginOpen(true)}>Login</button>
        </nav>
        <button className="header-action" onClick={() => go("organize")}>
          Open workspace <ArrowUpRight size={15} />
        </button>
      </header>
      <main id="main-content">
        {page === "home" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span className="dot" /> LESS FILE CHAOS. MORE HEADSPACE.
                </div>
                <h1>
                  A little order.
                  <br />A lot more <em>clarity.</em>
                </h1>
                <p className="lead">
                  Your documents have a story.
                  <br />
                  Give them a name—and a place—that makes sense.
                </p>
                <p className="muted hero-description">
                  Understand, review, and organize your files with local
                  document readers and folder rules. Fast plans. Every decision
                  yours.
                </p>
                <div className="actions">
                  <Button onClick={() => go("organize")}>
                    Let's organize <ArrowRight size={17} />
                  </Button>
                  <Button secondary onClick={() => go("demo")}>
                    <Play size={15} /> Explore the demo
                  </Button>
                </div>
                <div className="trust-line">
                  <ShieldCheck size={16} /> Private document analysis{" "}
                  <span>·</span> Originals preserved
                </div>
              </div>
              <div className="hero-visual">
                <div className="visual-label">
                  <span className="dot" /> A CLEARER PLACE FOR EVERYTHING{" "}
                  <span>01 / 03</span>
                </div>
                <div className="paper-stack">
                  <div className="paper back" />
                  <div className="paper mid" />
                  <div className="paper front">
                    <div className="paper-icon">
                      <FileText size={27} />
                    </div>
                    <div>
                      <small>FROM A LITTLE MYSTERY</small>
                      <div className="old-name">final_final_v3.pdf</div>
                    </div>
                    <div className="paper-divider">
                      <Sparkles size={16} />
                      <span>A thoughtful suggestion</span>
                    </div>
                    <strong>Project Planning Notes.pdf</strong>
                    <div className="folder-label">
                      <FolderOpen size={15} /> Study & Learning / Project
                      Management
                    </div>
                    <div className="paper-bottom">
                      <span>
                        <Check size={14} /> Ready for your review
                      </span>
                      <span className="tiny-avatar">LOCAL</span>
                    </div>
                  </div>
                </div>
                <div className="floating-note">
                  <ShieldCheck size={22} />
                  <span>
                    Your files stay yours.
                    <small>You approve every change.</small>
                  </span>
                </div>
                <div className="visual-caption">
                  A fictional example. Your real files stay on your computer.
                </div>
              </div>
            </section>
            <section className="promise-band">
              <div>
                <LockKeyhole />
                <span>
                  <strong>Your files.</strong>
                  <small>Private, local document analysis.</small>
                </span>
              </div>
              <div>
                <Monitor />
                <span>
                  <strong>Your computer.</strong>
                  <small>Local rules. No model downloads.</small>
                </span>
              </div>
              <div>
                <Heart />
                <span>
                  <strong>Your control.</strong>
                  <small>Helpful suggestions. Human control.</small>
                </span>
              </div>
            </section>
            <section className="section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">FROM MESSY TO MEANINGFUL</div>
                  <h2>Find your flow, across your folders.</h2>
                </div>
                <p>
                  Open a folder. Understand the possibilities.
                  <br />
                  Make a plan you feel good about.
                </p>
              </div>
              <div className="three-grid">
                {[
                  {
                    n: "01",
                    title: "Choose your corner",
                    body: "Drop multiple files or folders, or add folders one at a time. We only read what you choose.",
                    icon: FolderOpen,
                  },
                  {
                    n: "02",
                    title: "Let clarity take shape",
                    body: "Document titles and clear folder rules create a local plan for your review.",
                    icon: Sparkles,
                  },
                  {
                    n: "03",
                    title: "Review. Then arrange.",
                    body: "Review category plans, keep uncertain files in Needs Review, and copy the included batch into a separate output folder.",
                    icon: CheckCircle2,
                  },
                ].map(({ n, title, body, icon: Icon }) => (
                  <article className="step-card" key={n}>
                    <div>
                      <Icon />
                      <span>{n}</span>
                    </div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </article>
                ))}
              </div>
            </section>
            <section className="family-teaser">
              <div>
                <div className="eyebrow">GOOD TECHNOLOGY. CLEAR ROLES.</div>
                <h2>
                  Meet the minds
                  <br />
                  behind the thoughtful details.
                </h2>
                <p>A warm introduction to the team that makes it all work.</p>
                <Button secondary onClick={() => go("family")}>
                  Meet the AI Family <ArrowRight size={16} />
                </Button>
              </div>
              <div className="family-orbit">
                {family.slice(0, 5).map(({ name, icon: Icon, accent }) => (
                  <div key={name} className={"family-pill " + accent}>
                    <Icon size={21} />
                    {name}
                  </div>
                ))}
              </div>
            </section>
            <div className="cloud-note">
              <Info size={17} />
              <p>
                Document analysis stays on your computer. The optional AI Guide
                uses GroqCloud to process your messages.{" "}
                <button onClick={() => go("help")}>
                  Understand the difference <ArrowRight size={12} />
                </button>
              </p>
            </div>
          </>
        )}
        {page === "organize" && (
          <section className="workspace">
            <div className="workspace-title">
              <div>
                <div className="eyebrow">YOUR PRIVATE FILE WORKSPACE</div>
                <h1>Make room for clarity.</h1>
                <p>
                  Your folders. A complete output plan. Every file accounted
                  for.
                </p>
              </div>

            </div>
            <div className="workspace-layout">
              <aside className="workflow-rail">
                <div className="rail-label">YOUR WORKFLOW</div>
                {[
                  "Choose documents",
                  "Set folder rules",
                  "Build organization plan",
                  "Review your plan",
                  "Copy included files",
                ].map((s, i) => (
                  <div
                    key={s}
                    className={
                      "rail-step " +
                      (workflowComplete(
                        i,
                        entries.length > 0,
                        outputEntries,
                        manifest?.results || [],
                        scanIssues.length > 0,
                      )
                        ? "done"
                        : "")
                    }
                  >
                    <span>{i + 1}</span>
                    {s}
                  </div>
                ))}
                <div className="privacy-card">
                  <ShieldCheck size={23} />
                  <strong>A safe place to start.</strong>
                  <p>No automatic changes. Originals stay where they are.</p>
                  <button onClick={() => go("help")}>
                    Read the Quick Guide <ArrowUpRight size={13} />
                  </button>
                </div>
              </aside>
              <div className="workspace-content">
                <section
                  className="setup-card"
                  aria-label="Local organizer engine"
                >
                  <div>
                    <span className="label">PRIVATE LOCAL ORGANIZER</span>
                    <h3>Ready. No AI setup required.</h3>
                    <p>
                      Keep useful filenames. Recover titles from document
                      headings. Sort with consistent keyword rules.
                    </p>
                  </div>
                  <p>
                    Files stay on your computer. No Ollama, model downloads or
                    cloud requests are used to build your organization plan. The
                    AI Guide is separate help only.
                  </p>
                  <details className="folder-rules">
                    <summary>
                      Folder rules · customize categories and keywords
                    </summary>
                    <label>
                      One rule per line: Folder: keyword, keyword
                      <textarea
                        aria-label="Folder rules"
                        rows={6}
                        value={ruleText}
                        disabled={!!busy || !!manifest}
                        onChange={(event) => setRuleText(event.target.value)}
                      />
                    </label>
                    <div className="actions">
                      <button
                        className="text-button"
                        disabled={!!busy || !!manifest}
                        onClick={() => {
                          try {
                            parseRules(ruleText);
                            localStorage.setItem(
                              "arrangemyfiles-folder-rules",
                              ruleText,
                            );
                            setNotice(
                              "Folder rules saved on this browser only. No document data was saved.",
                            );
                          } catch (error) {
                            report(error);
                          }
                        }}
                      >
                        Save rules on this browser
                      </button>
                      <button
                        className="text-button"
                        disabled={!!busy || !!manifest}
                        onClick={() => {
                          setRuleText(DEFAULT_RULES);
                          try {
                            localStorage.removeItem(
                              "arrangemyfiles-folder-rules",
                            );
                          } catch {}
                          setNotice(
                            "Default rules restored. Rebuild the plan to apply them.",
                          );
                        }}
                      >
                        Restore default rules
                      </button>
                    </div>
                    <p>
                      Literal keywords only. Most matched keywords wins; ties
                      use the first rule. Unmatched documents use a file-type
                      folder. Edited rules apply to new/retried files; choose
                      “Rebuild all with current rules” to update existing
                      proposals.
                    </p>
                  </details>
                  <p>
                    Supported: DOCX, text PDFs, XLSX, PPTX, TXT, MD, CSV. Images
                    and scanned PDFs have no content recognition in this
                    release.
                  </p>
                </section>
                {!supportedBrowser && (
                  <div className="notice">
                    Folder operations require a supported desktop browser in a
                    secure context. Use current Chrome or Edge on Windows. You
                    can still explore the demo.
                  </div>
                )}
                <div
                  className={
                    "folder-picker drop-zone" +
                    (dragActive ? " drag-active" : "")
                  }
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (!busy && !manifest) {
                      event.dataTransfer.dropEffect = "copy";
                      setDragActive(true);
                    }
                  }}
                  onDragLeave={(event) => {
                    if (
                      !event.currentTarget.contains(event.relatedTarget as Node)
                    )
                      setDragActive(false);
                  }}
                  onDrop={dropDocuments}
                  aria-label="Drop files or folders here"
                >
                  <div className="folder-icon">
                    <FolderOpen size={31} />
                  </div>
                  <h3>Drop multiple files or folders here</h3>
                  <p>
                    Add more at any time before copying. Existing files and
                    edits stay in your batch.
                  </p>
                  <div className="actions">
                    <Button
                      secondary
                      disabled={!!busy || !!manifest || !supportedBrowser}
                      onClick={() => void choose()}
                    >
                      Add folder
                    </Button>
                    <label className="button secondary file-input-label">
                      Add files
                      <input
                        id="document-files"
                        type="file"
                        multiple
                        aria-label="Add files"
                        disabled={!!busy || !!manifest}
                        onChange={(event) => {
                          const files = Array.from(event.target.files || []);
                          event.target.value = "";
                          setBusy("Adding selected files…");
                          void addSelection({
                            entries: files.map((file) => fileEntry(file)),
                            limited: false,
                          })
                            .catch(report)
                            .finally(() => setBusy(""));
                        }}
                      />
                    </label>
                    <button disabled={!!busy} onClick={clearBatch}>
                      {manifest ? "Start new batch" : "Clear / replace batch"}
                    </button>
                    {!entries.length && (
                      <button disabled={!!busy} onClick={loadSamples}>
                        Try synthetic examples
                      </button>
                    )}
                  </div>
                  <p>
                    <strong>{entries.length} files in this batch.</strong> Drop
                    several folders together, or use Add folder repeatedly. The
                    browser's folder picker selects one folder at a time.
                  </p>
                  <p className="input-limits">
                    Batch limit: 1,000 files · 12 nested folder levels ·
                    Analysis limit: 20 MB per file. Larger/unsupported readable
                    files go unchanged to Needs Review.
                  </p>
                  <small>
                    Quick naming reads the first 2 PDF pages or opening document
                    content. Originals stay untouched. No model or cloud upload
                    is used for organization.
                  </small>
                </div>
                {scanIssues.length > 0 && (
                  <section className="warning" role="alert">
                    <h3>
                      Input scan incomplete — some content was not inventoried
                    </h3>
                    <p>
                      {scanIssues.length} scan limitations or inaccessible
                      locations. The output cannot represent the full input. No
                      unknown files will be claimed as copied.
                    </p>
                    <details>
                      <summary>View unscanned locations</summary>
                      <ul>
                        {scanIssues.map((issue, i) => (
                          <li key={i}>
                            {issue.path}: {issue.reason}
                          </li>
                        ))}
                      </ul>
                    </details>
                    <label>
                      <input
                        type="checkbox"
                        checked={scanAcknowledged}
                        disabled={!!busy || !!manifest}
                        onChange={(e) => setScanAcknowledged(e.target.checked)}
                      />{" "}
                      I understand: copy only the inventoried files; some input
                      remains unscanned.
                    </label>
                  </section>
                )}
                {notice && (
                  <div role="status" className="notice">
                    {notice}
                  </div>
                )}
                {run && (
                  <ProcessingPanel
                    run={run}
                    cancel={() => abort.current?.abort()}
                  />
                )}
                {busy && !run?.active && (
                  <div role="status" className="progress">
                    <LoaderCircle className="spin" size={17} />
                    {busy}
                    {abort.current && (
                      <button onClick={() => abort.current?.abort()}>
                        Cancel analysis
                      </button>
                    )}
                  </div>
                )}
                {entries.length > 0 && (
                  <BatchReview
                    entries={outputEntries}
                    manifest={manifest}
                    busy={!!busy}
                    canCopy={
                      supportedBrowser && (!!source || allowSnapshotCopy)
                    }
                    scanBlocked={scanIssues.length > 0 && !scanAcknowledged}
                    samples={!allowSnapshotCopy && !source}
                    change={setEntries}
                    build={(rebuild) => void analyze(rebuild)}
                    copy={() => void organize()}
                  />
                )}
                {manifest && (
                  <section className="results">
                    <h3>
                      {busy ? "Copying and verifying…" : "Operation results"}
                    </h3>
                    <p>
                      Output location:{" "}
                      <code>
                        {outputLabel}/{manifest.session}
                      </code>
                    </p>
                    <p>
                      {
                        manifest.results.filter((r) => r.status === "copied")
                          .length
                      }{" "}
                      verified copies ·{" "}
                      {
                        manifest.results.filter((r) => r.status === "failed")
                          .length
                      }{" "}
                      failures
                    </p>
                    <CopyAudit
                      key={manifest.session}
                      manifest={manifest}
                      dir={outDir}
                      disabled={!!busy}
                      interruption={copyInterruption}
                    />
                    <div className="actions">
                      <Button secondary onClick={downloadManifest}>
                        <Download size={16} /> Download manifest
                      </Button>
                      <Button
                        secondary
                        disabled={!outDir || !!busy}
                        onClick={undo}
                      >
                        <Undo2 size={16} /> Roll back unchanged copies
                      </Button>
                    </div>
                    <p className="muted">
                      Manifest also saved in the output session. Rollback is
                      available in this session; after reload, use the manifest
                      for manual recovery.
                    </p>
                  </section>
                )}
                {!busy && <SavedCopyReport />}
              </div>
            </div>
          </section>
        )}
        {page === "family" && (
          <section className="family-page section">
            <div className="eyebrow">A THOUGHTFULLY ASSEMBLED TEAM</div>
            <h1>
              Meet the AI Family<span className="serif-dot">.</span>
            </h1>
            <p className="lead">
              Different strengths. One thoughtful experience.
            </p>
            {familyIndex < 0 ? (
              <>
                <div className="family-welcome">
                  <div className="host-emblem">
                    <Sparkles size={35} />
                  </div>
                  <h2>Come in. We'd love to introduce you.</h2>
                  <p>
                    Welcome to Arrange My Files AI by DeTLeng. Behind every
                    smart suggestion is a team with a clear role. Let's meet the
                    technology—and understand what each member does for you.
                  </p>
                  <Button onClick={() => setFamilyIndex(0)}>
                    Take the guided tour <ArrowRight size={17} />
                  </Button>
                  <button
                    className="text-button"
                    onClick={() => go("organize")}
                  >
                    Skip tour · try the organizer
                  </button>
                </div>
                <div className="family-grid">
                  {family.map(({ name, role, icon: Icon, accent }, i) => (
                    <button
                      key={name}
                      className={"family-card " + accent}
                      onClick={() => setFamilyIndex(i)}
                    >
                      <Icon size={27} />
                      <h3>{name}</h3>
                      <p>{role}</p>
                      <span>
                        Meet {name} <ArrowUpRight size={15} />
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {(() => {
                  const f = family[familyIndex];
                  const Icon = f.icon;
                  return (
                    <div className={"family-scene " + f.accent}>
                      <div className="scene-top">
                        <button onClick={() => setFamilyIndex(-1)}>
                          <ArrowLeft size={15} /> Back to the family
                        </button>
                        <span>
                          {String(familyIndex + 1).padStart(2, "0")} / 06
                        </span>
                      </div>
                      <div className="scene-body">
                        <div className="scene-symbol">
                          <Icon size={78} strokeWidth={1} />
                          <span>{f.role}</span>
                        </div>
                        <div>
                          <div className="eyebrow">{f.intro}</div>
                          <h2>{f.name}</h2>
                          <p className="scene-description">{f.description}</p>
                          <dl>
                            <dt>Where I work</dt>
                            <dd>{f.where}</dd>
                            <dt>What I can access</dt>
                            <dd>{f.access}</dd>
                          </dl>
                          <div className="family-status">
                            <Info size={15} />
                            {f.status}
                          </div>
                          <a
                            className="official-link"
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Explore official resources{" "}
                            <ArrowUpRight size={14} />
                          </a>
                        </div>
                      </div>
                      <div className="scene-controls">
                        <Button
                          secondary
                          disabled={familyIndex === 0}
                          onClick={() => setFamilyIndex(familyIndex - 1)}
                        >
                          <ChevronLeft size={16} /> Previous
                        </Button>
                        <div className="tour-dots">
                          {family.map((f, i) => (
                            <button
                              key={f.name}
                              aria-label={"Meet " + f.name}
                              aria-current={
                                i === familyIndex ? "step" : undefined
                              }
                              className={i === familyIndex ? "selected" : ""}
                              onClick={() => setFamilyIndex(i)}
                            />
                          ))}
                        </div>
                        {familyIndex < 5 ? (
                          <Button
                            onClick={() => setFamilyIndex(familyIndex + 1)}
                          >
                            Meet {family[familyIndex + 1].name}{" "}
                            <ChevronRight size={16} />
                          </Button>
                        ) : (
                          <Button onClick={() => go("organize")}>
                            Try the organizer <ArrowRight size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
            <p className="family-footnote">
              An authored, interactive introduction. No AI connection or
              personal information required. Integration descriptions are
              separate from readiness on your device.
            </p>
          </section>
        )}
        {page === "demo" && <InteractiveManual openWorkspace={() => go("organize")} />}
        {page === "help" && <QuickManual openWorkspace={() => go("organize")} />}
        {import.meta.env.DEV && page === "help" && (
          <>
            <BrowserChecks />
            <Suspense fallback={<p>Loading development benchmark…</p>}>
              <OrganizerBenchmark />
            </Suspense>
          </>
        )}
      </main>
      <EcosystemFooter navigate={(page) => { if (page === "privacy") { go("help"); setTimeout(() => document.getElementById("privacy")?.scrollIntoView(), 0); } else go(page); }} openLogin={() => setLoginOpen(true)} />

      {loginOpen && <LaunchLogin close={() => setLoginOpen(false)} />}
      {guide && (
        <Guide
          stage={page === "demo" ? "demo" : stage}
          error={errorCode}
          close={() => setGuide(false)}
          navigate={(action) => {
            if (action === "open-setup") go("help");
            if (action === "open-demo") go("demo");
            if (action === "open-review") go("organize");
          }}
        />
      )}
    </>
  );
}
function Command({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="command">
      <Terminal size={15} />
      <code>{text}</code>
      <button
        aria-label={"Copy " + text}
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        }}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}
function Guide({
  stage,
  error,
  close,
  navigate,
}: {
  stage: string;
  error: string;
  close: () => void;
  navigate: (action: string) => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current
      ?.querySelector<HTMLButtonElement>('button[aria-label="Close Guide"]')
      ?.focus();
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      previous?.focus();
    };
  }, []);
  const [message, setMessage] = useState("");
  const [context, setContext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState<
    { role: string; text: string; action?: string }[]
  >([]);
  const [connectionStatus, setConnectionStatus] = useState("Connecting to the Guide…");
  useEffect(() => {
    const content = conversationRef.current;
    if (content && chat.length > 0) {
      content.scrollTop = content.scrollHeight;
    }
  }, [chat, busy, connectionStatus]);
  async function send(text = message) {
    if (!text.trim() || busy) return;
    const history = chat
      .filter((m) => m.role === "you" || m.role === "guide")
      .slice(-4)
      .map((m) => ({
        role: m.role === "you" ? "user" : "assistant",
        content: m.text.slice(0, 3000),
      }));
    setChat((old) => [...old, { role: "you", text }]);
    setMessage("");
    setBusy(true);
    try {
      const endpoint = guideEndpoint(
        import.meta.env.VITE_GUIDE_API_URL,
        import.meta.env.DEV,
      );
      if (!endpoint)
        throw new Error("Guide backend is not configured for this build.");
      setConnectionStatus("Connecting to the Guide… First connection may take about a minute.");
      const health = await fetch(endpoint + "/health", {
        signal: AbortSignal.timeout(75000),
      });
      if (!health.ok) throw new Error("Guide connection failed.");
      setConnectionStatus("Thinking…");
      const res = await fetch(endpoint + "/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(35000),
        body: JSON.stringify({
          message: text,
          history,
          ...(context ? { context: { stage, error } } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) answerSchema.parse(data);
      setChat((old) => [
        ...old,
        {
          role: res.ok ? "guide" : "notice",
          text: res.ok ? data.reply : data.error,
          action: res.ok ? data.action : undefined,
        },
      ]);
    } catch {
      setChat((old) => [
        ...old,
        {
          role: "notice",
          text: "The Guide could not connect in time. Please try sending your question again—the service may have been waking up. Your local organizer still works. If this continues, open the Quick Guide for troubleshooting.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside ref={panelRef} className="guide-panel" aria-label="DeTLeng AI Guide">
      <div className="guide-header">
        <div>
          <span className="guide-avatar">
            <span aria-hidden="true">🤖</span>
          </span>
          <span>
            <strong>DeTLeng AI Guide</strong>
            <small>Your workflow companion</small>
          </span>
        </div>
        <button aria-label="Close Guide" onClick={close}>
          <X size={20} />
        </button>
      </div>
      <div className="guide-content" ref={conversationRef}>
        <div className="guide-disclosure">
          <Cloud size={16} />
          <p>
            Online help powered by GroqCloud. Messages and recent chat history
            leave your computer. Private files are never attached automatically.
          </p>
        </div>
        <div className="local-stage-help">
          <strong>Your next step · {stage}</strong>
          <p>
            {
              (
                {
                  setup:
                    "Choose documents and build an organization plan; no model installation is required.",
                  choose: "Review the inventory, then start local analysis.",
                  analysis:
                    "Wait for local suggestions. You can stop the active analysis.",
                  review:
                    "All files are included by default. Review categories and Needs Review, explicitly exclude only unwanted files, then copy the included batch to a separate output folder.",
                  results:
                    "Inspect verified copies and the saved manifest. Originals remain untouched.",
                  demo: "Explore the synthetic examples. No personal files are involved.",
                } as Record<string, string>
              )[stage]
            }
          </p>
          <button onClick={() => navigate("open-setup")}>
            Open Quick Guide <ArrowRight size={12} />
          </button>
        </div>
        <h3>A little guidance, right when you need it.</h3>
        <p>Ask about setup, review warnings, or a general folder strategy.</p>
        <div className="guide-prompts">
          {[
            "How do folder rules work?",
            "Suggest a folder strategy",
            "What should I do next?",
            "Explain review issues",
          ].map((t) => (
            <button key={t} disabled={busy} onClick={() => send(t)}>
              {t}
              <ArrowUpRight size={13} />
            </button>
          ))}
        </div>
        <label className="context-control">
          <input
            type="checkbox"
            checked={context}
            onChange={(e) => setContext(e.target.checked)}
          />{" "}
          Share stage/error codes only
        </label>
        {context && (
          <small>
            Will send: stage={stage}; error={error}. No filenames, paths, or
            inventory.
          </small>
        )}
        <div className="chat-messages" aria-live="polite">
          {chat.map((m, i) => (
            <div className={"chat-message " + m.role} key={i}>
              <small>
                {m.role === "you"
                  ? "YOU"
                  : m.role === "notice"
                    ? "CONNECTION NOTICE"
                    : "DETLENG AI GUIDE"}
              </small>
              <GuideReply text={m.text} />
              {m.action && m.action !== "none" && (
                <button onClick={() => navigate(m.action!)}>
                  Open suggested screen <ArrowRight size={13} />
                </button>
              )}
            </div>
          ))}
          {busy && (
            <div className="progress">
              <LoaderCircle className="spin" size={15} /> {connectionStatus}
            </div>
          )}
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="guide-message">
          Your message · keep private information out
        </label>
        <div>
          <textarea
            id="guide-message"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            maxLength={2500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What would make the next step easier?"
          />
          <button
            className="button"
            disabled={busy || !message.trim()}
            aria-label="Send to online Guide"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </aside>
  );
}
export default App;



