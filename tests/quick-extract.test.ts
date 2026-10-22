import { expect, it, vi } from "vitest";
const pages = vi.hoisted(() =>
  vi.fn(async (n: number) => ({
    getTextContent: async () => ({
      items: [{ str: `Opening page ${n} study planning notes` }],
    }),
  })),
);
const destroy = vi.hoisted(() => vi.fn());
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: () => ({
    promise: Promise.resolve({ numPages: 2500, getPage: pages }),
    destroy,
  }),
}));
import { extract } from "../src/extract";
it("reads only the first two pages of a 2500-page PDF", async () => {
  const result = await extract(new File(["synthetic mock pdf"], "study.pdf"));
  expect(pages.mock.calls.map((c) => c[0])).toEqual([1, 2]);
  expect(result.coverage).toContain("First 2 PDF page(s) of 2500");
  expect(result.text).toContain("Opening page 2");
  expect(destroy).toHaveBeenCalled();
});
