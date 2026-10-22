import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("does not run a full vision inference on connection or label installation as verified", () => {
  const source = readFileSync(
    new URL("../src/App.tsx", import.meta.url),
    "utf8",
  );
  const connection = source.slice(
    source.indexOf("async function checkAI()"),
    source.indexOf("async function choose()"),
  );
  expect(connection).not.toContain("visionProbe");
  expect(connection).not.toContain("suggestImage");
  expect(connection).not.toContain("await suggest(");
  expect(connection).not.toContain("setVisionVerified(true)");
});
