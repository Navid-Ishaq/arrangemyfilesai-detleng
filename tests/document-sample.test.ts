import { expect, it } from "vitest";
import { documentSample, ANALYSIS_CHAR_LIMIT } from "../src/document-sample";
it("preserves short document evidence", () => {
  expect(documentSample("Project tasks and milestones")).toEqual({
    text: "Project tasks and milestones",
    sampled: false,
  });
});
it("bounds long inputs and includes beginning middle and end evidence", () => {
  const text = "START" + "x".repeat(6995) + "MIDDLE" + "y".repeat(6994) + "END";
  const sample = documentSample(text);
  expect(sample.sampled).toBe(true);
  expect(sample.text.length).toBeLessThanOrEqual(ANALYSIS_CHAR_LIMIT);
  for (const evidence of ["START", "MIDDLE", "END"])
    expect(sample.text).toContain(evidence);
});
