import { type FolderRule } from "./naming";
import type { AnalysisResult } from "./analysis-engine";
// One reusable parser worker; timeout/cancel terminates its computation, not merely its UI timer.
let worker: Worker | undefined;
export function stopPlanner() {
  worker?.terminate();
  worker = undefined;
}
export function workerPlan(
  file: File,
  rules: FolderRule[],
  signal: AbortSignal,
): Promise<AnalysisResult> {
  signal.throwIfAborted();
  worker ||= new Worker(new URL("./planner.worker.ts", import.meta.url), {
    type: "module",
  });
  const active = worker;
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      active.onmessage = null;
      active.onerror = null;
    };
    const cancel = () => {
      cleanup();
      stopPlanner();
      reject(signal.reason || new DOMException("Cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      cleanup();
      stopPlanner();
      reject(
        new Error(
          "PARSER_TIMEOUT: File reading exceeded 8 seconds. Other files can continue; retry this file separately.",
        ),
      );
    }, 8000);
    signal.addEventListener("abort", cancel, { once: true });
    active.onerror = () => {
      cleanup();
      stopPlanner();
      reject(
        new Error(
          "PARSER_FAILED: Could not read this document. Retry separately.",
        ),
      );
    };
    active.onmessage = (event) => {
      if (event.data?.type !== "amf-plan") return;
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.value);
    };
    active.postMessage({ type: "amf-plan", file, rules });
  });
}
