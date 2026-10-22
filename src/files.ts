import { destination, Entry, MAX_FILES, validatePlan } from "./domain";
export type Result = {
  source: string;
  destination: string;
  status: "copied" | "failed" | "rolled-back" | "changed";
  sha256?: string;
  error?: string;
};
export type Manifest = {
  version: 1;
  session: string;
  created: string;
  plan: {
    source: string;
    destination: string;
    approved: true;
    size: number;
    lastModified: number;
  }[];
  results: Result[];
  inventory?: { source: string; approved: boolean }[];
};
export async function inventory(
  root: FileSystemDirectoryHandle,
): Promise<{ entries: Entry[]; limited: boolean }> {
  const entries: Entry[] = [];
  let limited = false;
  async function walk(dir: FileSystemDirectoryHandle, prefix = "", depth = 0) {
    if (depth > 12) {
      limited = true;
      return;
    }
    for await (const [name, handle] of dir.entries()) {
      if (entries.length >= MAX_FILES) {
        limited = true;
        break;
      }
      if (handle.kind === "directory") {
        if (!name.startsWith(".arrangemyfiles-"))
          await walk(handle, prefix + name + "/", depth + 1);
      } else {
        const file = await handle.getFile();
        entries.push({
          id: crypto.randomUUID(),
          path: prefix + name,
          name,
          size: file.size,
          file,
          status: "inventoried",
          approved: false,
          title: "",
          category: "",
          subcategory: "",
        });
      }
    }
  }
  await walk(root);
  return { entries, limited };
}
async function hash(file: Blob) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
    ),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
async function exists(dir: FileSystemDirectoryHandle, name: string) {
  try {
    await dir.getFileHandle(name);
    return true;
  } catch (e) {
    if ((e as DOMException).name !== "NotFoundError") throw e;
  }
  try {
    await dir.getDirectoryHandle(name);
    return true;
  } catch (e) {
    if ((e as DOMException).name !== "NotFoundError") throw e;
    return false;
  }
}
async function write(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: FileSystemWriteChunkType,
) {
  const h = await dir.getFileHandle(name, { create: true });
  const w = await h.createWritable();
  try {
    await w.write(data);
    await w.close();
  } catch (e) {
    await w.abort().catch(() => {});
    throw e;
  }
}
async function parent(
  root: FileSystemDirectoryHandle,
  path: string,
  create: boolean,
) {
  const parts = path.split("/");
  const name = parts.pop()!;
  let dir = root;
  for (const part of parts)
    dir = await dir.getDirectoryHandle(part, { create });
  return { dir, name };
}
export async function copyApproved(
  source: FileSystemDirectoryHandle | undefined,
  output: FileSystemDirectoryHandle,
  entries: Entry[],
  notify: (m: Manifest) => void,
) {
  const approved = entries.filter((e) => e.approved);
  if (!approved.length || validatePlan(entries).size)
    throw new Error("Approve valid, non-conflicting suggestions first.");
  if (
    source &&
    ((await source.isSameEntry(output)) ||
      (await source.resolve(output)) !== null ||
      (await output.resolve(source)) !== null)
  )
    throw new Error(
      "Choose an output folder separate from the source and its parents/subfolders.",
    );
  const session = ".arrangemyfiles-" + crypto.randomUUID();
  if (await exists(output, session))
    throw new Error("Output session already exists.");
  const dir = await output.getDirectoryHandle(session, { create: true });
  const manifest: Manifest = {
    version: 1,
    session,
    created: new Date().toISOString(),
    plan: approved.map((e) => ({
      source: e.path,
      destination: destination(e),
      approved: true,
      size: e.file.size,
      lastModified: e.file.lastModified,
    })),
    results: [],
    inventory: entries.map((e) => ({ source: e.path, approved: e.approved })),
  };
  await write(
    dir,
    "operation-manifest.json",
    JSON.stringify(manifest, null, 2),
  );
  for (const e of approved) {
    const target = destination(e);
    let result: Result = {
      source: e.path,
      destination: target,
      status: "failed",
    };
    try {
      // File picker snapshots can be copied without a directory handle.
      // Folder mode additionally reopens and verifies the current source.
      let current = e.file;
      if (source) {
        const currentParent = await parent(source, e.path, false);
        current = await (
          await currentParent.dir.getFileHandle(currentParent.name)
        ).getFile();
      }
      if (
        current.size !== e.file.size ||
        current.lastModified !== e.file.lastModified
      )
        throw new Error(
          "Source changed after scanning. Rescan before copying.",
        );
      const digest = await hash(e.file);
      if ((await hash(current)) !== digest)
        throw new Error("Source changed after analysis.");
      const p = await parent(dir, target, true);
      if (await exists(p.dir, p.name))
        throw new Error("Destination exists; overwrite prevented.");
      await write(p.dir, p.name, current);
      const saved = await (await p.dir.getFileHandle(p.name)).getFile();
      if ((await hash(saved)) !== digest)
        throw new Error(
          "Copy verification failed. Output retained for inspection.",
        );
      result = { ...result, status: "copied", sha256: digest };
    } catch (error) {
      result.error = `${error instanceof Error ? error.message : "Copy failed"} Original preserved.`;
    }
    manifest.results.push(result);
    // Persist each result. A manifest failure stops the run instead of losing tracking.
    await write(
      dir,
      "operation-manifest.json",
      JSON.stringify(manifest, null, 2),
    );
    notify(structuredClone(manifest));
  }
  return { manifest, dir };
}
export type CopyCheck = {
  source: string;
  destination: string;
  status: "verified" | "missing" | "changed" | "unreadable";
  error?: string;
};
// Reopen output bytes; do not trust the UI's previous success status.
export async function verifyCopies(
  dir: FileSystemDirectoryHandle,
  manifest: Manifest,
  notify: (checks: CopyCheck[]) => void = () => {},
) {
  const checks: CopyCheck[] = [];
  for (const r of manifest.results.filter((r) => r.status === "copied")) {
    let check: CopyCheck = {
      source: r.source,
      destination: r.destination,
      status: "unreadable",
    };
    try {
      const p = await parent(dir, r.destination, false);
      const file = await (await p.dir.getFileHandle(p.name)).getFile();
      check.status =
        r.sha256 && (await hash(file)) === r.sha256 ? "verified" : "changed";
    } catch (error) {
      check.status =
        (error as DOMException).name === "NotFoundError"
          ? "missing"
          : "unreadable";
      check.error =
        error instanceof Error ? error.message : "Could not read output";
    }
    checks.push(check);
    notify([...checks]);
  }
  return checks;
}

export async function rollback(
  dir: FileSystemDirectoryHandle,
  manifest: Manifest,
) {
  for (const r of manifest.results.filter((r) => r.status === "copied")) {
    try {
      const p = await parent(dir, r.destination, false);
      const file = await (await p.dir.getFileHandle(p.name)).getFile();
      if (!r.sha256 || (await hash(file)) !== r.sha256) {
        r.status = "changed";
        continue;
      }
      await p.dir.removeEntry(p.name);
      r.status = "rolled-back";
    } catch {
      r.error =
        "Could not verify or remove this output; retained for manual inspection.";
    }
    await write(
      dir,
      "operation-manifest.json",
      JSON.stringify(manifest, null, 2),
    );
  }
  return structuredClone(manifest);
}
