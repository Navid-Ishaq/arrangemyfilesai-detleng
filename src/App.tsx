import { suggestImage } from "./images";
import { isImage, workflowComplete } from "./domain";
import { VISION_MODEL } from "./ollama";
import { visionProbe } from "./vision-probe";
import { GuideReply } from "./GuideReply";
import { useEffect, useRef, useState } from "react";
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
} from "./domain";
import { inventory, copyApproved, rollback, Manifest } from "./files";
import { extract } from "./extract";
import {
  models,
  readiness,
  suggest,
  MODEL,
  LocalAIError,
  connectionMessage,
} from "./ollama";
import { LocalAIHelp } from "./LocalAIHelp";
import { sampleDocuments, demoRows } from "./samples";
import { BrowserChecks } from "./BrowserChecks";
import { guideEndpoint } from "./guide-client";
import { answerSchema } from "../server/contracts";
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
    name: "Ollama",
    role: "The local AI engine",
    intro: "Every thoughtful team needs a place to think.",
    description:
      "Ollama makes a home for AI models on your computer. It runs the model that helps understand your documents, without needing a cloud document service.",
    where: "Your computer",
    access: "Extracted text sent locally by the organizer.",
    status: "Visitor readiness checked in Organizer",
    icon: Monitor,
    url: "https://ollama.com/download/windows",
    accent: "mint",
  },
  {
    name: "Qwen3 4B",
    role: "The document intelligence",
    intro: "A little clarity for those mysterious filenames.",
    description:
      "Qwen reads the extracted text and proposes a meaningful title and category. It offers an interpretation for you to review; it never independently controls your files.",
    where: "Locally, through Ollama",
    access: "Bounded extracted text; no independent folder access.",
    status: "Requires installed model and inference check",
    icon: Sparkles,
    url: "https://ollama.com/library/qwen3:4b",
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
  const [ready, setReady] = useState(false);
  const [visionReady, setVisionReady] = useState(false);
  const [visionStatus, setVisionStatus] = useState("Not checked");
  const [hasConnected, setHasConnected] = useState(false);
  const [checks, setChecks] = useState([false, false, false]);
  const [errorCode, setErrorCode] = useState("NONE");
  const [filter, setFilter] = useState("all");
  const [manifest, setManifest] = useState<Manifest>();
  const [outDir, setOutDir] = useState<FileSystemDirectoryHandle>();
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
    if (e instanceof LocalAIError) {
      setErrorCode(
        e.code === "MODEL_MISSING"
          ? "MODEL_MISSING"
          : e.code === "INFERENCE_FAILED"
            ? "INFERENCE_FAILED"
            : "OLLAMA_UNREACHABLE",
      );
      setNotice(connectionMessage(e.code, window.location.origin));
      return;
    }
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
  async function checkAI() {
    setBusy("Checking local AI...");
    setChecks([false, false, false]);
    setReady(false);
    setVisionReady(false);
    setVisionStatus("Checking...");
    setNotice("");
    try {
      const list = await models();
      setChecks([true, list.some((m) => m.name === MODEL), false]);
      let textOK = false;
      if (list.some((m) => m.name === MODEL)) {
        try {
          await readiness();
          textOK = true;
          setReady(true);
          setChecks([true, true, true]);
        } catch (e) {
          report(e);
        }
      } else
        setNotice(
          "Text model missing. Run ollama pull qwen3:4b. Vision can still be checked.",
        );
      if (list.some((m) => m.name === VISION_MODEL)) {
        try {
          await visionProbe();
          setVisionReady(true);
          setVisionStatus("Ready - real vision inference verified");
          setHasConnected(true);
        } catch {
          setVisionStatus(
            "Installed, but inference failed. Check memory and retry; text analysis remains independent.",
          );
        }
      } else
        setVisionStatus(
          "Missing - run ollama pull qwen3-vl:4b. Text analysis remains available.",
        );
      if (textOK) {
        setHasConnected(true);
        setErrorCode("NONE");
        setNotice(
          "Local AI Ready - text inference verified. Vision status is shown separately.",
        );
      }
    } catch (e) {
      setVisionStatus("Connection unavailable");
      report(e);
    } finally {
      setBusy("");
    }
  }
  async function choose() {
    setNotice("");
    try {
      const root = await window.showDirectoryPicker({ mode: "read" });
      setBusy("Reading folder inventory…");
      const result = await inventory(root);
      setSource(root);
      setEntries(result.entries);
      setManifest(undefined);
      setOutDir(undefined);
      setNotice(
        `${result.entries.length} files inventoried. Nothing changed.${result.limited ? " Inventory limit reached (250 files / 12 levels). Choose a smaller folder." : ""}`,
      );
    } catch (e) {
      if ((e as DOMException).name !== "AbortError") report(e);
    } finally {
      setBusy("");
    }
  }
  function loadSamples() {
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
      "Synthetic files loaded in browser memory. Analyze them with real local Qwen. Copying these samples is disabled; use the generated fixture folder for copy tests.",
    );
  }
  async function analyze() {
    setBusy("Analyzing documents…");
    setNotice("");
    abort.current = new AbortController();
    try {
      for (const current of entries) {
        if (abort.current.signal.aborted) break;
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
          updated.warning = "Unsupported format; file preserved.";
          setErrorCode("UNSUPPORTED");
        } else
          try {
            const image = isImage(current.name);
            if (image && !visionReady)
              throw new Error(
                "VISION_MODEL_MISSING: Connect and verify qwen3-vl:4b before image analysis. Text documents remain available.",
              );
            if (!image && !ready)
              throw new Error(
                "MODEL_MISSING: Connect and verify qwen3:4b before text analysis.",
              );
            const content = image
              ? { text: "", warning: undefined }
              : await extract(current.file);
            if (abort.current.signal.aborted) break;
            setBusy(
              `Analyzing ${entries.indexOf(current) + 1} of ${entries.length} locally…`,
            );
            const result = image
              ? await suggestImage(current.file, abort.current.signal)
              : await suggest(content.text, abort.current.signal);
            updated = {
              ...updated,
              status: "suggested",
              suggestion: result,
              title: result.title,
              category: result.needsReview ? "Needs Review" : result.category,
              subcategory: result.needsReview ? "" : result.subcategory,
              warning:
                content.warning ||
                (result.needsReview
                  ? "AI flagged this interpretation for your review."
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
            updated.warning = (e as Error).message.includes("fetch")
              ? "Local AI connection failed. Check setup."
              : (e as Error).message.slice(0, 200);
          }
        setEntries((previous) =>
          previous.map((e) => (e.id === current.id ? updated : e)),
        );
      }
      setNotice(
        abort.current.signal.aborted
          ? "Analysis stopped. Completed suggestions are available."
          : "Analysis finished. Review the names and categories, then select the files you approve.",
      );
    } finally {
      setBusy("");
      abort.current = null;
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
    if (!source) return;
    try {
      const output = await window.showDirectoryPicker({ mode: "readwrite" });
      if (
        !window.confirm(
          `Copy ${approved.length} approved files into a new output session? Original files will remain unchanged.`,
        )
      )
        return;
      setBusy("Copying and verifying approved files…");
      const result = await copyApproved(source, output, entries, setManifest);
      setManifest(result.manifest);
      setOutDir(result.dir);
      setNotice("Copy run finished. Review the operation results below.");
    } catch (e) {
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
                  Understand, review, and organize your files with AI that runs
                  on your computer. Thoughtful suggestions. Every decision
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
                      <FolderOpen size={15} /> Learning / Project Management
                    </div>
                    <div className="paper-bottom">
                      <span>
                        <Check size={14} /> Ready for your review
                      </span>
                      <span className="tiny-avatar">AI</span>
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
                  <small>Powered by Ollama + Qwen3 4B.</small>
                </span>
              </div>
              <div>
                <Heart />
                <span>
                  <strong>Your AI.</strong>
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
                    body: "Local AI suggests descriptive names and useful categories from document text.",
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
                  "Connect & Verify Local AI",
                  "Choose a folder",
                  "Analyze documents",
                  "Review your plan",
                  "Copy approved files",
                ].map((s, i) => (
                  <div
                    key={s}
                    className={
                      "rail-step " +
                      (workflowComplete(
                        i,
                        ready || visionReady,
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
                <div className="setup-card">
                  <div>
                    <span className="label">LOCAL AI</span>
                    <h3>
                      {ready || visionReady
                        ? "Local AI Ready"
                        : "A quick check before we begin."}
                    </h3>
                    <p>Text: qwen3:4b | Vision: qwen3-vl:4b | your computer</p>
                  </div>
                  <Button secondary onClick={checkAI} disabled={!!busy}>
                    {busy.includes("Checking") ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Monitor size={16} />
                    )}{" "}
                    {hasConnected ? "Restart Connection" : "Connect Local AI"}
                  </Button>
                  <div className="checklist">
                    {[
                      "Service reachable",
                      "Text model installed",
                      "Text inference verified",
                    ].map((c, i) => (
                      <span key={c} className={checks[i] ? "checked" : ""}>
                        {checks[i] ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <span className="hollow" />
                        )}
                        {c}
                      </span>
                    ))}
                  </div>
                  <p className="vision-status" role="status">
                    <strong>Vision - qwen3-vl:4b:</strong> {visionStatus}
                  </p>
                  <p>
                    Restart Connection only rechecks the local API; it never
                    restarts Ollama.
                  </p>
                </div>
                {!ready && !visionReady && (
                  <LocalAIHelp
                    expanded={[
                      "OLLAMA_UNREACHABLE",
                      "MODEL_MISSING",
                      "INFERENCE_FAILED",
                    ].includes(errorCode)}
                  />
                )}
                {!supportedBrowser && (
                  <div className="notice">
                    Folder operations require a supported desktop browser in a
                    secure context. Use current Chrome or Edge on Windows. You
                    can still explore the demo.
                  </div>
                )}
                <div className="folder-picker">
                  <div className="folder-icon">
                    <FolderOpen size={31} />
                  </div>
                  <h3>{source ? source.name : "Start with one folder."}</h3>
                  <p>
                    {entries.length
                      ? `${entries.length} files in this inventory. Originals untouched.`
                      : "Choose a folder from your computer or an external drive."}
                  </p>
                  <div className="actions">
                    <Button
                      onClick={choose}
                      disabled={!supportedBrowser || !!busy}
                    >
                      Choose folder <ArrowRight size={16} />
                    </Button>
                    <button
                      className="text-button"
                      onClick={loadSamples}
                      disabled={!!busy}
                    >
                      Try synthetic files
                    </button>
                    <label className="file-input-label">
                      Select files for preview
                      <input
                        type="file"
                        multiple
                        aria-label="Select files for preview"
                        disabled={!!busy}
                        onChange={(event) => {
                          const files = Array.from(
                            event.target.files || [],
                          ).slice(0, 250);
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
                          setSource(undefined);
                          setManifest(undefined);
                          setOutDir(undefined);
                          setNotice(
                            "Files selected for local analysis and preview. Use Choose folder for copy operations.",
                          );
                        }}
                      />
                    </label>
                  </div>
                  <small>
                    Read access first. Output permission only when you approve
                    copying.
                  </small>
                </div>
                {notice && (
                  <div role="status" className="notice">
                    {notice}
                  </div>
                )}
                {busy && (
                  <div role="status" className="progress">
                    <LoaderCircle className="spin" size={17} />
                    {busy}
                    {abort.current && (
                      <button onClick={() => abort.current?.abort()}>
                        Stop after current request
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
                          disabled={
                            (!ready && !visionReady) || !!busy || !!manifest
                          }
                          onClick={analyze}
                        >
                          <Sparkles size={16} /> Analyze locally
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
                    <div className="review-list">
                      {entries
                        .filter(
                          (e) =>
                            filter === "all" ||
                            (filter === "suggested" &&
                              e.status === "suggested") ||
                            (filter === "approved" && e.approved) ||
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
                            {(e.warning || errors.has(e.id)) && (
                              <div className="warning">
                                {errors.get(e.id) || e.warning}
                              </div>
                            )}
                          </article>
                        ))}
                    </div>
                    <div className="copy-bar">
                      <span>
                        <ShieldCheck size={17} /> {approved.length} approved ·
                        originals preserved
                      </span>
                      <Button
                        disabled={
                          !source ||
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
                    <h3>Operation results</h3>
                    <p>
                      Output session: <code>{manifest.session}</code>
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
                    {manifest.results.map((r, i) => (
                      <div key={i}>
                        {r.destination}
                        <span>{r.status}</span>
                        {r.error && <small>{r.error}</small>}
                      </div>
                    ))}
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
              examples. No Qwen inference or file operations take place in this
              demo.
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
            <p className="lead">No accounts needed for local document AI.</p>
            <div className="help-grid">
              <article>
                <span className="label">01 · PREPARE YOUR COMPUTER</span>
                <h2>Bring your local AI.</h2>
                <p>
                  Use a current Windows desktop Chrome or Edge browser. Install
                  Ollama, then download qwen3:4b for text and qwen3-vl:4b for
                  JPG/JPEG/PNG images. The text model download is approximately
                  2.5 GB; runtime memory needs are higher and depend on context
                  size. Speed varies by hardware.
                </p>
                <a
                  className="official-link"
                  href="https://ollama.com/download/windows"
                  target="_blank"
                  rel="noreferrer"
                >
                  Download Ollama for Windows <ArrowUpRight size={14} />
                </a>
                <Command text="ollama pull qwen3:4b" />
                <Command text="ollama run qwen3:4b" />
                <p>
                  The first download needs internet. Local document analysis
                  uses your installed model.
                </p>
              </article>
              <article>
                <span className="label">02 · CHECK THE CONNECTION</span>
                <h2>Three checks. One clear answer.</h2>
                <p>
                  Open the organizer and select Check local AI. We verify the
                  service, installed model, and an actual validated inference
                  response separately.
                </p>
                <p>
                  If the browser blocks the request, check its local network
                  permission. Ollama may need the exact app origin in{" "}
                  <code>OLLAMA_ORIGINS</code>, followed by an Ollama restart.
                  Avoid allowing every website.
                </p>
                <p>
                  For local-only Ollama use, configure{" "}
                  <code>OLLAMA_NO_CLOUD=1</code>. The organizer uses the
                  loopback endpoint and the local <code>qwen3:4b</code> model.
                </p>
                <Button secondary onClick={() => go("organize")}>
                  Open local AI checks <ArrowRight size={16} />
                </Button>
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
                  TXT, Markdown, DOCX, text PDFs, CSV, XLSX, PPTX, JPG, JPEG and
                  PNG are supported. Initial limits: 250 files, 20 MB per file,
                  14,000 extracted characters. Large PDFs and workbooks are
                  sampled. Warnings identify partial content.
                </p>
                <p>
                  Scanned-PDF OCR, legacy DOC/XLS, and encrypted documents are
                  not supported. Models can misunderstand documents; review
                  every suggestion.
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
        {import.meta.env.DEV && page === "help" && <BrowserChecks />}
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
          <small>Local document AI · optional cloud Guide</small>
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
                    "Connect Ollama and verify the local model before analysis.",
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
            "Help me set up Ollama",
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
