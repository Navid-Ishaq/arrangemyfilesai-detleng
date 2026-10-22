import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import {
  safeSegment,
  destination,
  validatePlan,
  uniqueApprovedNames,
  Entry,
} from "../src/domain";
import { suggestionSchema } from "../src/suggestion-schema";
import { createApp } from "../server/app";
const entry = (id: string, title: string): Entry => ({
  id,
  name: "old.PDF",
  path: "old.PDF",
  size: 1,
  file: new File(["a"], "old.PDF"),
  status: "suggested",
  approved: true,
  title,
  category: "Learning",
  subcategory: "",
});
describe("deterministic naming and approval", () => {
  it("resolves a bulk collision set without overwriting reserved names or changing approvals", () => {
    const entries = [
      entry("reserved", "Notes (2)"),
      ...Array.from({ length: 273 }, (_, i) => ({
        ...entry(String(i), i % 2 ? "notes" : "Notes"),
        path: `folder-${i}/old.PDF`,
      })),
    ];
    const fixed = uniqueApprovedNames(entries);
    expect(validatePlan(fixed).size).toBe(0);
    expect(fixed.every((e) => e.approved)).toBe(true);
    expect(fixed[0].title).toBe("Notes (2)");
    expect(new Set(fixed.map((e) => destination(e).toLowerCase())).size).toBe(
      274,
    );
    expect(uniqueApprovedNames(fixed)).toEqual(fixed);
    expect(entries[2].title).toBe("notes");
  });
  it("leaves unsupported files and invalid destinations blocked", () => {
    const fixed = uniqueApprovedNames([
      { ...entry("a", "name"), name: "image.jpg" },
      entry("b", ""),
    ]);
    expect(validatePlan(fixed).size).toBe(2);
  });
  it("preserves extension and removes unsafe path characters", () => {
    expect(destination(entry("1", "../A:B"))).toBe("Learning/.. A B.pdf");
    expect(safeSegment("CON")).toBe("_CON");
    expect(() => safeSegment("..")).toThrow();
  });
  it("blocks case-insensitive conflicts", () => {
    expect(validatePlan([entry("a", "Notes"), entry("b", "notes")]).size).toBe(
      2,
    );
  });
  it("does not approve unread files", () => {
    expect(
      validatePlan([{ ...entry("a", "Notes"), status: "inventoried" }]).size,
    ).toBe(1);
  });
  it("ignores rejected files and limits segment length", () => {
    expect(
      validatePlan([
        { ...entry("a", "Notes"), approved: false },
        entry("b", "notes"),
      ]).size,
    ).toBe(0);
    expect(safeSegment("a".repeat(200))).toHaveLength(90);
  });
  it("rejects malformed model output", () => {
    expect(
      suggestionSchema.safeParse({ title: "a", category: "x", reason: "x" })
        .success,
    ).toBe(false);
  });
});
describe("Guide privacy and service boundaries", () => {
  it("rejects extra inventory/context fields before inference", async () => {
    const fn = vi.fn();
    const app = createApp(fn, true);
    const res = await request(app)
      .post("/api/guide")
      .send({
        message: "Help",
        context: { stage: "review", error: "NONE", filenames: ["private.pdf"] },
      });
    expect(res.status).toBe(400);
    expect(fn).not.toHaveBeenCalled();
  });
  it("allows only curated action responses", async () => {
    const res = await request(
      createApp(async () => ({ reply: "Hello", action: "delete-files" }), true),
    )
      .post("/api/guide")
      .send({ message: "Help" });
    expect(res.status).toBe(502);
  });
  it("works with valid allowlisted context", async () => {
    const fn = vi.fn(async () => ({
      reply: "Open setup.",
      action: "open-setup",
    }));
    const res = await request(createApp(fn, true))
      .post("/api/guide")
      .send({
        message: "Help",
        context: { stage: "setup", error: "MODEL_MISSING" },
      });
    expect(res.status).toBe(200);
    expect(fn).toHaveBeenCalledWith(
      "Help",
      { stage: "setup", error: "MODEL_MISSING" },
      undefined,
    );
  });
  it("rejects unapproved web origins", async () => {
    const res = await request(createApp(vi.fn(), true))
      .post("/api/guide")
      .set("Origin", "https://evil.example")
      .send({ message: "Help" });
    expect(res.status).toBe(403);
  });
  it("returns honest unavailable status without credentials", async () => {
    const res = await request(createApp(vi.fn(), false))
      .post("/api/guide")
      .send({ message: "Help" });
    expect(res.status).toBe(503);
  });
  it("enforces input length", async () => {
    const res = await request(createApp(vi.fn(), true))
      .post("/api/guide")
      .send({ message: "x".repeat(2501) });
    expect(res.status).toBe(400);
  });
});
