import { useEffect, useRef, useState } from "react";

export const ecosystemCards = [
  ["DeTLeng — Main website ↗", "https://www.detleng.com/", "Discover thoughtful tools and services."],
  ["LFDS — Logic First Digital Solutions ↗", "https://lfds.detleng.com/", "Understand the problem. Build a practical solution."],
  ["DeTLeng Network — Explore the network ↗", "https://network.detleng.com/", "Explore connected projects and ideas."],
];
export function EcosystemFooter({ navigate, openLogin }: { navigate: (page: "home" | "organize" | "family" | "demo" | "help" | "privacy") => void; openLogin: () => void }) {
  return <footer className="ecosystem-footer compact-footer">
    <div className="footer-columns">
      <div className="footer-brand"><strong>Arrange My Files AI</strong><p>Give your files a clearer name and a place.</p><span>By DeTLeng</span></div>
      <div className="footer-navigation"><h2>Arrange My Files</h2>{([["home", "Home"], ["organize", "Organize Files"], ["demo", "How it works"], ["help", "Quick Guide"], ["privacy", "Privacy"], ["family", "About"]] as const).map(([page, label]) => <button key={page} onClick={() => navigate(page)}>{label}</button>)}<button onClick={openLogin}>Login / Create Account</button></div>
      <div className="footer-ecosystem"><h2>Explore the DeTLeng ecosystem</h2>{ecosystemCards.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noopener noreferrer">{label}</a>)}</div>
      <div className="footer-care"><h2>Made with care</h2><p>Files processed on your computer.<br />Originals stay untouched.<br />Every included file accounted for.</p></div>
    </div>
    <div className="footer-base"><span>arrangemyfilesai.detleng.com</span><span>© {new Date().getFullYear()} DeTLeng</span></div>
  </footer>;
}
export function LaunchLogin({ close }: { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState("Login");
  const [show, setShow] = useState(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className="launch-login" aria-labelledby="account-title" onCancel={(event) => { event.preventDefault(); close(); }}>
    <button className="modal-close" aria-label="Close account dialog" onClick={close}>×</button>
    <h2 id="account-title">Welcome to Arrange My Files AI</h2>
    <p id="account-status" role="status">Account features are being prepared. No account is required right now.</p>
    <div role="tablist" aria-label="Account options">{["Login", "Create Account"].map((name, index) => <button key={name} id={`account-tab-${index}`} role="tab" aria-selected={tab === name} aria-controls="account-panel" tabIndex={tab === name ? 0 : -1} onClick={() => setTab(name)} onKeyDown={(event) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : index === 0 ? 1 : 0; setTab(next ? "Create Account" : "Login"); document.getElementById(`account-tab-${next}`)?.focus(); } }}>{name}</button>)}</div>
    <div role="tabpanel" id="account-panel" aria-labelledby={`account-tab-${tab === "Login" ? 0 : 1}`}>
      <p>These fields preview the future account flow. They are disabled; credentials are never submitted.</p>
      <fieldset disabled aria-describedby="account-status">
        {tab === "Create Account" && <label>Username<input autoComplete="off" /></label>}
        <label>Email<input type="email" autoComplete="off" /></label>
        <label>Password<input type={show ? "text" : "password"} autoComplete="off" /></label>
        {tab === "Create Account" && <label>Confirm Password<input type={show ? "text" : "password"} autoComplete="off" /></label>}
        <button>{tab === "Login" ? "Sign In" : "Create Account"}</button>
      </fieldset>
      <label><input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} /> Show Password</label>
    </div>
    <p><strong>You’re early — enjoy Arrange My Files AI free</strong></p><button className="button" onClick={close}>Continue Free</button>
  </dialog>;
}
const examples = [
  { source: "Study/0.docx", target: "Projects/Project Planning and Milestones.docx", review: false, evidence: "A usable title in the opening content supplies a clearer filename; a project keyword rule supplies the folder." },
  { source: "Study/Python Data Cleaning Notes.pdf", target: "Study & Learning/Python Data Cleaning Notes.pdf", review: false, evidence: "A descriptive filename is preserved. The first two PDF pages provide folder evidence." },
  { source: "Scans/scan_003.pdf", target: "Needs Review/Scans/scan_003.pdf", review: true, evidence: "No readable opening text: keep the original name and relative folders in Needs Review." },
  { source: "Photos/photo.png", target: "Needs Review/Photos/photo.png", review: true, evidence: "Not supported in this release—original preserved. No image analysis takes place." },
];
export function InteractiveManual({ openWorkspace }: { openWorkspace: () => void }) {
  const [step, setStep] = useState(0);
  const [included, setIncluded] = useState(examples.map(() => true));
  const [filter, setFilter] = useState("Total");
  const organized = examples.filter((row, i) => included[i] && !row.review).length;
  const review = examples.filter((row, i) => included[i] && row.review).length;
  const excluded = included.filter((value) => !value).length;
  const counts: [string, number][] = [["Total", 4], [step === 2 ? "Organized" : "To organize", organized], ["Needs Review", review], ["Excluded", excluded], ["Failed", 0]];
  return <section className="section demo-page"><div className="eyebrow">HOW IT WORKS · INTERACTIVE WALKTHROUGH</div><h1>Every file accounted for.</h1><p className="lead">Explore a complete batch, including the files that need your attention.</p><div className="notice" role="status">Simulation only. This walkthrough reads, copies and verifies no actual files. Real copying happens in the workspace with your own inputs.</div>
    <div className="demo-progress">{["Add files & build", "Review the whole batch", "Copy & check results"].map((label, index) => <button key={label} aria-current={step === index ? "step" : undefined} className={step === index ? "current" : ""} onClick={() => { setStep(index); setFilter("Total"); }}><span>{index + 1}</span>{label}</button>)}</div>
    <div className="demo-board"><h2>{["Drop multiple files or folders.", "Included means it will be copied.", "A complete, traceable output."][step]}</h2><p>{["Inputs accumulate in one batch. Choose Build organization plan to propose names and folders locally. These four fictional files represent a mixed input.", "All four files start included. Uncheck only to deliberately exclude a file. Needs Review files are still included. Count buttons filter this list without changing inclusion.", "The real workspace creates a new output session, reopens each successful copy and compares its SHA-256 hash with the original. These results are illustrative, not an actual verification."][step]}</p>
    {step > 0 && <div className="count-cards">{counts.map(([label, count]) => <button key={label} aria-pressed={filter === label} onClick={() => setFilter(label)}><strong>{count}</strong><span>{label}</span></button>)}</div>}
    {examples.filter((row, index) => step === 0 || filter === "Total" || (filter === "Excluded" ? !included[index] : filter === "Needs Review" ? included[index] && row.review : filter === "Failed" ? false : included[index] && !row.review)).map((row) => { const index = examples.indexOf(row); return <article className="manual-example" key={row.source}><strong>{row.source}</strong>{step > 0 && <><p>→ {included[index] ? row.target : "Excluded by you — no output copy"}</p><p>{row.evidence}</p></>}{step === 1 && <label><input type="checkbox" aria-label={`Include example ${row.source}`} checked={included[index]} onChange={(event) => setIncluded(included.map((value, i) => i === index ? event.target.checked : value))} /> Include in copying</label>}{step === 2 && <span>{included[index] ? "Simulated copied / verified" : "Explicitly excluded"}</span>}</article>; })}
    {step > 0 && filter === "Failed" && <p role="status">No failed files in this simulated batch. In real results, this filter shows copy or recheck issues.</p>}
    {step === 1 && <p>In the workspace, open Review proposed name and folder to edit a name/category, accept a category plan, or keep the original in Needs Review. Inclusion is a separate choice.</p>}
    {step === 2 && <p role="status">Example accounting: 4 found = {organized} organized + {review} Needs Review + {excluded} excluded + 0 failed + 0 pending. Download copy report (CSV) traces source → destination. Recheck saved copies checks the output bytes again; it does not judge the category.</p>}
    <div className="demo-bottom"><strong>{organized + review} included · {excluded} excluded</strong><button className="button" onClick={() => { if (step < 2) { setStep(step + 1); setFilter("Total"); } else openWorkspace(); }}>{["Build example plan", "Simulate copy results", "Open workspace with your files"][step]}</button></div></div></section>;
}
const guideSections = [
  ["01 · ADD INPUTS", "Drop multiple files or folders", "Use desktop Chrome or Edge. Drop multiple files/folders together, use Add files for a multi-file selection, or Add folder repeatedly (the browser picker selects one folder at a time). Additions accumulate. Clear / new batch resets the current workspace; it does not delete originals or earlier output folders."],
  ["02 · BUILD", "Suggest names and folders locally", "Choose Build organization plan. Useful filenames are preserved; generic names can be replaced using document titles, metadata or headings. Literal keyword rules assign categories. No Ollama or AI connection is required. PDFs use the first 2 pages; Word uses opening content, slides the first 4 slides, and spreadsheets the first 2 sheets / 12 rows. Naming checks at most 3,600 opening characters, not the whole document."],
  ["03 · REVIEW", "Every file starts included", "To organize means a category plan is ready. Needs Review means an unchanged copy goes into Needs Review with its original name and input subfolders. Uncheck only to exclude a file from copying. Total, Needs Review, Excluded and Failed count buttons filter the view; they do not change inclusion. Lists show up to 50 rows per page, but copying covers the entire included batch."],
  ["04 · EDIT", "Keep control of the plan", "Open Review proposed name and folder to edit the proposed name, category or optional subfolder. Accept this category plan approves that proposed destination; Keep original in Needs Review preserves its input path. Include all files restores inclusion. Rebuild names and folders with current rules uses the Folder rules shown above, clears manual proposal edits/acceptances and keeps inclusion choices. Originals remain unchanged."],
  ["05 · COPY", "Choose output and copy the whole included batch", "Copy all N files includes both category plans and Needs Review files. If you deliberately excluded files, the button counts only those still included. Choose an output folder separate from every source folder. A new session folder is created. Successful copies are reopened and checked against the original SHA-256 hash. An unreadable source is reported as failed; no success is invented."],
  ["06 · RESULTS", "Understand every count", "For example: 131 found = 83 organized + 48 Needs Review + 0 excluded + 0 failed + 0 pending. These are example results, not a guarantee. Before copying, To organize is a plan count; after copying, Organized is a recorded successful-copy count. A failed or pending file means the batch is incomplete. Original files stay untouched."],
  ["07 · REPORTS", "Find, export and recheck copies", "Search source or destination to trace a file. Download copy report (CSV) opens in a spreadsheet and records source, destination, copy status, hash, recheck, error, outcome and reason. Show copy or recheck issues only hides successful rows; an empty result means no matching issues, not lost files. Recheck saved copies reads the output bytes again to detect missing or changed copies. It does not check whether the category is suitable."],
  ["08 · REOPEN & RECOVER", "Saved sessions remain inspectable", "Open saved output folder selects the session containing operation-manifest.json and enables actual byte rechecking after refresh. Opening only the JSON shows recorded results, without verifying files. If copying stops, review failed and pending/not-recorded counts; keep sources and output. There is no automatic resume. Roll back unchanged copies is available for the current open session and removes only outputs whose hashes still match; after reload, use the manifest for manual recovery."],
  ["09 · LIMITS", "Know what was scanned", "Up to 1,000 files in the combined batch and 12 nested folder levels. Analysis supports DOCX, text PDFs, XLSX, PPTX, CSV, TXT and MD up to 20 MB per file. The 20 MB analysis limit does not prohibit copying larger readable files unchanged into Needs Review. Images, scanned PDFs without text, encrypted files and legacy DOC/XLS have no content recognition. Images show: Not supported in this release—original preserved. Scan limitations list skipped/inaccessible paths; acknowledge them before copying the known subset. Unscanned inputs cannot be counted as a complete batch. Empty folders are not reproduced."],
  ["10 · SAMPLE MODE", "Preview first; test real copying with real inputs", "Interactive Demo and synthetic examples are previews. They perform no real output copying. Start a new batch and use Add files or Add folder to enable real copying. If the copy action is unavailable, also check that a plan is built, files are included, scan warnings are acknowledged, and the browser supports folder access in a secure context."],
];
export function QuickManual({ openWorkspace }: { openWorkspace: () => void }) {
  return <section className="section help-page"><div className="eyebrow">QUICK GUIDE · USER MANUAL</div><h1>From mixed folders to a checked output.</h1><p className="lead">Add → build → review → copy → verify. No account or AI installation required.</p><button className="button" onClick={openWorkspace}>Open organizer</button><div className="help-grid">{guideSections.map(([label, title, text]) => <article key={label}><span className="label">{label}</span><h2>{title}</h2><p>{text}</p></article>)}<article id="privacy"><span className="label">PRIVACY</span><h2>Your documents stay on your computer.</h2><p>Organization runs locally in your browser. The optional online Guide sends your chat messages to GroqCloud; app context is opt-in and restricted to stage/error codes. Do not paste confidential text or secrets into the Guide. No account is needed. Launch-stage Login is a preview and submits no credentials.</p></article></div></section>;
}
