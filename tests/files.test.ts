import { describe, it, expect } from "vitest";
import {
  copyApproved,
  rollback,
  inventory,
  verifyCopies,
  CopyInterruptedError,
  copySummary,
  hash,
  parseSavedManifest,
} from "../src/files";
import { completePlan } from "../src/domain";
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
  it("copies every included mixed-format file, routing warnings and images to Needs Review", async () => {
    const { out, e } = await setup();
    const image = new File(
      [new Uint8Array([137, 80, 78, 71, 1, 2, 3])],
      "photo.png",
      { lastModified: 1000 },
    );
    const planned = completePlan([
      e,
      {
        ...e,
        id: "warning",
        path: "second/old.txt",
        warning: "Ambiguous category",
      },
      {
        ...e,
        id: "image",
        path: "Photos/photo.png",
        name: image.name,
        file: image,
        size: image.size,
        status: "unsupported",
      },
      { ...e, id: "excluded", path: "private/old.txt", approved: false },
    ]);
    const r = await copyApproved(undefined, handle(out), planned, () => {});
    expect(r.manifest.plan).toHaveLength(3);
    expect(r.manifest.results.every((r) => r.status === "copied")).toBe(true);
    expect(
      r.manifest.plan
        .filter((p) => p.route === "review")
        .map((p) => p.destination),
    ).toEqual(["Needs Review/second/old.txt", "Needs Review/Photos/photo.png"]);
    expect(
      (await verifyCopies(r.dir, r.manifest)).every(
        (c) => c.status === "verified",
      ),
    ).toBe(true);
    expect(parseSavedManifest(r.manifest).plan[1].reason).toBe(
      "Ambiguous category",
    );
  });
  it("continues scanning healthy siblings and records inaccessible folders and files", async () => {
    const root = new Dir("root");
    const bad = await root.getDirectoryHandle("denied", { create: true });
    bad.entries = async function* () {
      throw new DOMException("No access", "NotAllowedError");
    };
    const missing = await root.getFileHandle("unreadable.txt", {
      create: true,
    });
    missing.getFile = async () => {
      throw new DOMException("Missing", "NotFoundError");
    };
    await root.getFileHandle("good.txt", { create: true });
    const result = await inventory(handle(root));
    expect(result.entries).toHaveLength(2);
    expect(
      result.entries.find((e) => e.name === "unreadable.txt")?.scanError,
    ).toContain("Missing");
    expect(result.issues[0].path).toContain("denied");
    const planned = completePlan(
      result.entries.map((e) => ({ ...e, approved: true })),
    );
    const copy = await copyApproved(
      undefined,
      handle(new Dir("out")),
      planned,
      () => {},
      result.issues,
    );
    expect(copy.manifest.results.map((r) => r.status)).toEqual([
      "failed",
      "copied",
    ]);
    expect(parseSavedManifest(copy.manifest).scanIssues).toHaveLength(1);
  });
  it("streams verification for files above the analysis limit", async () => {
    const file = new File(
      [new Uint8Array(21 * 1024 * 1024).fill(7)],
      "large.bin",
    );
    const expected = Buffer.from(
      await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
    ).toString("hex");
    file.arrayBuffer = async () => {
      throw new Error("Whole-file allocation forbidden");
    };
    expect(await hash(file)).toBe(expected);
  });
  it("retains the last persisted report and output handle when a manifest write interrupts copying", async () => {
    const { out, e } = await setup();
    let savedDir: Dir | undefined;
    const createDir = out.getDirectoryHandle.bind(out);
    out.getDirectoryHandle = async (name, options) => {
      const dir = await createDir(name, options);
      savedDir = dir;
      const getFile = dir.getFileHandle.bind(dir);
      dir.getFileHandle = async (fileName, opts) => {
        const file = await getFile(fileName, opts);
        if (
          fileName === "operation-manifest.json" &&
          file.data.name === fileName
        ) {
          file.createWritable = async () => {
            throw new DOMException("Disk unavailable", "NotFoundError");
          };
        }
        return file;
      };
      return dir;
    };
    try {
      await copyApproved(undefined, handle(out), [e], () => {});
      throw new Error("Expected interruption");
    } catch (error) {
      expect(error).toBeInstanceOf(CopyInterruptedError);
      const interrupted = error as CopyInterruptedError;
      expect(interrupted.dir).toBe(savedDir);
      expect(copySummary(interrupted.manifest)).toMatchObject({
        approved: 1,
        recorded: 0,
        pending: 1,
      });
      // Output bytes may exist even though its result was not persisted.
      expect(
        await (
          await (
            await savedDir!.getDirectoryHandle("Notes")
          ).getFileHandle("New title.txt")
        ).getFile(),
      ).toBeTruthy();
    }
  });
  it("rechecks saved bytes and detects changes, missing outputs and unselected files", async () => {
    const { out, e } = await setup();
    const other = { ...e, id: "b", path: "other.txt", approved: false };
    const r = await copyApproved(undefined, handle(out), [e, other], () => {});
    expect(r.manifest.inventory).toEqual([
      { source: "old.txt", approved: true },
      { source: "other.txt", approved: false },
    ]);
    expect((await verifyCopies(r.dir, r.manifest))[0].status).toBe("verified");
    const dir = r.dir as unknown as Dir;
    const notes = await dir.getDirectoryHandle("Notes");
    const file = await notes.getFileHandle("New title.txt");
    file.data = new File(["changed!"], "New title.txt");
    expect((await verifyCopies(r.dir, r.manifest))[0].status).toBe("changed");
    await notes.removeEntry("New title.txt");
    expect((await verifyCopies(r.dir, r.manifest))[0].status).toBe("missing");
  });
  it.each(["jpg", "jpeg", "png"])(
    "blocks unsupported %s before writing output",
    async (ext) => {
      const { source, out, e } = await setup();
      await expect(
        copyApproved(
          handle(source),
          handle(out),
          [{ ...e, name: `photo.${ext}` }],
          () => {},
        ),
      ).rejects.toThrow("Approve valid");
      expect(out.children.size).toBe(0);
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
  it("copies individually selected snapshots into a verified output session", async () => {
    const { source, out, e } = await setup();
    const result = await copyApproved(undefined, handle(out), [e], () => {});
    expect(result.manifest.results[0].status).toBe("copied");
    expect(result.manifest.results[0].sha256).toHaveLength(64);
    expect(await e.file.text()).toBe("original");
    expect(source.children.has("old.txt")).toBe(true);
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
