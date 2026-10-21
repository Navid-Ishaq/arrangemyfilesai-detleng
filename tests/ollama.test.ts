import { afterEach, it, expect, vi } from "vitest";
import {
  models,
  suggest,
  LocalAIError,
  connectionMessage,
} from "../src/ollama";
afterEach(() => vi.unstubAllGlobals());
it("turns an opaque browser network/CORS failure into a local AI error", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
  );
  await expect(models()).rejects.toMatchObject({ code: "OLLAMA_UNREACHABLE" });
  expect(
    connectionMessage(
      "OLLAMA_UNREACHABLE",
      "https://arrangemyfilesai.detleng.com",
    ),
  ).toContain("OLLAMA_ORIGINS");
});
it("handles explicit origin rejection and never marks it ready", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("", { status: 403 })),
  );
  await expect(models()).rejects.toBeInstanceOf(LocalAIError);
});
it("validates the model list instead of assuming a valid response", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ error: "not a models list" })),
  );
  await expect(models()).rejects.toMatchObject({
    code: "OLLAMA_INVALID_RESPONSE",
  });
});
it("identifies invalid structured model content", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(Response.json({ message: { content: "not JSON" } })),
  );
  await expect(suggest("synthetic")).rejects.toMatchObject({
    code: "OLLAMA_INVALID_RESPONSE",
  });
});
it("keeps model missing separate from network failure", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("", { status: 404 })),
  );
  await expect(suggest("synthetic")).rejects.toMatchObject({
    code: "MODEL_MISSING",
  });
  expect(connectionMessage("MODEL_MISSING", "https://example.com")).toContain(
    "ollama pull qwen3:4b",
  );
});
it("preserves cancellation and identifies timeout", async () => {
  const controller = new AbortController();
  controller.abort(new DOMException("Timed out", "TimeoutError"));
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(controller.signal.reason));
  await expect(suggest("synthetic", controller.signal)).rejects.toMatchObject({
    code: "OLLAMA_TIMEOUT",
  });
});
