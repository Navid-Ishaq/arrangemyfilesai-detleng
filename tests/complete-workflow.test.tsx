import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  completePlan,
  validatePlan,
  workflowComplete,
  destination,
  type Entry,
} from "../src/domain";
import { fileEntry, mergeSelection } from "../src/drop-files";
import { BatchReview } from "../src/BatchReview";
const entry = (id: string, warning?: string): Entry => ({
  ...fileEntry(new File(["Study notes"], "notes.txt")),
  id,
  path: `${id}/notes.txt`,
  status: "suggested",
  approved: true,
  title: "Biology study",
  category: "Learning",
  warning,
});
describe("complete batch planning", () => {
  it("accounts for all 131 files as 83 organized and 48 Needs Review with no silent exclusions", () => {
    const input = Array.from({ length: 131 }, (_, i) => ({
      ...entry(String(i), i >= 83 ? "Review needed" : undefined),
      ...(i >= 121
        ? { name: "photo.jpg", path: `${i}/photo.jpg`, status: "unsupported" }
        : {}),
    }));
    const planned = completePlan(input);
    expect(planned.filter((e) => e.approved)).toHaveLength(131);
    expect(planned.filter((e) => e.copyRoute === "organized")).toHaveLength(83);
    expect(planned.filter((e) => e.copyRoute === "review")).toHaveLength(48);
    expect(validatePlan(planned).size).toBe(0);
    expect(new Set(planned.map(destination)).size).toBe(131);
    const html = renderToStaticMarkup(
      <BatchReview
        entries={planned}
        busy={false}
        canCopy={true}
        scanBlocked={false}
        samples={false}
        change={() => {}}
        build={() => {}}
        copy={() => {}}
      />,
    );
    expect(html).toContain("Copy all 131 files");
    expect(html).toContain("Needs Review");
  });
  it("never marks copying complete while results are pending, failed or input is unscanned", () => {
    const entries = completePlan([entry("a"), entry("b")]);
    expect(workflowComplete(4, true, entries, [{ status: "copied" }])).toBe(
      false,
    );
    expect(
      workflowComplete(4, true, entries, [
        { status: "copied" },
        { status: "failed" },
      ]),
    ).toBe(false);
    expect(
      workflowComplete(
        4,
        true,
        entries,
        [{ status: "copied" }, { status: "copied" }],
        true,
      ),
    ).toBe(false);
    expect(
      workflowComplete(4, true, entries, [
        { status: "copied" },
        { status: "copied" },
      ]),
    ).toBe(true);
  });
  it("reserves existing numbered names before resolving new collisions", () => {
    const planned = completePlan([
      entry("a"),
      entry("b"),
      { ...entry("c"), title: "Biology study (2)" },
    ]);
    expect(planned.map(destination)).toEqual([
      "Learning/Biology study.txt",
      "Learning/Biology study (3).txt",
      "Learning/Biology study (2).txt",
    ]);
  });
  it("keeps explicit exclusion separate from accepting a warned category plan", () => {
    const planned = completePlan([
      { ...entry("a", "Ambiguous"), reviewAccepted: true },
      { ...entry("b"), keepForReview: true },
      { ...entry("c"), approved: false },
    ]);
    expect(planned.map((e) => [e.approved, e.copyRoute])).toEqual([
      [true, "organized"],
      [true, "review"],
      [false, "organized"],
    ]);
    expect(destination(planned[1])).toBe("Needs Review/b/notes.txt");
  });
  it("adds multiple selections without resetting previous edits or exclusions", async () => {
    const original = { ...entry("a"), title: "Edited name", approved: false };
    const second = fileEntry(new File(["Other"], "notes.txt"));
    const merged = await mergeSelection([original], {
      entries: [second],
      limited: false,
    });
    expect(merged.entries).toHaveLength(2);
    expect(merged.entries[0]).toBe(original);
    expect(merged.entries[1].approved).toBe(true);
    const again = await mergeSelection(merged.entries, {
      entries: [second],
      limited: false,
    });
    expect(again.entries).toHaveLength(2);
    expect(again.duplicates).toBe(1);
  });
  it("reports additions beyond the combined limit without replacing the current batch", async () => {
    const full = Array.from({ length: 1000 }, (_, i) => entry(String(i)));
    const result = await mergeSelection(full, {
      entries: [entry("extra")],
      limited: false,
    });
    expect(result.entries).toHaveLength(1000);
    expect(result.issues[0].reason).toContain("limit");
  });
});
