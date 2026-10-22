import { expect, it, vi, afterEach } from "vitest";
import { AnalysisCache, analysisQueue } from "../src/analysis-engine";
import type { Entry } from "../src/domain";
const result = {
  suggestion: {
    title: "Planning notes",
    category: "Projects",
    subcategory: "",
    reason: "Actual notes",
    needsReview: false,
  },
};
afterEach(() => vi.unstubAllGlobals());
it("reuses identical file snapshots without sharing decisions across different filenames", async () => {
  const cache = new AnalysisCache(),
    produce = vi.fn(async () => result);
  const file = new File(["A"], "Planning notes.txt");
  await cache.run(file, produce);
  expect((await cache.run(file, produce)).cached).toBe(true);
  await cache.run(new File(["A"], "Invoice.txt"), produce);
  expect(produce).toHaveBeenCalledTimes(2);
});
it("changed content, analysis policy and failed calls are not incorrectly reused", async () => {
  const cache = new AnalysisCache();
  const infer = vi.fn(async () => result);
  const file = new File(["A"], "a.png");
  await cache.run(file, infer);
  await cache.run(file, infer, "full-detail");
  await cache.run(new File(["B"], "a.png"), infer);
  expect(infer).toHaveBeenCalledTimes(3);
  const fail = vi.fn(async () => {
    throw new Error("model failure");
  });
  for (let i = 0; i < 2; i++)
    await expect(
      cache.run(new File(["bad"], "bad.txt"), fail),
    ).rejects.toThrow();
  expect(fail).toHaveBeenCalledTimes(2);
  cache.clear();
  await cache.run(file, infer);
  expect(infer).toHaveBeenCalledTimes(4);
});
it("preserves edits/approvals on successes and groups pending model jobs", () => {
  const entries = [
    { id: "a", name: "a.png", status: "inventoried" },
    { id: "b", name: "b.txt", status: "needs attention" },
    {
      id: "c",
      name: "c.txt",
      status: "suggested",
      approved: true,
      title: "Owner edit",
    },
  ] as Entry[];
  expect(analysisQueue(entries).map((e) => e.id)).toEqual(["a", "b"]);
  expect(entries[2].title).toBe("Owner edit");
  expect(entries[2].approved).toBe(true);
});
it("returns detached cached values so later edits cannot poison another file", async () => {
  const cache = new AnalysisCache();
  const file = new File(["A"], "a.txt");
  const first = await cache.run(file, async () => structuredClone(result));
  first.value.suggestion.title = "Edited";
  expect(
    (await cache.run(file, async () => result)).value.suggestion.title,
  ).toBe("Planning notes");
});
