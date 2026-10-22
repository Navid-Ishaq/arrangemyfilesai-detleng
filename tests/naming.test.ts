import { expect, it, vi } from "vitest";
import {
  propose,
  parseRules,
  DEFAULT_RULES,
  meaningfulName,
} from "../src/naming";
import { planDocument } from "../src/planner";
import { zipSync, strToU8 } from "fflate";
const rules = parseRules(DEFAULT_RULES);
it("preserves descriptive filenames and categorizes without reading when a rule matches", async () => {
  const file = new File(
    ["not a readable docx"],
    "Future Authentication Architecture.docx",
  );
  const spy = vi.spyOn(file, "arrayBuffer");
  const result = await planDocument(file, rules);
  expect(result.suggestion.title).toBe("Future Authentication Architecture");
  expect(result.suggestion.category).toBe("Projects");
  expect(spy).not.toHaveBeenCalled();
});
it("takes a generic filename's title from heading evidence, not invented facts", () => {
  const s = propose("0.docx", "Body", ["Quantum Physics Lecture"], rules);
  expect(s.title).toBe("Quantum Physics Lecture");
  expect(s.category).toBe("Study & Learning");
});
it("handles missing title by preserving original name and exposing review", () => {
  const s = propose("scan1.pdf", "", [], rules);
  expect(s.title).toBe("scan1");
  expect(s.needsReview).toBe(true);
});
it("resolves rule ties predictably and does not run keywords as regex", () => {
  const custom = parseRules("Alpha: a+b\nBeta: invoice");
  const s = propose("file.txt", "a+b invoice", [], custom);
  expect(s.category).toBe("Alpha");
  expect(s.needsReview).toBe(true);
  expect(propose("file.txt", "aaab", [], custom).category).toBe("Documents");
});
it("validates custom rule inputs", () => {
  for (const value of [
    "missing colon",
    "../bad: x",
    "Finance:",
    "X: " + "x".repeat(61),
  ])
    expect(() => parseRules(value)).toThrow();
});
it("extracts Word title styles and decodes XML entities", async () => {
  const bytes = zipSync({
    "word/document.xml": strToU8(
      '<w:document><w:body><w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Biology &amp; Chemistry Lecture</w:t></w:r></w:p><w:p><w:r><w:t>Course study notes</w:t></w:r></w:p></w:body></w:document>',
    ),
  });
  const result = await planDocument(new File([bytes], "0.docx"), rules);
  expect(result.suggestion.title).toBe("Biology & Chemistry Lecture");
  expect(result.warning).toBeUndefined();
});
it("rejects generic metadata titles and preserves meaningful names", () => {
  expect(propose("0.docx", "", ["Microsoft Word"], rules).title).toBe("0");
  expect(meaningfulName("report_final_v3.docx")).toBe(false);
  expect(meaningfulName("Climate Research 2026.pdf")).toBe(true);
});
it("keeps readable or corrupt document failures reviewable without fabricated renames", async () => {
  const result = await planDocument(new File(["badzip"], "0.docx"), rules);
  expect(result.suggestion.title).toBe("0");
  expect(result.warning).toContain("Original name retained");
});
