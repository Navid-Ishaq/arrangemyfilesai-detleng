import { expect, it, vi, afterEach } from "vitest";
import { captureDrop } from "../src/drop-files";
const inventoryMock = vi.hoisted(() => vi.fn());
vi.mock("../src/files", () => ({ inventory: inventoryMock }));
afterEach(() => vi.clearAllMocks());
const data = (items: unknown[], files: File[] = []) =>
  ({ items, files }) as unknown as DataTransfer;
it("captures every handle synchronously before reading any async result", async () => {
  const calls: string[] = [];
  const items = ["a.txt", "b.txt"].map((name) => ({
    kind: "file",
    getAsFileSystemHandle: () => {
      calls.push(name);
      return Promise.resolve({
        kind: "file",
        getFile: async () => new File(["notes"], name),
      });
    },
  }));
  const read = captureDrop(data(items));
  expect(calls).toEqual(["a.txt", "b.txt"]);
  const result = await read();
  expect(result.entries.map((e) => e.name)).toEqual(["a.txt", "b.txt"]);
  expect(
    result.entries.every((e) => !e.approved && e.status === "inventoried"),
  ).toBe(true);
});
it("retains a single directory handle for safe folder copy validation", async () => {
  const source = { kind: "directory", name: "Study" };
  inventoryMock.mockResolvedValue({ entries: [], limited: false });
  const result = await captureDrop(
    data([
      { kind: "file", getAsFileSystemHandle: () => Promise.resolve(source) },
    ]),
  )();
  expect(result.source).toBe(source);
  expect(inventoryMock).toHaveBeenCalledWith(source);
});
it("supports fallback individual files without filesystem handles", async () => {
  const file = new File(["opening notes"], "notes.txt");
  const result = await captureDrop(
    data([{ kind: "file", getAsFile: () => file }]),
  )();
  expect(result.entries[0].file).toBe(file);
  expect(result.source).toBeUndefined();
});
it("reports unsupported folder drops instead of pretending they were files", () => {
  expect(() =>
    captureDrop(
      data([{ kind: "file", webkitGetAsEntry: () => ({ isDirectory: true }) }]),
    ),
  ).toThrow("Use Choose a folder");
});
it("caps plain file drops at 1000 and reports the limit", async () => {
  const files = Array.from(
    { length: 1001 },
    (_, i) => new File(["text"], `${i}.txt`),
  );
  const result = await captureDrop(data([], files))();
  expect(result.entries).toHaveLength(1000);
  expect(result.limited).toBe(true);
});
it("does not convert an unreadable dropped item into a guessed document", async () => {
  await expect(
    captureDrop(
      data([
        { kind: "file", getAsFileSystemHandle: () => Promise.resolve(null) },
      ]),
    )(),
  ).rejects.toThrow("could not be read");
});
