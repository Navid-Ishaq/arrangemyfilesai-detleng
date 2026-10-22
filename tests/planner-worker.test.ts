import { afterEach, expect, it, vi } from "vitest";
import { workerPlan, stopPlanner } from "../src/planner-worker-client";
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  terminated = false;
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage() {}
  terminate() {
    this.terminated = true;
  }
}
afterEach(() => {
  stopPlanner();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  FakeWorker.instances = [];
});
it("terminates a stuck reader at its deadline and allows the next file to start", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("Worker", FakeWorker);
  const failed = workerPlan(
    new File(["x"], "0.docx"),
    [],
    new AbortController().signal,
  );
  const assertion = expect(failed).rejects.toThrow("PARSER_TIMEOUT");
  await vi.advanceTimersByTimeAsync(8000);
  await assertion;
  expect(FakeWorker.instances[0].terminated).toBe(true);
  const next = workerPlan(
    new File(["y"], "1.docx"),
    [],
    new AbortController().signal,
  );
  expect(FakeWorker.instances).toHaveLength(2);
  FakeWorker.instances[1].onmessage?.({
    data: { type: "amf-plan", value: { suggestion: { title: "next" } } },
  });
  expect((await next).suggestion.title).toBe("next");
});
it("cancel terminates the actual reader rather than leaving it running", async () => {
  vi.stubGlobal("Worker", FakeWorker);
  const controller = new AbortController();
  const pending = workerPlan(new File(["x"], "0.pdf"), [], controller.signal);
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(FakeWorker.instances[0].terminated).toBe(true);
});
it("ignores unrelated worker messages instead of accepting an empty result", async () => {
  vi.stubGlobal("Worker", FakeWorker);
  const pending = workerPlan(
    new File(["x"], "0.pdf"),
    [],
    new AbortController().signal,
  );
  FakeWorker.instances[0].onmessage?.({ data: { type: "ready" } });
  FakeWorker.instances[0].onmessage?.({
    data: { type: "amf-plan", value: { suggestion: { title: "valid" } } },
  });
  expect((await pending).suggestion.title).toBe("valid");
});
