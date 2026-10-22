import { expect, it, vi } from "vitest";
vi.mock("../src/extract", () => ({
  extract: async () => ({
    text: "Study planning headings. ".repeat(1000),
    hints: ["Study planning notes"],
    coverage: "First 2 PDF page(s) of 2500",
    warning: "Partial content",
  }),
}));
import { AnalysisCache, analyzeFile } from "../src/analysis-engine";
it("creates a title from heading evidence without calling any AI service", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  try {
    const result = await analyzeFile(
      new File(["synthetic"], "scan.pdf"),
      new AnalysisCache(),
      new AbortController().signal,
      () => {},
    );
    expect(result.value.suggestion.title).toBe("Study planning notes");
    expect(result.value.coverage).toContain("First 2 PDF page(s) of 2500");
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
