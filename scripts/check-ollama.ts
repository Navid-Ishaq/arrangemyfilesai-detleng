import { suggest, models } from "../src/ollama";
console.log(
  "Installed model present:",
  (await models()).some((m) => m.name === "qwen3:4b"),
);
console.log(
  "Synthetic real inference:",
  await suggest(
    "Course notes on Python data wrangling with pandas. Topics include handling missing values, removing duplicate rows, and joining datasets.",
  ),
);
