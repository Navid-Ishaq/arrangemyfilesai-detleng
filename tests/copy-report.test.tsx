import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CopyAudit } from "../src/CopyAudit";
import { parseSavedManifest, copySummary, type Manifest } from "../src/files";
const partial = (): Manifest => ({
  version: 1,
  session: ".arrangemyfiles-test",
  created: new Date().toISOString(),
  plan: Array.from({ length: 202 }, (_, i) => ({
    source: `source-${i}.txt`,
    destination: `Documents/file-${i}.txt`,
    approved: true,
    size: 1,
    lastModified: 1,
  })),
  results: Array.from({ length: 72 }, (_, i) => ({
    source: `source-${i}.txt`,
    destination: `Documents/file-${i}.txt`,
    status: "copied",
    sha256: "a".repeat(64),
  })),
});
describe("saved partial copy reports", () => {
  it("shows 72 of 202 as incomplete, with 130 unconfirmed files", () => {
    const manifest = parseSavedManifest(partial());
    expect(copySummary(manifest)).toMatchObject({
      approved: 202,
      copied: 72,
      failed: 0,
      pending: 130,
    });
    const html = renderToStaticMarkup(
      <CopyAudit manifest={manifest} disabled={false} />,
    );
    expect(html).toContain("Incomplete copy session");
    expect(html).toContain("130 pending / not recorded");
    expect(html).toContain("not confirmed copied");
  });
  it("rejects path traversal and unmatched result rows in imported manifests", () => {
    const unsafe = partial();
    unsafe.plan[0].destination = "../private.txt";
    expect(() => parseSavedManifest(unsafe)).toThrow();
    const wrong = partial();
    wrong.results[0].destination = "other.txt";
    expect(() => parseSavedManifest(wrong)).toThrow();
  });
  it("distinguishes failures from files with no recorded attempt", () => {
    const manifest = partial();
    manifest.results[0] = {
      ...manifest.results[0],
      status: "failed",
      sha256: undefined,
      error: "Read failed",
    };
    expect(copySummary(manifest)).toMatchObject({
      copied: 71,
      failed: 1,
      pending: 130,
    });
  });
});
