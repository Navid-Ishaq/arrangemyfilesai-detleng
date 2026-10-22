import {
  extension,
  isImage,
  MAX_BYTES,
  type Entry,
  type Suggestion,
} from "./domain";
import { extract } from "./extract";
import { suggest, MODEL, VISION_MODEL } from "./ollama";
import { suggestImage } from "./images";
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
    const key = `${isImage(file.name) ? VISION_MODEL : MODEL}:v2:${extension(file.name)}:${policy}:${hash}`;
    const existing = this.values.get(key);
    if (existing) return { value: structuredClone(existing), cached: true };
    const value = await produce(); // failures and uncertain images are never cached
    if (this.values.size >= 64)
      this.values.delete(this.values.keys().next().value!);
    this.values.set(key, structuredClone(value));
    return { value, cached: false };
  }
}
export function analysisQueue(entries: Entry[], retryImages = false) {
  // Preserve reviewed successes. Group pending work to avoid repeated model swaps.
  return entries
    .filter((e) => (retryImages ? isImage(e.name) : e.status !== "suggested"))
    .sort((a, b) => Number(isImage(a.name)) - Number(isImage(b.name)));
}
export async function analyzeFile(
  file: File,
  cache: AnalysisCache,
  signal: AbortSignal,
  stage: (value: string) => void,
  fullDetail = false,
) {
  stage("Checking for an identical file");
  return cache.run(
    file,
    async () => {
      signal.throwIfAborted();
      if (isImage(file.name))
        return {
          suggestion: await suggestImage(file, signal, stage, fullDetail),
        };
      stage("Reading document locally");
      const content = await extract(file);
      signal.throwIfAborted();
      stage("Analyzing document locally");
      return {
        suggestion: await suggest(content.text, signal),
        warning: content.warning,
      };
    },
    fullDetail ? "full-detail" : "balanced",
  );
}
