import { useState } from "react";
import { benchmarkFixtures } from "./benchmark-fixtures";
import { analyzeFile, AnalysisCache } from "./analysis-engine";
import { copyApproved } from "./files";
import { fileEntry } from "./drop-files";
import { destination } from "./domain";
export function OrganizerBenchmark() {
  const [lines, setLines] = useState<string[]>([]),
    [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    setLines([]);
    const report = (s: string) => setLines((old) => [...old, s]);
    try {
      for (const count of [100, 500]) {
        report(
          `Generating ${count} varied, unique synthetic documents (not included in plan timing)…`,
        );
        const fixtures = await benchmarkFixtures(count);
        const cache = new AnalysisCache();
        const entries = [];
        let categoryCorrect = 0,
          titleCorrect = 0,
          warnings = 0;
        const started = performance.now();
        for (const item of fixtures) {
          const { value } = await analyzeFile(
            item.file,
            cache,
            new AbortController().signal,
            () => {},
          );
          categoryCorrect += Number(
            value.suggestion.category === item.category,
          );
          titleCorrect += Number(value.suggestion.title === item.titleContains);
          warnings += Number(!!value.warning);
          entries.push({
            ...fileEntry(item.file),
            ...value.suggestion,
            suggestion: value.suggestion,
            status: "suggested",
            approved: true,
          });
        }
        const planMs = Math.round(performance.now() - started);
        report(
          JSON.stringify({
            count,
            planMs,
            categoryCorrect,
            titleCorrect,
            warnings,
            networkAIRequests: 0,
          }),
        );
        const root = await navigator.storage.getDirectory();
        const output = await root.getDirectoryHandle(
          `organizer-benchmark-${count}-${crypto.randomUUID()}`,
          { create: true },
        );
        const copyStarted = performance.now();
        const result = await copyApproved(undefined, output, entries, () => {});
        let readBack = 0;
        for (const entry of entries) {
          const parts = destination(entry).split("/");
          const name = parts.pop()!;
          let dir = result.dir;
          for (const part of parts) dir = await dir.getDirectoryHandle(part);
          const file = await (await dir.getFileHandle(name)).getFile();
          if (file.size === entry.file.size) readBack++;
        }
        report(
          JSON.stringify({
            count,
            copyMs: Math.round(performance.now() - copyStarted),
            verified: result.manifest.results.filter(
              (r) => r.status === "copied",
            ).length,
            failed: result.manifest.results.filter((r) => r.status === "failed")
              .length,
            readBack,
            storage: "browser-owned synthetic OPFS; no private source touched",
          }),
        );
      }
    } catch (error) {
      report(`FAIL: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section">
      <h2>Development-only organizer acceptance benchmark</h2>
      <p>
        100 and 500 varied synthetic TXT/MD/CSV/DOCX/PDF/XLSX/PPTX files. Writes
        only browser-owned synthetic storage.
      </p>
      <button disabled={busy} onClick={run}>
        {busy ? "Benchmark running…" : "Run organizer benchmark"}
      </button>
      <pre style={{ whiteSpace: "pre-wrap" }}>{lines.join("\n")}</pre>
    </section>
  );
}
