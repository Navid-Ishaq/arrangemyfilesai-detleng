import { useState } from "react";
import {
  type Manifest,
  type CopyCheck,
  verifyCopies,
  copySummary,
} from "./files";

export function CopyAudit({
  manifest,
  dir,
  disabled,
  interruption,
}: {
  manifest: Manifest;
  dir?: FileSystemDirectoryHandle;
  disabled: boolean;
  interruption?: string;
}) {
  const [checks, setChecks] = useState<CopyCheck[]>([]);
  const [checking, setChecking] = useState(false);
  const [page, setPage] = useState(0);
  const [outcome, setOutcome] = useState("all");
  const [query, setQuery] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [checkedAt, setCheckedAt] = useState("");
  const summary = copySummary(manifest);
  const resultByPath = new Map(
    manifest.results.map((r) => [`${r.source}\0${r.destination}`, r]),
  );
  const checkByPath = new Map(
    checks.map((r) => [`${r.source}\0${r.destination}`, r]),
  );
  const rows = manifest.plan.map((p) => {
    const result = resultByPath.get(`${p.source}\0${p.destination}`);
    const check = checkByPath.get(`${p.source}\0${p.destination}`);
    return {
      source: p.source,
      destination: p.destination,
      status: result?.status ?? "pending",
      sha256: result?.sha256 ?? "",
      check: check?.status ?? "not rechecked",
      error: check?.error || result?.error || "",
      route:
        p.route ||
        (p.destination.startsWith("Needs Review/") ? "review" : "organized"),
      reason: p.reason || "",
    };
  });
  const skipped = manifest.inventory?.filter((e) => !e.approved) ?? [];
  const excludedRows = skipped.map((e) => ({
    source: e.source,
    destination: "",
    status: "excluded / not selected",
    sha256: "",
    check: "not copied",
    error: "",
    route: "excluded",
    reason: "Not included in this copy session",
  }));
  const allRows = [...rows, ...excludedRows];
  const group = (r: (typeof allRows)[number]) =>
    r.route === "excluded"
      ? "excluded"
      : r.status === "failed" ||
          ["missing", "changed", "unreadable"].includes(r.check)
        ? "failed"
        : r.status !== "copied"
          ? "pending"
          : r.route;
  const filteredRows = allRows.filter(
    (r) =>
      (outcome === "all" || group(r) === outcome) &&
      (!onlyIssues ||
        r.status === "failed" ||
        r.status === "pending" ||
        ["missing", "changed", "unreadable"].includes(r.check)) &&
      `${r.source} ${r.destination}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const shownPage = Math.min(
    page,
    Math.max(0, Math.ceil(filteredRows.length / 50) - 1),
  );
  function download() {
    // Prefix formula-like fields so spreadsheet software treats paths as text.
    const cell = (s: string) =>
      '"' + (/^[=+@\-\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"';
    const all = allRows;
    const csv = [
      [
        "Source",
        "Destination",
        "Copy status",
        "SHA-256",
        "Recheck",
        "Error",
        "Outcome",
        "Reason",
      ],
      ...all.map((r) => [
        r.source,
        r.destination,
        r.status,
        r.sha256,
        r.check,
        r.error,
        r.route,
        r.reason,
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
      <div
        className={
          summary.pending ||
          summary.failed ||
          interruption ||
          manifest.scanIssues?.length
            ? "warning"
            : "notice"
        }
        role="status"
      >
        <strong>
          {disabled
            ? "Copy in progress"
            : summary.pending
              ? "Incomplete copy session — do not treat this batch as complete"
              : summary.failed
                ? "Copy finished with failures"
                : "Copy processing finished — review results below"}
        </strong>
        <p>
          {summary.approved} included · {summary.copied} recorded verified
          copies · {summary.failed} failed · {summary.pending} pending / not
          recorded
        </p>
        {summary.pending > 0 && (
          <p>
            {summary.pending} included files have no recorded result. They are
            not confirmed copied. A file written just before an interruption may
            exist without a saved result.
          </p>
        )}
        {interruption && <p>{interruption}</p>}
      </div>
      {!!manifest.scanIssues?.length && (
        <div className="warning" role="alert">
          <strong>
            Input scan was incomplete. These results cover inventoried files
            only.
          </strong>
          <ul>
            {manifest.scanIssues.map((issue, i) => (
              <li key={i}>
                {issue.path}: {issue.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="count-cards" aria-label="Filter copy results">
        {[
          ["all", "Total"],
          ["organized", "Organized"],
          ["review", "Needs Review"],
          ["excluded", "Excluded / not selected"],
          ["failed", "Failed / recheck issues"],
          ["pending", "Pending / other"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={outcome === key}
            onClick={() => {
              setOutcome(key);
              setPage(0);
            }}
          >
            <strong>
              {key === "all"
                ? allRows.length
                : allRows.filter((r) => group(r) === key).length}
            </strong>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <p>
        Every successful copy was reopened and matched against the original
        SHA-256 hash. Recheck reads the saved files again to detect missing or
        changed copies.
      </p>
      <p role="status">
        {manifest.results.length} of {manifest.plan.length} included files
        processed · {skipped.length} excluded / not selected
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
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search copied files…"
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={onlyIssues}
          onChange={(e) => {
            setOnlyIssues(e.target.checked);
            setPage(0);
          }}
        />{" "}
        Show copy or recheck issues only
      </label>
      {!filteredRows.length && (
        <p role="status">
          {onlyIssues && outcome === "all" && !query
            ? "No copy or verification issues found in the recorded results."
            : "No files match this view. Clear the filters to see all results."}
        </p>
      )}
      {filteredRows.length > 50 && (
        <div className="actions">
          <button
            disabled={shownPage === 0}
            onClick={() => setPage(shownPage - 1)}
          >
            Previous results
          </button>
          <span>
            Showing {shownPage * 50 + 1}–
            {Math.min((shownPage + 1) * 50, filteredRows.length)} of{" "}
            {filteredRows.length}. CSV contains the full report.
          </span>
          <button
            disabled={(shownPage + 1) * 50 >= filteredRows.length}
            onClick={() => setPage(shownPage + 1)}
          >
            Next results
          </button>
        </div>
      )}
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
            {filteredRows
              .slice(shownPage * 50, (shownPage + 1) * 50)
              .map((r) => (
                <tr key={r.source + "|" + r.destination}>
                  <td>
                    {r.source}
                    <br />→ {r.destination}
                    {r.reason && <small>{r.reason}</small>}
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
