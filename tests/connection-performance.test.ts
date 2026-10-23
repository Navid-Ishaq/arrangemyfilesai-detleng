import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("runs the organizer independently of AI connections", () => {
  const source = readFileSync(
    new URL("../src/App.tsx", import.meta.url),
    "utf8",
  );
  const engine = readFileSync(
    new URL("../src/analysis-engine.ts", import.meta.url),
    "utf8",
  );
  expect(source).not.toContain('from "./ollama"');
  expect(source).not.toContain("checkAI()");
  expect(source).toContain("BatchReview");
  expect(source).toContain('aria-label="Add files"');
  expect(engine).not.toContain("await suggest(");
});
