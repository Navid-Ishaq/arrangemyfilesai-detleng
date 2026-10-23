import { useState } from "react";
import { CopyAudit } from "./CopyAudit";
import { parseSavedManifest, type Manifest } from "./files";

export function SavedCopyReport() {
  const [report, setReport] = useState<{
    manifest: Manifest;
    dir?: FileSystemDirectoryHandle;
    label: string;
  }>();
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  return (
    <section className="saved-copy-report">
      <h3>Check an existing copy session</h3>
      <p>
        Open the output session folder containing operation-manifest.json—even
        after a refresh. This reads the saved report and lets you recheck its
        recorded copies. It does not copy, rename or delete files.
      </p>
      <button
        className="button secondary"
        disabled={reading || typeof window.showDirectoryPicker !== "function"}
        onClick={async () => {
          setError("");
          try {
            const dir = await window.showDirectoryPicker({ mode: "read" });
            setReading(true);
            const file = await (
              await dir.getFileHandle("operation-manifest.json")
            ).getFile();
            if (file.size > 20 * 1024 * 1024)
              throw new Error("Copy report is too large.");
            const manifest = parseSavedManifest(JSON.parse(await file.text()));
            setReport({ manifest, dir, label: dir.name });
          } catch (e) {
            if ((e as DOMException).name !== "AbortError")
              setError(
                "Could not open a valid copy report. Select the session folder containing operation-manifest.json. " +
                  (e instanceof Error ? e.message : ""),
              );
          } finally {
            setReading(false);
          }
        }}
      >
        {reading ? "Reading saved report…" : "Open saved output folder"}
      </button>
      <label>
        Or open operation-manifest.json to view its report
        <input
          type="file"
          accept=".json,application/json"
          disabled={reading}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setError("");
            setReading(true);
            try {
              if (file.size > 20 * 1024 * 1024)
                throw new Error("Copy report is too large.");
              setReport({
                manifest: parseSavedManifest(JSON.parse(await file.text())),
                label: file.name,
              });
            } catch {
              setError("This file is not a valid operation manifest.");
            } finally {
              setReading(false);
            }
          }}
        />
      </label>
      <p>
        JSON-only view shows recorded results. Open the saved output folder
        above to recheck actual file bytes.
      </p>
      {error && <p role="alert">{error}</p>}
      {report && (
        <>
          <p>
            Opened report: <strong>{report.label}</strong>
          </p>
          <CopyAudit
            key={report.label + report.manifest.session}
            manifest={report.manifest}
            dir={report.dir}
            disabled={false}
          />
        </>
      )}
    </section>
  );
}
