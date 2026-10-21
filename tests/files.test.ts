import { describe, it, expect } from "vitest";
import { copyApproved, rollback, inventory } from "../src/files";
import type { Entry } from "../src/domain";
// In-memory handles implement the File System Access contract for failure injection.
class Dir {
  kind = "directory";
  children = new Map<string, Dir | MemFile>();
  constructor(
    public name: string,
    public parent?: Dir,
  ) {}
  async getDirectoryHandle(name: string, opts?: { create?: boolean }) {
    const n = this.children.get(name);
    if (n instanceof Dir) return n;
    if (n) throw new DOMException("Type", "TypeMismatchError");
    if (!opts?.create) throw new DOMException("Missing", "NotFoundError");
    const d = new Dir(name, this);
    this.children.set(name, d);
    return d;
  }
  async getFileHandle(name: string, opts?: { create?: boolean }) {
    const n = this.children.get(name);
    if (n instanceof MemFile) return n;
    if (n) throw new DOMException("Type", "TypeMismatchError");
    if (!opts?.create) throw new DOMException("Missing", "NotFoundError");
    const f = new MemFile(name);
    this.children.set(name, f);
    return f;
  }
  async isSameEntry(other: Dir) {
    return other === this;
  }
  async resolve(other: Dir) {
    const parts = [];
    let current: Dir | undefined = other;
    while (current && current !== this) {
      parts.unshift(current.name);
      current = current.parent;
    }
    return current === this ? parts : null;
  }
  async removeEntry(name: string) {
    this.children.delete(name);
  }
  async *entries() {
    for (const n of this.children) yield n;
  }
}
class MemFile {
  kind = "file";
  data = new File(["original"], "old.txt", { lastModified: 1000 });
  constructor(public name: string) {}
  async getFile() {
    return this.data;
  }
  async createWritable() {
    return {
      write: async (data: Blob | string) => {
        this.data = new File([data], this.name, { lastModified: 2000 });
      },
      close: async () => {},
      abort: async () => {},
    };
  }
}
const handle = (d: Dir) => d as unknown as FileSystemDirectoryHandle;
async function setup() {
  const source = new Dir("source"),
    out = new Dir("output");
  const f = await source.getFileHandle("old.txt", { create: true });
  const e: Entry = {
    id: "a",
    path: "old.txt",
    name: "old.txt",
    size: 8,
    file: await f.getFile(),
    status: "suggested",
    approved: true,
    title: "New title",
    category: "Notes",
    subcategory: "",
  };
  return { source, out, e };
}
describe("copy-first operation and verified rollback", () => {
  it.each(["jpg", "jpeg", "png"])(
    "copies approved %s bytes without changing originals",
    async (ext) => {
      const { source, out, e } = await setup();
      source.children.delete("old.txt");
      const name = `photo.${ext}`;
      const f = await source.getFileHandle(name, { create: true });
      f.data = new File([new Uint8Array([137, 80, 78, 71, 0, 255])], name, {
        lastModified: 1000,
      });
      const file = await f.getFile();
      const imageEntry = { ...e, name, path: name, file, size: file.size };
      const result = await copyApproved(
        handle(source),
        handle(out),
        [imageEntry],
        () => {},
      );
      expect(result.manifest.results[0].status).toBe("copied");
      expect(result.manifest.results[0].destination).toBe(
        `Notes/New title.${ext}`,
      );
      expect(new Uint8Array(await (await f.getFile()).arrayBuffer())).toEqual(
        new Uint8Array(await file.arrayBuffer()),
      );
    },
  );
  it("copies approved bytes and preserves originals", async () => {
    const { source, out, e } = await setup();
    const result = await copyApproved(
      handle(source),
      handle(out),
      [e],
      () => {},
    );
    expect(result.manifest.results[0].status).toBe("copied");
    expect(
      await (
        await source.getFileHandle("old.txt")
      )
        .getFile()
        .then((f) => f.text()),
    ).toBe("original");
    expect(result.manifest.results[0].sha256).toHaveLength(64);
  });
  it("requires approval and blocks nested output", async () => {
    const { source, out, e } = await setup();
    await expect(
      copyApproved(
        handle(source),
        handle(out),
        [{ ...e, approved: false }],
        () => {},
      ),
    ).rejects.toThrow();
    const nested = await source.getDirectoryHandle("nested", { create: true });
    await expect(
      copyApproved(handle(source), handle(nested), [e], () => {}),
    ).rejects.toThrow("separate");
  });
  it("detects a source change before copying", async () => {
    const { source, out, e } = await setup();
    (await source.getFileHandle("old.txt")).data = new File(
      ["changed"],
      "old.txt",
    );
    const r = await copyApproved(handle(source), handle(out), [e], () => {});
    expect(r.manifest.results[0].status).toBe("failed");
  });
  it("rolls back unchanged copies only", async () => {
    const { source, out, e } = await setup();
    const r = await copyApproved(handle(source), handle(out), [e], () => {});
    await rollback(r.dir, r.manifest);
    expect(r.manifest.results[0].status).toBe("rolled-back");
    expect(source.children.has("old.txt")).toBe(true);
  });
  it("retains a modified output during rollback", async () => {
    const { source, out, e } = await setup();
    const r = await copyApproved(handle(source), handle(out), [e], () => {});
    const dir = r.dir as unknown as Dir;
    const notes = await dir.getDirectoryHandle("Notes");
    (await notes.getFileHandle("New title.txt")).data = new File(
      ["owner edit"],
      "New title.txt",
    );
    await rollback(r.dir, r.manifest);
    expect(r.manifest.results[0].status).toBe("changed");
    expect(notes.children.has("New title.txt")).toBe(true);
  });
  it("inventories nested folders without writing", async () => {
    const { source } = await setup();
    const nested = await source.getDirectoryHandle("nested", { create: true });
    await nested.getFileHandle("old.txt", { create: true });
    const r = await inventory(handle(source));
    expect(r.entries.map((e) => e.path)).toEqual(["old.txt", "nested/old.txt"]);
    expect(r.entries.every((e) => !e.approved)).toBe(true);
  });
});
