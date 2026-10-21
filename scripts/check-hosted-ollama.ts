import { models, suggest } from "../src/ollama";
const origin = "https://arrangemyfilesai.detleng.com";
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) =>
  nativeFetch(input, {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init?.headers)),
      Origin: origin,
    },
  });
const preflight = await nativeFetch("http://127.0.0.1:11434/api/chat", {
  method: "OPTIONS",
  headers: {
    Origin: origin,
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type",
  },
  signal: AbortSignal.timeout(8000),
});
console.log(
  "Production-origin POST preflight:",
  preflight.status,
  "allowed origin:",
  preflight.headers.get("access-control-allow-origin"),
);
if (
  !preflight.ok ||
  preflight.headers.get("access-control-allow-origin") !== origin
)
  throw new Error("Hosted origin not permitted.");
console.log(
  "Required model installed:",
  (await models()).some((m) => m.name === "qwen3:4b"),
);
console.log(
  "Validated synthetic inference with production Origin:",
  await suggest(
    "Synthetic test document. Project planning notes explain task scheduling, milestones, and risk management.",
  ),
);
console.log(
  "This verifies Ollama origin policy and inference, not browser Local Network Access permission.",
);
