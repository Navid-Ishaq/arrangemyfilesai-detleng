import { suggest } from "../src/ollama";
import { documentSample } from "../src/document-sample";
const text =
  "Synthetic training assignment. Project planning covers scope, milestones, resource scheduling, risk registers and evaluation. Learners compare planning approaches and write a final project review.\n"
    .repeat(80)
    .slice(0, 14000);
for (const [label, input] of [
  ["long", text],
  ["sample", documentSample(text).text],
]) {
  const start = performance.now();
  try {
    const result = await suggest(input, undefined, (t) =>
      console.log(JSON.stringify({ label, characters: input.length, ...t })),
    );
    console.log(
      JSON.stringify({
        label,
        elapsedMs: Math.round(performance.now() - start),
        title: result.title,
        category: result.category,
      }),
    );
  } catch (e) {
    console.log(String(e));
  }
}
