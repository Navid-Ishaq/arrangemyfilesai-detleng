import { expect, it, vi } from "vitest";
const infer = vi.hoisted(() =>
  vi.fn(async (_text: string, _signal?: AbortSignal) => ({
    title: "Study planning notes",
    category: "Education",
    subcategory: "",
    reason: "Opening headings describe planning",
    needsReview: true,
  })),
);
vi.mock("../src/ollama", () => ({ MODEL: "qwen3:4b", suggest: infer }));
vi.mock("../src/extract", () => ({
  extract: async () => ({
    text: "Study planning headings. ".repeat(1000),
    coverage: "First 2 PDF page(s) of 2500",
    warning: "Partial content",
  }),
}));
import { AnalysisCache, analyzeFile } from "../src/analysis-engine";
it("keeps a best-effort suggestion and coverage reminder with bounded opening input", async () => {
  const result = await analyzeFile(
    new File(["synthetic"], "study.pdf"),
    new AnalysisCache(),
    new AbortController().signal,
    () => {},
  );
  expect(infer.mock.calls[0][0].length).toBeLessThanOrEqual(3600);
  expect(result.value.suggestion.title).toBe("Study planning notes");
  expect(result.value.coverage).toContain("First 2 PDF page(s) of 2500");
  expect(result.value.warning).toContain("please review");
});

