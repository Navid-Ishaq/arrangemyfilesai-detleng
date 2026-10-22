import { useEffect, useState } from "react";
export type RunProgress = {
  started: number;
  total: number;
  completed: number;
  failed: number;
  cached: number;
  stage: string;
  fileStarted: number;
  fileNumber: number;
  durations: number[];
  active: boolean;
};
export function ProcessingPanel({
  run,
  cancel,
}: {
  run: RunProgress;
  cancel?: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!run.active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [run.active, run.started]);
  const elapsed = Math.max(0, Math.floor((now - run.started) / 1000));
  const fileElapsed = Math.max(0, Math.floor((now - run.fileStarted) / 1000));
  return (
    <section
      className="processing-panel"
      aria-label="Local processing progress"
    >
      <div className="processing-top">
        <strong>
          {run.active
            ? run.stage
            : run.completed < run.total
              ? "Planning stopped"
              : "Organization plan finished"}
        </strong>
        {run.active && cancel && (
          <button className="button secondary" onClick={cancel}>
            Cancel planning
          </button>
        )}
      </div>
      <p>
        {elapsed} seconds elapsed · {run.completed} of {run.total} processed ·{" "}
        {run.failed} need attention · {run.cached} reused
      </p>
      <progress
        value={run.completed}
        max={Math.max(1, run.total)}
        aria-label="Files processed"
      />
      {run.active && (
        <p>
          Current file {run.fileNumber} of {run.total} · {fileElapsed} seconds
          on this file. Processing stays on your computer.
        </p>
      )}
      <small>
        {run.active
          ? "Local document readers build a plan without AI requests. A reader that exceeds 8 seconds is stopped so other files can continue."
          : "Completed suggestions remain available for your review. No originals were changed."}
      </small>
    </section>
  );
}
