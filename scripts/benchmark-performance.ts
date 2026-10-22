import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { suggest, type InferenceTiming, models } from "../src/ollama";
import { AnalysisCache } from "../src/analysis-engine";
const files = [
  "Project tasks and planning milestones.",
  "Python data cleaning with pandas.",
  "Project tasks and planning milestones.",
  "Python data cleaning with pandas.",
  "Project tasks and planning milestones.",
  "Python data cleaning with pandas.",
].map((text, i) => new File([text], `synthetic-${i}.txt`));
console.log("Synthetic local-only benchmark; no user files or copying.");
await models();
const report: {
  mode: string;
  elapsedMs: number;
  calls: number;
  reused: number;
  timings: InferenceTiming[];
}[] = [];
for (const mode of ["baseline", "optimized"]) {
  await suggest("Synthetic warm-up: project planning tasks and milestones.");
  const cache = new AnalysisCache();
  const timings: InferenceTiming[] = [];
  let calls = 0,
    reused = 0;
  const started = performance.now();
  for (const file of files) {
    const produce = async () => {
      calls++;
      return {
        suggestion: await suggest(
          await file.text(),
          undefined,
          undefined,
          (t) => timings.push(t),
        ),
      };
    };
    if (mode === "baseline") await produce();
    else if ((await cache.run(file, produce)).cached) reused++;
    console.log(`${mode}: ${calls} inference calls; ${reused} reused`);
  }
  report.push({
    mode,
    elapsedMs: Math.round(performance.now() - started),
    calls,
    reused,
    timings,
  });
}
await mkdir("work/benchmarks", { recursive: true });
await writeFile(
  "work/benchmarks/performance.json",
  JSON.stringify({ synthetic: true, report }, null, 2),
);
console.log(JSON.stringify(report, null, 2));
