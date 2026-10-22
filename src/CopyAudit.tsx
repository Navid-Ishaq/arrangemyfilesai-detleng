import { useState } from "react";
import { type Manifest, type CopyCheck, verifyCopies } from "./files";

export function CopyAudit({
  manifest,
  dir,
  disabled,
}: {
  manifest: Manifest;
  dir?: FileSystemDirectoryHandle;
  disabled: boolean;
}) {
  const [checks, setChecks] = useState<CopyCheck[]>([]);
  const [checking, setChecking] = useState(false);
  const [query, setQuery] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [checkedAt, setCheckedAt] = useState("");
  const rows = manifest.plan.map((p) => {
    const result = manifest.results.find(
      (r) => r.source === p.source && r.destination === p.destination,
    );
    const check = checks.find(
      (r) => r.source === p.source && r.destination === p.destination,
    );
    return {
      source: p.source,
      destination: p.destination,
      status: result?.status ?? "pending",
      sha256: result?.sha256 ?? "",
      check: check?.status ?? "not rechecked",
      error: check?.error || result?.error || "",
    };
  });
  const skipped = manifest.inventory?.filter((e) => !e.approved) ?? [];
  function download() {
    // Prefix formula-like fields so spreadsheet software treats paths as text.
    const cell = (s: string) =>
      '"' + (/^[=+@\-\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"';
    const all = [
      ...rows,
      ...skipped.map((e) => ({
        source: e.source,
        destination: "",
        status: "not selected",
        sha256: "",
        check: "not copied",
        error: "",
      })),
    ];
    const csv = [
      ["Source", "Destination", "Copy status", "SHA-256", "Recheck", "Error"],
      ...all.map((r) => [
        r.source,
        r.destination,
        r.status,
        r.sha256,
        r.check,
        r.error,
      ]),
    ]
      .map((r) => r.map(cell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${manifest.session}-copy-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="copy-audit">
      <h4>Copy checker</h4>
      <p>
        Every successful copy was reopened and matched against the original
        SHA-256 hash. Recheck reads the saved files again to detect missing or
        changed copies.
      </p>
      <p role="status">
        {manifest.results.length} of {manifest.plan.length} selected files
        processed · {skipped.length} not selected
        {checking
          ? ` · Checking ${checks.length} outputs…`
          : checkedAt
            ? ` · Rechecked ${checkedAt}: ${checks.filter((r) => r.status === "verified").length} verified, ${checks.filter((r) => r.status !== "verified").length} issues`
            : ""}
      </p>
      <div className="actions">
        <button
          className="button secondary"
          disabled={!dir || disabled || checking}
          onClick={async () => {
            if (!dir) return;
            setChecking(true);
            setChecks([]);
            setCheckedAt("");
            try {
              await verifyCopies(dir, manifest, setChecks);
              setCheckedAt(new Date().toLocaleTimeString());
            } finally {
              setChecking(false);
            }
          }}
        >
          Recheck saved copies
        </button>
        <button
          className="button secondary"
          disabled={disabled || checking}
          onClick={download}
        >
          Download copy report (CSV)
        </button>
      </div>
      <label>
        Find a source or destination
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search copied files…"
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={onlyIssues}
          onChange={(e) => setOnlyIssues(e.target.checked)}
        />{" "}
        Show copy or recheck issues only
      </label>
      <div className="audit-table">
        <table>
          <thead>
            <tr>
              <th>Source → destination</th>
              <th>Copy</th>
              <th>Recheck</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter(
                (r) =>
                  (!onlyIssues ||
                    r.status !== "copied" ||
                    !["verified", "not rechecked"].includes(r.check)) &&
                  `${r.source} ${r.destination}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              )
              .map((r) => (
                <tr key={r.destination}>
                  <td>
                    {r.source}
                    <br />→ {r.destination}
                    {r.error && <small>{r.error}</small>}
                  </td>
                  <td>{r.status}</td>
                  <td>{r.check}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
