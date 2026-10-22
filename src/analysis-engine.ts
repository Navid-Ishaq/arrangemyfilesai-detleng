import {
  extension,
  supported,
  MAX_BYTES,
  type Entry,
  type Suggestion,
} from "./domain";
import { workerPlan } from "./planner-worker-client";
import { DEFAULT_RULES, parseRules, type FolderRule } from "./naming";
export type AnalysisResult = {
  suggestion: Suggestion;
  warning?: string;
  coverage?: string;
};
// Object-identity cache scoped to the current inventory. Filename/rules affect decisions.
export class AnalysisCache {
  private values = new WeakMap<File, Map<string, AnalysisResult>>();
  clear() {
    this.values = new WeakMap();
  }
  async run(
    file: File,
    produce: () => Promise<AnalysisResult>,
    policy = "default",
  ) {
    if (file.size > MAX_BYTES)
      throw new Error("OVERSIZED: Maximum file size is 20 MB.");
    const key = `${file.name}:${policy}`;
    const existing = this.values.get(file)?.get(key);
    if (existing) return { value: structuredClone(existing), cached: true };
    const value = await produce();
    const row = this.values.get(file) || new Map<string, AnalysisResult>();
    if (row.size >= 4) row.delete(row.keys().next().value!);
    row.set(key, structuredClone(value));
    this.values.set(file, row);
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
  rules: FolderRule[] = parseRules(DEFAULT_RULES),
) {
  signal.throwIfAborted();
  if (!supported.has(extension(file.name)))
    throw new Error("Not supported in this release—original preserved");
  stage("Building a local naming and folder plan");
  return cache.run(
    file,
    async () => {
      const value =
        typeof Worker !== "undefined"
          ? await workerPlan(file, rules, signal)
          : await (await import("./planner")).planDocument(file, rules);
      signal.throwIfAborted();
      return value;
    },
    JSON.stringify(rules),
  );
}
