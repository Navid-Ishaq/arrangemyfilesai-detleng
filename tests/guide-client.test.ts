import { it, expect } from "vitest";
import { guideEndpoint } from "../src/guide-client";
it("does not send chat to static hosting when production is unconfigured", () => {
  expect(guideEndpoint(undefined, false)).toBeUndefined();
});
it("does not target a development localhost API from production", () => {
  expect(guideEndpoint("http://127.0.0.1:3001", false)).toBeUndefined();
  expect(guideEndpoint(undefined, true)).toBe("http://127.0.0.1:3001");
});
it("allows an explicit HTTPS Guide backend", () => {
  expect(guideEndpoint("https://guide.example/", false)).toBe(
    "https://guide.example",
  );
});
it("rejects credentials, query parameters and insecure remote endpoints", () => {
  expect(guideEndpoint("https://key@example.com", false)).toBeUndefined();
  expect(
    guideEndpoint("https://example.com?key=secret", false),
  ).toBeUndefined();
  expect(guideEndpoint("http://example.com", true)).toBeUndefined();
});
