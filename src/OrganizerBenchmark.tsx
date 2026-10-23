import { useState } from "react";
import { benchmarkFixtures } from "./benchmark-fixtures";
import { analyzeFile, AnalysisCache } from "./analysis-engine";
import { copyApproved, inventory, verifyCopies, type Manifest } from "./files";
import { CopyAudit } from "./CopyAudit";
import { fileEntry, mergeSelection } from "./drop-files";
import {
  destination,
  uniqueApprovedNames,
  completePlan,
  type Entry,
} from "./domain";
export function OrganizerBenchmark() {
  const [lines, setLines] = useState<string[]>([]),
    [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<{
    manifest: Manifest;
    dir: FileSystemDirectoryHandle;
  }>();
  async function checkCopyUI() {
    setBusy(true);
    try {
      const entries = uniqueApprovedNames(
        ["one", "two", "three"].map((text, i) => ({
          ...fileEntry(new File([text], "Study notes.txt")),
          path: `folder-${i}/Study notes.txt`,
          title: "Study notes",
          category: "Study & Learning",
          subcategory: "",
          status: "suggested",
          approved: true,
        })),
      );
      const root = await navigator.storage.getDirectory();
      const output = await root.getDirectoryHandle(
        `copy-checker-${crypto.randomUUID()}`,
        { create: true },
      );
      setAudit(await copyApproved(undefined, output, entries, () => {}));
    } catch (error) {
      setLines([String(error)]);
    } finally {
      setBusy(false);
    }
  }
  async function runCompleteWorkflow() {
    setBusy(true);
    setLines([]);
    try {
      const root = await navigator.storage.getDirectory();
      const sandbox = await root.getDirectoryHandle(
        `complete-workflow-${crypto.randomUUID()}`,
        { create: true },
      );
      const sources = await sandbox.getDirectoryHandle("sources", {
        create: true,
      });
      const output = await sandbox.getDirectoryHandle("output", {
        create: true,
      });
      let combined: Entry[] = [];
      const started = performance.now();
      for (let batch = 0; batch < 2; batch++) {
        const folder = await sources.getDirectoryHandle(`Input ${batch + 1}`, {
          create: true,
        });
        for (let i = batch === 0 ? 0 : 70; i < (batch === 0 ? 70 : 131); i++) {
          const name =
            i >= 121
              ? `${i}.png`
              : i >= 83
                ? `${i}.txt`
                : `Study notes ${i}.txt`;
          const h = await folder.getFileHandle(name, { create: true });
          const w = await h.createWritable();
          await w.write(
            i >= 121
              ? new Uint8Array([137, 80, 78, 71, i])
              : i >= 83
                ? "!!!"
                : `Biology study notes ${i}. Cells and learning exercises.`,
          );
          await w.close();
        }
        const found = await inventory(folder);
        const merged = await mergeSelection(combined, {
          ...found,
          source: folder,
        });
        combined = merged.entries;
        setLines((old) => [
          ...old,
          `Added input ${batch + 1}: ${combined.length} files in combined batch.`,
        ]);
      }
      const cache = new AnalysisCache();
      const analyzed: Entry[] = [];
      for (const e of combined) {
        if (e.name.endsWith(".png")) {
          analyzed.push({
            ...e,
            status: "unsupported",
            warning:
              "Image analysis is unsupported; copy unchanged to Needs Review.",
          });
          continue;
        }
        const { value } = await analyzeFile(
          e.file,
          cache,
          new AbortController().signal,
          () => {},
        );
        analyzed.push({
          ...e,
          ...value.suggestion,
          suggestion: value.suggestion,
          status: "suggested",
          warning:
            value.warning ||
            (value.suggestion.needsReview
              ? "Review title/category evidence"
              : undefined),
        });
      }
      const planned = completePlan(analyzed);
      const organized = planned.filter(
        (e) => e.copyRoute === "organized",
      ).length;
      const review = planned.filter((e) => e.copyRoute === "review").length;
      const copied = await copyApproved(undefined, output, planned, () => {});
      const checks = await verifyCopies(copied.dir, copied.manifest);
      const originalFiles = (await inventory(sources)).entries.length;
      const report = {
        total: planned.length,
        organized,
        needsReview: review,
        excluded: planned.filter((e) => !e.approved).length,
        verified: checks.filter((c) => c.status === "verified").length,
        failed: copied.manifest.results.filter((r) => r.status === "failed")
          .length,
        sourceFilesStillPresent: originalFiles,
        totalSetupPlanCopyRecheckMs: Math.round(performance.now() - started),
        storage: "Synthetic OPFS only; no private source touched",
      };
      if (
        report.total !== 131 ||
        organized !== 83 ||
        review !== 48 ||
        report.verified !== 131 ||
        report.failed ||
        originalFiles !== 131
      )
        throw new Error(JSON.stringify(report));
      setLines((old) => [...old, JSON.stringify(report, null, 2)]);
      setAudit(copied);
    } catch (error) {
      setLines((old) => [...old, `FAIL: ${String(error)}`]);
    } finally {
      setBusy(false);
    }
  }
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
      <button disabled={busy} onClick={runCompleteWorkflow}>
        Run complete 131-file workflow
      </button>
      <button disabled={busy} onClick={checkCopyUI}>
        Run copy checker regression
      </button>
      {audit && (
        <CopyAudit
          key={audit.manifest.session}
          manifest={audit.manifest}
          dir={audit.dir}
          disabled={busy}
        />
      )}
    </section>
  );
}
