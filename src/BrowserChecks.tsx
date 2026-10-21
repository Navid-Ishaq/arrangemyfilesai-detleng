import { useState } from "react";
import { copyApproved, rollback, inventory } from "./files";
import { extract } from "./extract";
import { Entry } from "./domain";
export function BrowserChecks() {
  const [results, setResults] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    setResults([]);
    const report = (s: string) => setResults((old) => [...old, s]);
    try {
      const root = await navigator.storage.getDirectory();
      const run = await root.getDirectoryHandle(
        "amf-synthetic-" + crypto.randomUUID(),
        { create: true },
      );
      const source = await run.getDirectoryHandle("source", { create: true });
      const output = await run.getDirectoryHandle("output", { create: true });
      const handle = await source.getFileHandle("old.txt", { create: true });
      const stream = await handle.createWritable();
      await stream.write("Synthetic project planning notes.");
      await stream.close();
      const inv = await inventory(source);
      report(
        `PASS · Real browser inventory: ${inv.entries.length} synthetic file.`,
      );
      const e: Entry = {
        ...inv.entries[0],
        status: "suggested",
        title: "Project Planning Notes",
        category: "Learning",
        subcategory: "",
        approved: true,
      };
      const copied = await copyApproved(source, output, [e], () => {});
      if (copied.manifest.results[0].status !== "copied")
        throw new Error("Copy verification failed.");
      report("PASS · Real browser copy + SHA-256 verification + manifest.");
      const rolled = await rollback(copied.dir, copied.manifest);
      if (rolled.results[0].status !== "rolled-back")
        throw new Error("Rollback failed.");
      report("PASS · Real browser rollback of unchanged synthetic output.");
      const original = await (await source.getFileHandle("old.txt")).getFile();
      if ((await original.text()) !== "Synthetic project planning notes.")
        throw new Error("Original changed.");
      report("PASS · Original synthetic source preserved.");
      for (const name of [
        "0.docx",
        "final2.pdf",
        "budget.xlsx",
        "slides.pptx",
        "datos.csv",
        "final2.md",
      ]) {
        const response = await fetch("/__fixtures/" + name);
        if (!response.ok) throw new Error("Fixture unavailable: " + name);
        const file = new File([await response.blob()], name);
        const result = await extract(file);
        if (!result.text.trim()) throw new Error("No extracted text: " + name);
        report(`PASS · ${name}: extracted ${result.text.length} characters.`);
      }
      try {
        await extract(
          new File(
            [await (await fetch("/__fixtures/scan.pdf")).blob()],
            "scan.pdf",
          ),
        );
        throw new Error("Expected OCR warning.");
      } catch (e) {
        if (!(e as Error).message.includes("OCR_REQUIRED")) throw e;
        report("PASS · Image-only/empty PDF flagged for OCR.");
      }
      report(
        "COMPLETE · OPFS sandbox checks; native folder picker permission still requires a desktop manual test. Synthetic sandbox retained in browser storage.",
      );
    } catch (e) {
      report("FAIL · " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section">
      <details>
        <summary>Developer verification · synthetic browser sandbox</summary>
        <p>
          Development only. Creates synthetic files in browser private storage,
          tests real file handles and document extraction. Never accesses
          personal folders.
        </p>
        <button className="button secondary" disabled={busy} onClick={run}>
          {busy ? "Running browser checks…" : "Run synthetic browser checks"}
        </button>
        <div className="tree" role="status">
          {results.map((r, i) => (
            <div key={i}>{r}</div>
          ))}
        </div>
      </details>
    </section>
  );
}
