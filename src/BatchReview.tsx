import { useState } from "react";
import { type Entry, destination, validatePlan } from "./domain";
import type { Manifest } from "./files";

type Props = {
  entries: Entry[];
  manifest?: Manifest;
  busy: boolean;
  canCopy: boolean;
  scanBlocked: boolean;
  samples: boolean;
  change: (entries: Entry[]) => void;
  build: (rebuild?: boolean) => void;
  copy: () => void;
};
export function BatchReview({
  entries,
  manifest,
  busy,
  canCopy,
  scanBlocked,
  samples,
  change,
  build,
  copy,
}: Props) {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const errors = validatePlan(entries);
  const included = entries.filter((e) => e.approved);
  const locked = busy || !!manifest;
  const resultByPath = new Map(
    manifest?.results.map((r) => [`${r.source}\0${r.destination}`, r]) || [],
  );
  const group = (e: Entry) => {
    if (!e.approved) return "excluded";
    const r = resultByPath.get(`${e.path}\0${destination(e)}`);
    if (r?.status === "failed" || e.scanError) return "failed";
    if (manifest && r?.status !== "copied") return "pending";
    return e.copyRoute === "review" ? "review" : "organized";
  };
  const cards = [
    ["all", "Total"],
    ["organized", manifest ? "Organized" : "To organize"],
    ["review", "Needs Review"],
    ["excluded", "Excluded"],
    ["failed", "Failed / unreadable"],
    ...(manifest ? [["pending", "Pending / other"]] : []),
  ];
  const visible = entries.filter(
    (e) =>
      (filter === "all" || group(e) === filter) &&
      `${e.path} ${destination(e)}`.toLowerCase().includes(query.toLowerCase()),
  );
  const shownPage = Math.min(
    page,
    Math.max(0, Math.ceil(visible.length / 50) - 1),
  );
  function patch(id: string, values: Partial<Entry>) {
    change(entries.map((e) => (e.id === id ? { ...e, ...values } : e)));
  }
  const organizeCount = included.filter(
    (e) => e.copyRoute === "organized",
  ).length;
  const reviewCount = included.length - organizeCount;
  const awaitingPlan = included.some((e) => e.status === "inventoried");
  return (
    <section className="batch-review">
      <div className="inventory-toolbar">
        <div>
          <h3>Your complete output plan</h3>
          <p>
            {entries.length} found · {included.length} included ·{" "}
            {entries.length - included.length} explicitly excluded
          </p>
        </div>
        <button
          className="button secondary"
          disabled={locked || !included.length}
          onClick={() => build()}
        >
          Build organization plan
        </button>
      </div>
      <p>
        All files are included by default. Acceptable plans go into category
        folders; uncertain, unsupported or unaccepted plans go unchanged into
        Needs Review. Uncheck a file only to deliberately exclude it.
      </p>
      <div className="count-cards" aria-label="Filter batch by outcome">
        {cards.map(([key, label]) => (
          <button
            key={key}
            aria-pressed={filter === key}
            onClick={() => {
              setFilter(key);
              setPage(0);
            }}
          >
            <strong>
              {key === "all"
                ? entries.length
                : entries.filter((e) => group(e) === key).length}
            </strong>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <p className="muted">
        Count buttons filter this list only. They never include or exclude
        files.
      </p>
      <div className="actions">
        <button
          disabled={locked}
          onClick={() => change(entries.map((e) => ({ ...e, approved: true })))}
        >
          Include all files
        </button>
        <button disabled={locked} onClick={() => build(true)}>
          Rebuild names and folders with current rules
        </button>
      </div>
      <p className="muted">
        Rebuild uses the Folder rules currently shown above. It resets manual
        name/category edits, keeps inclusion choices, and never changes
        originals.
      </p>
      <label>
        Find a file
        <input
          className="batch-search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search source or destination…"
        />
      </label>
      {errors.size > 0 && (
        <p className="warning" role="alert">
          {errors.size} destinations require correction before copying.
        </p>
      )}
      {!visible.length && (
        <p role="status" className="notice">
          No files in this view. Your copy selection has not changed.
        </p>
      )}
      <div className="review-list">
        {visible.slice(shownPage * 50, (shownPage + 1) * 50).map((e) => (
          <article className="review-row" key={e.id}>
            <div className="review-source">
              <input
                type="checkbox"
                aria-label={`Include ${e.path}`}
                checked={e.approved}
                disabled={locked}
                onChange={(event) =>
                  patch(e.id, { approved: event.target.checked })
                }
              />
              <div>
                <strong>{e.name}</strong>
                <p>{e.path}</p>
              </div>
              <span className="badge">
                {group(e) === "review"
                  ? "Needs Review"
                  : group(e) === "organized"
                    ? manifest
                      ? "Organized"
                      : "To organize"
                    : group(e)}
              </span>
            </div>
            <p className="output-path">→ {destination(e)}</p>
            {e.warning && (
              <p className="warning">
                {e.warning}
                {e.copyRoute === "review" &&
                  " Unchanged copy goes to Needs Review unless explicitly excluded."}
              </p>
            )}
            {resultByPath.get(`${e.path}\0${destination(e)}`)?.error && (
              <p className="warning">
                {resultByPath.get(`${e.path}\0${destination(e)}`)?.error}
              </p>
            )}
            {errors.get(e.id) && <p className="warning">{errors.get(e.id)}</p>}
            {e.status === "suggested" && (
              <details>
                <summary>Review proposed name and folder</summary>
                <p>{e.suggestion?.reason}</p>
                <p>{e.coverage}</p>
                <div className="edit-grid">
                  <label>
                    Suggested name
                    <input
                      value={e.title}
                      disabled={locked}
                      onChange={(event) =>
                        patch(e.id, {
                          title: event.target.value,
                          reviewAccepted: true,
                          keepForReview: false,
                        })
                      }
                    />
                  </label>
                  <label>
                    Category
                    <input
                      value={e.category}
                      disabled={locked}
                      onChange={(event) =>
                        patch(e.id, {
                          category: event.target.value,
                          reviewAccepted: true,
                          keepForReview: false,
                        })
                      }
                    />
                  </label>
                  <label>
                    Subfolder
                    <input
                      value={e.subcategory}
                      disabled={locked}
                      onChange={(event) =>
                        patch(e.id, {
                          subcategory: event.target.value,
                          reviewAccepted: true,
                          keepForReview: false,
                        })
                      }
                    />
                  </label>
                </div>
                <div className="actions">
                  <button
                    disabled={locked}
                    onClick={() =>
                      patch(e.id, {
                        reviewAccepted: true,
                        keepForReview: false,
                      })
                    }
                  >
                    Accept this category plan
                  </button>
                  <button
                    disabled={locked}
                    onClick={() =>
                      patch(e.id, {
                        reviewAccepted: false,
                        keepForReview: true,
                      })
                    }
                  >
                    Keep original in Needs Review
                  </button>
                </div>
              </details>
            )}
          </article>
        ))}
      </div>
      {visible.length > 50 && (
        <div className="actions">
          <button
            disabled={shownPage === 0}
            onClick={() => setPage(shownPage - 1)}
          >
            Previous files
          </button>
          <span>
            Showing {shownPage * 50 + 1}–
            {Math.min((shownPage + 1) * 50, visible.length)} of {visible.length}{" "}
            files. All included files are copied, not only this page.
          </span>
          <button
            disabled={(shownPage + 1) * 50 >= visible.length}
            onClick={() => setPage(shownPage + 1)}
          >
            Next files
          </button>
        </div>
      )}
      <div className="copy-bar">
        <span>
          {included.length} included · {organizeCount} category plans +{" "}
          {reviewCount} Needs Review · originals preserved
        </span>
        <button
          className="button"
          disabled={
            !canCopy ||
            !included.length ||
            locked ||
            errors.size > 0 ||
            scanBlocked ||
            awaitingPlan
          }
          onClick={copy}
        >
          Copy {included.length === entries.length ? "all " : ""}
          {included.length} files
        </button>
      </div>
      {awaitingPlan && (
        <p role="status">
          Build the organization plan before copying the new files.
        </p>
      )}
      {scanBlocked && (
        <p role="status">
          Review and acknowledge the incomplete scan warning above before
          copying known files.
        </p>
      )}
      {samples && (
        <p>
          Synthetic preview only. Add real files in a new batch to enable
          copying.
        </p>
      )}
    </section>
  );
}
