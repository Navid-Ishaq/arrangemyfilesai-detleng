import { expect, it } from "vitest";
import { analysisWarning } from "../src/analysis-errors";
it("distinguishes stale parser chunks from Ollama connection failures", () => {
  expect(
    analysisWarning(
      new TypeError(
        "Failed to fetch dynamically imported module: https://example.com/assets/pdf-old.js",
      ),
    ),
  ).toContain("APP_UPDATE_REQUIRED");
});
it("preserves extraction diagnostics rather than calling every fetch error a local AI error", () => {
  expect(analysisWarning(new Error("EMPTY: No readable text found."))).toBe(
    "EMPTY: No readable text found.",
  );
  expect(
    analysisWarning(new TypeError("Failed to fetch PDF worker")),
  ).not.toContain("Local AI connection failed");
});
