import { expect, it, vi } from "vitest";
import { supported, extension } from "../src/domain";
import { AnalysisCache, analyzeFile } from "../src/analysis-engine";
import { readFileSync } from "node:fs";
it.each(["photo.jpg", "scan.JPEG", "page.PNG"])(
  "rejects %s before decoding or inference",
  async (name) => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    try {
      expect(supported.has(extension(name))).toBe(false);
      const file = new File(["synthetic bytes"], name);
      const original = await file.text();
      await expect(
        analyzeFile(
          file,
          new AnalysisCache(),
          new AbortController().signal,
          () => {},
        ),
      ).rejects.toThrow("Not supported in this release—original preserved");
      expect(fetcher).not.toHaveBeenCalled();
      expect(await file.text()).toBe(original);
    } finally {
      vi.unstubAllGlobals();
    }
  },
);
it("retains supported document formats and removes vision UI and transport", () => {
  expect([...supported]).toEqual([
    "txt",
    "md",
    "csv",
    "docx",
    "pdf",
    "xlsx",
    "pptx",
  ]);
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const transport = readFileSync(
    new URL("../src/ollama.ts", import.meta.url),
    "utf8",
  );
  expect(app).toContain("Not supported in this release—original preserved");
  expect(app).not.toContain("Full-detail images");
  expect(app).not.toContain("qwen3-vl");
  expect(transport).not.toContain("images:");
  expect(transport).not.toContain("VISION_MODEL");
});
