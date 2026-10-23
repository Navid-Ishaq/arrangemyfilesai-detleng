import { DEFAULT_RULES, parseRules } from "./naming";
import { captureDrop } from "./drop-files";
import { AnalysisCache, analysisQueue, analyzeFile } from "./analysis-engine";
import { ProcessingPanel, type RunProgress } from "./ProcessingPanel";
import { analysisWarning } from "./analysis-errors";
import { isImage, workflowComplete } from "./domain";
import { GuideReply } from "./GuideReply";
import { CopyAudit } from "./CopyAudit";
import { SavedCopyReport } from "./SavedCopyReport";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
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
} from "./domain";
import {
  inventory,
  copyApproved,
  rollback,
  Manifest,
  CopyInterruptedError,
} from "./files";
import { sampleDocuments, demoRows } from "./samples";
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
  const [filter, setFilter] = useState("all");
  const [manifest, setManifest] = useState<Manifest>();
  const [outDir, setOutDir] = useState<FileSystemDirectoryHandle>();
  const [outputLabel, setOutputLabel] = useState("");
  const [copyInterruption, setCopyInterruption] = useState("");
  const [guide, setGuide] = useState(false);
  const [familyIndex, setFamilyIndex] = useState(-1);
  const [demoStep, setDemoStep] = useState(0);
  const [demoAccepted, setDemoAccepted] = useState([true, true, false, true]);
  const [showTree, setShowTree] = useState(false);
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
  const errors = validatePlan(entries);
  const approved = entries.filter((e) => e.approved);
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
  function dropDocuments(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (busy || manifest) return;
    try {
      const read = captureDrop(event.dataTransfer);
      setBusy("Reading dropped documents…");
      void read()
        .then((result) => {
          analysisCache.current.clear();
          setRun(undefined);
          setEntries(result.entries);
          setSource(result.source);
          setAllowSnapshotCopy(!result.source);
          setManifest(undefined);
          setOutDir(undefined);
          setNotice(
            `${result.entries.length} dropped files ready. Nothing analyzed or copied yet.${result.limited ? " Inventory limit reached; choose a smaller selection." : ""}`,
          );
        })
        .catch(report)
        .finally(() => setBusy(""));
    } catch (error) {
      report(error);
    }
  }
  async function choose() {
    setAllowSnapshotCopy(false);
    setNotice("");
    try {
      const root = await window.showDirectoryPicker({ mode: "read" });
      setBusy("Reading folder inventory…");
      const result = await inventory(root);
      setSource(root);
      analysisCache.current.clear();
      setRun(undefined);
      setEntries(result.entries);
      setManifest(undefined);
      setOutDir(undefined);
      setNotice(
        `${result.entries.length} files inventoried. Nothing changed.${result.limited ? " Inventory limit reached (1,000 files / 12 levels). Choose a smaller folder." : ""}`,
      );
    } catch (e) {
      if ((e as DOMException).name !== "AbortError") report(e);
    } finally {
      setBusy("");
    }
  }
  function loadSamples() {
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
        approved: false,
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
        "Rebuild all proposals with current rules? Existing edits and approvals will be cleared.",
      )
    )
      return;
    const queue = rebuild ? entries : analysisQueue(entries);
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
          approved: false,
          suggestion: undefined,
          title: "",
          category: "",
          subcategory: "",
          warning: undefined,
        } as Entry;
        if (!supported.has(extension(current.name))) {
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
          : "Plan finished. Review the evidence, names and categories, then select the files you approve.",
      );
    } finally {
      setBusy("");
      abort.current = null;
      setRun((old) => old && { ...old, active: false });
    }
  }
  function edit(
    id: string,
    key: "title" | "category" | "subcategory" | "approved",
    value: string | boolean,
  ) {
    setEntries((old) =>
      old.map((e) =>
        e.id === id
          ? {
              ...e,
              [key]: value,
              ...(key !== "approved" ? { approved: false } : {}),
            }
          : e,
      ),
    );
  }
  async function organize() {
    if (!source && !allowSnapshotCopy) return;
    try {
      const output = await window.showDirectoryPicker({ mode: "readwrite" });
      if (
        !window.confirm(
          `Copy ${approved.length} approved files into a new output session? Original files will remain unchanged.`,
        )
      )
        return;
      setBusy("Copying and verifying approved files…");
      setCopyInterruption("");
      setOutputLabel(output.name);
      const result = await copyApproved(source, output, entries, setManifest);
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
      <div className="ecosystem">
        <span>
          A thoughtful tool from <strong>DeTLeng</strong>
        </span>
        <div>
          {links.map(([name, url]) => (
            <a href={url} target="_blank" rel="noreferrer" key={name}>
              {name}
              <ArrowUpRight size={11} />
            </a>
          ))}
        </div>
      </div>
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
            <button
              key={id}
              aria-current={page === id ? "page" : undefined}
              className={page === id ? "active" : ""}
              onClick={() => go(id)}
            >
              {label}
            </button>
          ))}
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
                  <h2>Find your flow, one folder at a time.</h2>
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
                    body: "Select one folder you want to make sense of. We only read what you authorize.",
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
                    body: "Edit the plan, approve your choices, and copy into a separate output folder.",
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
                <p>One folder. A thoughtful plan. Every decision yours.</p>
              </div>
              <button
                className="button guide-launcher"
                aria-expanded={guide}
                onClick={() => setGuide(!guide)}
              >
                <span className="guide-emoji" aria-hidden="true">
                  🤖
                </span>{" "}
                DeTLeng AI Guide
              </button>
            </div>
            <div className="workspace-layout">
              <aside className="workflow-rail">
                <div className="rail-label">YOUR WORKFLOW</div>
                {[
                  "Choose documents",
                  "Set folder rules",
                  "Build organization plan",
                  "Review your plan",
                  "Copy approved files",
                ].map((s, i) => (
                  <div
                    key={s}
                    className={
                      "rail-step " +
                      (workflowComplete(
                        i,
                        entries.length > 0,
                        entries,
                        manifest?.results,
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
                  <p className="quick-naming-note">
                    Quick naming uses the first 2 PDF pages or opening content
                    in other documents—not the full document.
                  </p>
                  <div className="folder-icon">
                    <FolderOpen size={31} />
                  </div>
                  <h3>
                    {source ? source.name : "Drop files or a folder here."}
                  </h3>
                  <p>
                    {entries.length
                      ? `${entries.length} files in this inventory. Originals untouched.`
                      : "Drag documents here, or browse below. Analysis starts only when you choose Build organization plan."}
                  </p>
                  <div className="actions">
                    <label className="selection-menu">
                      <span>Choose how to add documents</span>
                      <select
                        aria-label="Add documents"
                        defaultValue=""
                        disabled={!!busy}
                        onChange={(event) => {
                          const value = event.target.value;
                          event.target.value = "";
                          if (value === "folder") void choose();
                          if (value === "files")
                            document.getElementById("document-files")?.click();
                          if (value === "samples") loadSamples();
                        }}
                      >
                        <option value="" disabled>
                          Add documents…
                        </option>
                        <option value="folder" disabled={!supportedBrowser}>
                          Choose a folder
                        </option>
                        <option value="files">Choose individual files</option>
                        <option value="samples">Try synthetic examples</option>
                      </select>
                    </label>
                    <label className="file-input-label">
                      Choose individual files
                      <input
                        id="document-files"
                        type="file"
                        multiple
                        aria-label="Choose individual files"
                        disabled={!!busy}
                        onChange={(event) => {
                          analysisCache.current.clear();
                          setRun(undefined);
                          const files = Array.from(
                            event.target.files || [],
                          ).slice(0, 1000);

                          setEntries(
                            files.map((file) => ({
                              id: crypto.randomUUID(),
                              path: file.name,
                              name: file.name,
                              size: file.size,
                              file,
                              status: "inventoried",
                              approved: false,
                              title: "",
                              category: "",
                              subcategory: "",
                            })),
                          );
                          setAllowSnapshotCopy(true);
                          setSource(undefined);
                          setManifest(undefined);
                          setOutDir(undefined);
                          setNotice(
                            "Files selected for local analysis. Review and approve suggestions before choosing an output folder.",
                          );
                        }}
                      />
                    </label>
                  </div>
                  <small>
                    Files stay on your computer. Review suggestions before
                    approving copies.
                  </small>
                </div>
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
                  <>
                    <div className="inventory-toolbar">
                      <div>
                        <h3>
                          Your review plan{" "}
                          <span className="count">{entries.length}</span>
                        </h3>
                        <p>
                          {suggested.length} suggestions · {approved.length}{" "}
                          approved
                        </p>
                      </div>
                      <div className="actions">
                        <Button
                          secondary
                          disabled={!!busy || !!manifest}
                          onClick={() => analyze()}
                        >
                          <Sparkles size={16} /> Build organization plan
                        </Button>
                        <button
                          className="icon-button"
                          aria-label="Toggle folder tree"
                          onClick={() => setShowTree(!showTree)}
                        >
                          <FolderTree size={20} />
                        </button>
                      </div>
                    </div>
                    <button
                      className="text-button"
                      disabled={!!busy || !!manifest}
                      onClick={() => analyze(true)}
                    >
                      Rebuild all with current rules
                    </button>
                    <div className="filters">
                      <select
                        aria-label="Filter files"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">All files</option>
                        <option value="suggested">Suggestions</option>
                        <option value="attention">Needs attention</option>
                        <option value="approved">Approved</option>
                        <option value="blocked">Copy blockers</option>
                      </select>
                      <button
                        disabled={!!busy || !!manifest}
                        onClick={() =>
                          setEntries((old) =>
                            old.map((e) => ({
                              ...e,
                              approved: e.status === "suggested" && !e.warning,
                            })),
                          )
                        }
                      >
                        Select suggestions without warnings
                      </button>
                      <button
                        disabled={!!busy || !!manifest}
                        onClick={() =>
                          setEntries((old) =>
                            old.map((e) => ({ ...e, approved: false })),
                          )
                        }
                      >
                        Clear selection
                      </button>
                    </div>
                    {showTree && (
                      <div className="tree">
                        <strong>Proposed output tree · selected files</strong>
                        {approved.map((e) => (
                          <div key={e.id}>
                            └{" "}
                            {(() => {
                              try {
                                return destination(e);
                              } catch {
                                return "Invalid destination";
                              }
                            })()}
                          </div>
                        ))}
                        {!approved.length && (
                          <p>
                            Select reviewed files to preview their destinations.
                          </p>
                        )}
                      </div>
                    )}
                    {errors.size > 0 && (
                      <div className="warning" role="alert">
                        <strong>
                          Copy blocked: {errors.size} approved files have
                          destination errors.
                        </strong>
                        <p>
                          Files from different folders may share the same output
                          name. Originals will never be overwritten.
                        </p>
                        <div className="actions">
                          <button
                            disabled={!!busy || !!manifest}
                            onClick={() => setFilter("blocked")}
                          >
                            Show copy blockers
                          </button>
                          <button
                            disabled={!!busy || !!manifest}
                            onClick={() => {
                              setEntries(uniqueApprovedNames(entries));
                              setNotice(
                                "Duplicate output names received unique numbered suffixes. Review the updated destinations before copying. Other invalid paths still need editing.",
                              );
                            }}
                          >
                            Make duplicate names unique
                          </button>
                          <button
                            disabled={!!busy || !!manifest}
                            onClick={() => {
                              setEntries(
                                entries.map((e) =>
                                  errors.has(e.id)
                                    ? { ...e, approved: false }
                                    : e,
                                ),
                              );
                            }}
                          >
                            Deselect blocked files
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="review-list">
                      {entries
                        .filter(
                          (e) =>
                            filter === "all" ||
                            (filter === "suggested" &&
                              e.status === "suggested") ||
                            (filter === "approved" && e.approved) ||
                            (filter === "blocked" && errors.has(e.id)) ||
                            (filter === "attention" &&
                              (e.warning || errors.has(e.id))),
                        )
                        .map((e) => (
                          <article className="review-row" key={e.id}>
                            <div className="review-source">
                              <input
                                type="checkbox"
                                aria-label={"Approve " + e.name}
                                checked={e.approved}
                                disabled={
                                  e.status !== "suggested" ||
                                  !!busy ||
                                  !!manifest
                                }
                                onChange={(event) =>
                                  edit(e.id, "approved", event.target.checked)
                                }
                              />
                              <FileText size={20} />
                              <div>
                                <strong>{e.name}</strong>
                                <small>
                                  {e.path} · {(e.size / 1024).toFixed(1)} KB
                                </small>
                              </div>
                              <span className="status-tag">{e.status}</span>
                            </div>
                            {e.status === "suggested" && (
                              <div className="review-edit">
                                <label>
                                  Suggested name{" "}
                                  <span>.{extension(e.name)}</span>
                                  <input
                                    value={e.title}
                                    disabled={!!busy || !!manifest}
                                    onChange={(event) =>
                                      edit(e.id, "title", event.target.value)
                                    }
                                  />
                                </label>
                                <label>
                                  Category
                                  <input
                                    value={e.category}
                                    disabled={!!busy || !!manifest}
                                    onChange={(event) =>
                                      edit(e.id, "category", event.target.value)
                                    }
                                  />
                                </label>
                                <label>
                                  Subfolder (optional)
                                  <input
                                    value={e.subcategory}
                                    disabled={!!busy || !!manifest}
                                    onChange={(event) =>
                                      edit(
                                        e.id,
                                        "subcategory",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>
                                <p>
                                  <Sparkles size={13} />
                                  {e.suggestion?.reason}
                                </p>
                                <p className="destination-preview">
                                  <FolderOpen size={13} />
                                  {(() => {
                                    try {
                                      return destination(e);
                                    } catch (error) {
                                      return (error as Error).message;
                                    }
                                  })()}
                                </p>
                              </div>
                            )}
                            {e.coverage && (
                              <p className="coverage-note">{e.coverage}</p>
                            )}
                            {(e.warning || errors.has(e.id)) && (
                              <div className="warning">
                                {errors.get(e.id) || e.warning}
                              </div>
                            )}
                          </article>
                        ))}
                    </div>
                    {suggested.length > 0 && approved.length === 0 && (
                      <div className="notice" role="status">
                        Analysis is complete, but no files are approved yet.
                        Tick each reviewed file to enable copying. “Select
                        suggestions without warnings” skips files with warnings;
                        review and approve those individually.
                      </div>
                    )}
                    <div className="copy-bar">
                      <span>
                        <ShieldCheck size={17} /> {approved.length} approved ·
                        originals preserved
                        {errors.size > 0 &&
                          ` · ${errors.size} blocked — resolve destination errors above`}
                      </span>
                      <Button
                        disabled={
                          (!source && !allowSnapshotCopy) ||
                          !supportedBrowser ||
                          !approved.length ||
                          errors.size > 0 ||
                          !!busy ||
                          !!manifest
                        }
                        onClick={organize}
                      >
                        <Copy size={16} /> Choose output & copy
                      </Button>
                    </div>
                  </>
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
        {page === "demo" && (
          <section className="section demo-page">
            <div className="eyebrow">A LITTLE PREVIEW OF THE POSSIBILITIES</div>
            <h1>Try a little clarity.</h1>
            <p className="lead">
              A fictional folder. Real choices. No setup required.
            </p>
            <div className="notice">
              <Info size={17} /> All files and suggestions here are synthetic
              examples. No file operations take place in this demo.
            </div>
            <div className="demo-progress">
              {[
                "The starting point",
                "Review the possibilities",
                "A clearer collection",
              ].map((s, i) => (
                <button
                  key={s}
                  className={demoStep === i ? "current" : ""}
                  onClick={() => setDemoStep(i)}
                >
                  <span>{i + 1}</span>
                  {s}
                </button>
              ))}
            </div>
            <div className="demo-board">
              <div className="section-heading">
                <div>
                  <h2>
                    {
                      [
                        "A familiar little mess.",
                        "You make the final call.",
                        "An example of your new collection.",
                      ][demoStep]
                    }
                  </h2>
                  <p>
                    {
                      [
                        "Some filenames tell you very little. Let’s imagine a more useful plan.",
                        "Toggle the files you would approve. A scanned PDF stays for review.",
                        "This is a simulated result. Your own files have not been touched.",
                      ][demoStep]
                    }
                  </p>
                </div>
                <FolderTree size={34} />
              </div>
              {demoRows.map((r, i) => (
                <div className="demo-file" key={r.old}>
                  <FileText />
                  <div>
                    <small>
                      {demoStep === 0
                        ? "ORIGINAL FILE"
                        : demoStep === 1
                          ? r.old
                          : r.folder}
                    </small>
                    <strong>{demoStep === 0 ? r.old : r.title}</strong>
                    {demoStep > 0 && <p>{r.reason}</p>}
                  </div>
                  {demoStep === 1 ? (
                    <label className="demo-select">
                      <input
                        aria-label={"Approve sample " + r.old}
                        type="checkbox"
                        checked={demoAccepted[i]}
                        disabled={i === 2}
                        onChange={(e) =>
                          setDemoAccepted((old) =>
                            old.map((v, n) => (n === i ? e.target.checked : v)),
                          )
                        }
                      />
                      {i === 2 ? "Needs OCR" : "Approve"}
                    </label>
                  ) : (
                    <span className="status-tag">
                      {demoStep === 0
                        ? "Unsorted"
                        : demoAccepted[i]
                          ? "Example copy"
                          : "Skipped"}
                    </span>
                  )}
                </div>
              ))}
              <div className="demo-bottom">
                <span>
                  {demoAccepted.filter(Boolean).length} sample files selected
                </span>
                <Button
                  onClick={() =>
                    demoStep < 2 ? setDemoStep(demoStep + 1) : go("organize")
                  }
                >
                  {
                    [
                      "See suggested names",
                      "Preview example result",
                      "Try your own folder",
                    ][demoStep]
                  }
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          </section>
        )}
        {page === "help" && (
          <section className="section help-page">
            <div className="eyebrow">A FRIENDLY PLACE TO START</div>
            <h1>
              A few steps.
              <br />A clearer workspace.
            </h1>
            <p className="lead">
              No account or AI installation needed for organization.
            </p>
            <div className="help-grid">
              <article>
                <span className="label">01 · ADD DOCUMENTS</span>
                <h2>Start with your files.</h2>
                <p>
                  Use current desktop Chrome or Edge. Drop a folder or files
                  into the workspace, or use Add documents. No Ollama, local
                  model, or cloud AI is required. Your originals stay untouched.
                </p>
                <Button onClick={() => go("organize")}>
                  Open organizer <ArrowRight size={16} />
                </Button>
              </article>
              <article>
                <span className="label">02 · BUILD A LOCAL PLAN</span>
                <h2>Evidence. Rules. Clear names.</h2>
                <p>
                  Keep descriptive filenames, recover useful titles from
                  metadata and headings, and apply literal keyword rules to
                  folders. Customize folder rules before building a plan.
                  Ambiguous or unreadable documents keep their original name
                  with a review warning.
                </p>
                <p>
                  PDFs use their first 2 pages; Word uses opening content,
                  slides the first 4 slides, and spreadsheets the first 2 sheets
                  / 12 rows. This is quick organization, not full-document
                  understanding.
                </p>
              </article>
              <article>
                <span className="label">03 · REVIEW BEFORE COPYING</span>
                <h2>Start small. Stay in control.</h2>
                <p>
                  Choose a small folder first. Analysis reads supported files
                  and proposes names. Edit suggestions, inspect warnings, and
                  explicitly select what you approve.
                </p>
                <p>
                  Choose an output folder separate from the source. Each run
                  creates a new session folder and a manifest. Existing files
                  are never intentionally overwritten; original documents remain
                  untouched.
                </p>
                <p>
                  Rollback verifies copied file hashes before removing unchanged
                  outputs. Keep the page open to use session rollback. After a
                  reload, the saved manifest supports manual recovery.
                </p>
              </article>
              <article>
                <span className="label">04 · UNDERSTAND THE BOUNDARIES</span>
                <h2>Private documents. Optional online help.</h2>
                <p>
                  TXT, Markdown, DOCX, text-based PDFs, CSV, XLSX and PPTX are
                  supported. Images and scanned PDFs without readable text are
                  not supported. Initial limits: 1,000 files, 20 MB per file, up
                  to 14,000 extracted characters, with a maximum 3,600-character
                  opening excerpt checked by local naming rules. PDFs use only
                  the first 2 pages. Large PDFs and workbooks are sampled.
                  Warnings identify partial content.
                </p>
                <p>
                  Scanned-PDF OCR, legacy DOC/XLS, and encrypted documents are
                  not supported. Rules and extracted titles can be imperfect;
                  review every suggestion.
                </p>
                <p>
                  The optional Guide sends your messages to GroqCloud. App
                  context is opt-in and restricted to stage/error codes. Do not
                  paste confidential information or secrets into the chat.
                </p>
              </article>
            </div>
          </section>
        )}
        {import.meta.env.DEV && page === "help" && (
          <>
            <BrowserChecks />
            <Suspense fallback={<p>Loading development benchmark…</p>}>
              <OrganizerBenchmark />
            </Suspense>
          </>
        )}
      </main>
      <footer>
        <div>
          <a
            className="brand"
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              go("home");
            }}
          >
            <span className="brandmark">
              <Layers size={21} />
            </span>
            <span>
              Arrange My Files <b>AI</b>
              <small>BY DETLENG</small>
            </span>
          </a>
          <p>Your Files. Your Computer. Your AI.</p>
        </div>
        <div>
          <span className="label">THE DETLENG ECOSYSTEM</span>
          {links.map(([n, u]) => (
            <a key={n} href={u} target="_blank" rel="noreferrer">
              {n} <ArrowUpRight size={12} />
            </a>
          ))}
        </div>
        <div>
          <span className="label">BUILT WITH CARE</span>
          <button onClick={() => go("help")}>Quick Guide & privacy</button>
          <button onClick={() => go("family")}>Meet the AI Family</button>
          <a
            href="https://github.com/Navid-Ishaq/arrangemyfilesai-detleng"
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub <ArrowUpRight size={12} />
          </a>
          <small>Local organization · optional cloud Guide</small>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} DeTLeng. Thoughtful tools for everyday
            work.
          </span>
          <span>
            Made for a little less chaos. <Heart size={12} />
          </span>
        </div>
      </footer>
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
          text: "The online Guide is unavailable. Your local organizer still works. Open the Quick Guide for setup and troubleshooting.",
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
      <div className="guide-content">
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
                    "Check names and categories. Select reviewed files, then choose a separate output folder for copying.",
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
              <LoaderCircle className="spin" size={15} /> Thinking…
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
