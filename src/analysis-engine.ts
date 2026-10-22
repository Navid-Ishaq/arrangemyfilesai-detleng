import { documentSample } from "./document-sample";
import {
  extension,
  supported,
  MAX_BYTES,
  type Entry,
  type Suggestion,
} from "./domain";
import { extract } from "./extract";
import { suggest, MODEL } from "./ollama";
export type AnalysisResult = { suggestion: Suggestion; warning?: string };
// Inventory-scoped, bounded memory only. No private content or results persisted.
export class AnalysisCache {
  private values = new Map<string, AnalysisResult>();
  clear() {
    this.values.clear();
  }
  async run(
    file: File,
    produce: () => Promise<AnalysisResult>,
    policy = "balanced",
  ): Promise<{ value: AnalysisResult; cached: boolean }> {
    if (file.size > MAX_BYTES)
      throw new Error("OVERSIZED: Maximum file size is 20 MB.");
    const digest = await crypto.subtle.digest(
      "SHA-256",
      await file.arrayBuffer(),
    );
    const hash = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    const key = `${MODEL}:v3:${extension(file.name)}:${policy}:${hash}`;
    const existing = this.values.get(key);
    if (existing) return { value: structuredClone(existing), cached: true };
    const value = await produce(); // failed analyses are never cached
    if (this.values.size >= 64)
      this.values.delete(this.values.keys().next().value!);
    this.values.set(key, structuredClone(value));
    return { value, cached: false };
  }
}
export function analysisQueue(entries: Entry[]) {
  return entries.filter((e) => e.status !== "suggested");
}
export async function analyzeFile(
  file: File,
  cache: AnalysisCache,
  signal: AbortSignal,
  stage: (value: string) => void,
) {
  if (!supported.has(extension(file.name)))
    throw new Error("Not supported in this release—original preserved");
  stage("Checking for an identical file");
  return cache.run(
    file,
    async () => {
      signal.throwIfAborted();
      stage("Reading document locally");
      const content = await extract(file);
      signal.throwIfAborted();
      const sample = documentSample(content.text);
      stage(
        `Analyzing ${sample.text.length.toLocaleString()} characters locally`,
      );
      return {
        suggestion: await suggest(sample.text, signal),
        warning: sample.sampled
          ? "Representative excerpts analyzed (beginning, middle and end of extracted text). Review before approving; the full document was not analyzed."
          : content.warning,
      };
    },
    "documents",
  );
}
