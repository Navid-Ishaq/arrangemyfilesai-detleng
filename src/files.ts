import {
  destination,
  Entry,
  MAX_FILES,
  validatePlan,
  type ScanIssue,
} from "./domain";
import { z } from "zod";
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
    route?: "organized" | "review";
    reason?: string;
    size: number;
    lastModified: number;
  }[];
  results: Result[];
  scanIssues?: ScanIssue[];
  inventory?: { source: string; approved: boolean }[];
};
export class CopyInterruptedError extends Error {
  constructor(
    message: string,
    public manifest: Manifest,
    public dir: FileSystemDirectoryHandle,
  ) {
    super(message);
    this.name = "CopyInterruptedError";
  }
}
const savedPath = z
  .string()
  .min(1)
  .max(32767)
  .refine(
    (p) =>
      !/[\\\x00-\x1f]/.test(p) &&
      p
        .split("/")
        .every((part) => part !== "" && part !== "." && part !== ".."),
    "Invalid relative path in copy report",
  );
const savedManifestSchema = z
  .object({
    version: z.literal(1),
    session: z.string().min(1).max(200),
    created: z.string(),
    plan: z
      .array(
        z.object({
          source: savedPath,
          destination: savedPath,
          approved: z.literal(true),
          route: z.enum(["organized", "review"]).optional(),
          reason: z.string().optional(),
          size: z.number().nonnegative(),
          lastModified: z.number(),
        }),
      )
      .max(MAX_FILES),
    results: z
      .array(
        z.object({
          source: savedPath,
          destination: savedPath,
          status: z.enum(["copied", "failed", "rolled-back", "changed"]),
          sha256: z
            .string()
            .regex(/^[a-f0-9]{64}$/i)
            .optional(),
          error: z.string().optional(),
        }),
      )
      .max(MAX_FILES),
    scanIssues: z
      .array(z.object({ path: z.string(), reason: z.string() }))
      .max(10000)
      .optional(),
    inventory: z
      .array(z.object({ source: savedPath, approved: z.boolean() }))
      .max(MAX_FILES)
      .optional(),
  })
  .superRefine((m, ctx) => {
    const planned = new Set(m.plan.map((p) => p.destination));
    const found = new Set<string>();
    for (const r of m.results) {
      if (
        !planned.has(r.destination) ||
        found.has(r.destination) ||
        !m.plan.some(
          (p) => p.source === r.source && p.destination === r.destination,
        ) ||
        (r.status === "copied" && !r.sha256)
      )
        ctx.addIssue({ code: "custom", message: "Inconsistent copy report" });
      found.add(r.destination);
    }
    if (planned.size !== m.plan.length)
      ctx.addIssue({
        code: "custom",
        message: "Duplicate output paths in copy report",
      });
  });
export function parseSavedManifest(value: unknown): Manifest {
  return savedManifestSchema.parse(value);
}
export function copySummary(manifest: Manifest) {
  const recorded = new Set(
    manifest.results.map((r) => `${r.source}\0${r.destination}`),
  );
  return {
    approved: manifest.plan.length,
    recorded: manifest.results.length,
    copied: manifest.results.filter((r) => r.status === "copied").length,
    failed: manifest.results.filter((r) => r.status === "failed").length,
    pending: manifest.plan.filter(
      (p) => !recorded.has(`${p.source}\0${p.destination}`),
    ).length,
  };
}
export async function inventory(
  root: FileSystemDirectoryHandle,
  progress?: (count: number, path: string) => void,
): Promise<{ entries: Entry[]; limited: boolean; issues: ScanIssue[] }> {
  const entries: Entry[] = [];
  const issues: ScanIssue[] = [];
  let limited = false;
  async function walk(dir: FileSystemDirectoryHandle, prefix = "", depth = 0) {
    if (depth > 12) {
      limited = true;
      issues.push({
        path: prefix,
        reason: "Folder depth exceeds 12 levels; contents were not scanned.",
      });
      return;
    }
    try {
      for await (const [name, handle] of dir.entries()) {
        if (entries.length >= MAX_FILES) {
          limited = true;
          issues.push({
            path: prefix || root.name,
            reason:
              "1,000-file limit reached; remaining content was not scanned.",
          });
          break;
        }
        if (handle.kind === "directory") {
          if (!name.startsWith(".arrangemyfiles-"))
            await walk(handle, prefix + name + "/", depth + 1);
          else
            issues.push({
              path: prefix + name,
              reason:
                "Previous generated output session was intentionally not scanned. Originals and that output remain untouched.",
            });
        } else {
          let file: File;
          let scanError: string | undefined;
          try {
            file = await handle.getFile();
          } catch (error) {
            scanError =
              "Source could not be read during scanning: " +
              (error instanceof Error ? error.message : "Access denied");
            file = new File([], name);
          }
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
            sourceHandle: handle,
            sourceRoot: root,
            scanError,
          });
          if (entries.length % 25 === 0)
            progress?.(entries.length, prefix + name);
        }
      }
    } catch (error) {
      issues.push({
        path: prefix || root.name,
        reason:
          "Folder could not be completely read: " +
          (error instanceof Error ? error.message : "Access denied"),
      });
    }
  }
  await walk(root);
  progress?.(entries.length, root.name);
  return { entries, limited, issues };
}
export async function hash(file: Blob) {
  let bytes: Uint8Array;
  if (file.size <= 20 * 1024 * 1024) {
    bytes = new Uint8Array(
      await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
    );
  } else {
    // Larger files bypass analysis but still get bounded-memory copy verification.
    const { sha256 } = await import("@noble/hashes/sha2");
    const state = sha256.create();
    const reader = file.stream().getReader();
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        state.update(chunk.value);
      }
      bytes = state.digest();
    } finally {
      reader.releaseLock();
    }
  }
  return Array.from(bytes)
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
  scanIssues: ScanIssue[] = [],
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
  for (const root of new Set(
    approved.map((e) => e.sourceRoot).filter(Boolean),
  )) {
    if (
      (await root!.isSameEntry(output)) ||
      (await root!.resolve(output)) !== null ||
      (await output.resolve(root!)) !== null
    )
      throw new Error(
        "Choose an output folder separate from every source folder and its parents/subfolders.",
      );
  }
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
      route: e.copyRoute,
      reason: e.warning || e.suggestion?.reason,
      size: e.file.size,
      lastModified: e.file.lastModified,
    })),
    results: [],
    scanIssues,
    inventory: entries.map((e) => ({ source: e.path, approved: e.approved })),
  };
  await write(
    dir,
    "operation-manifest.json",
    JSON.stringify(manifest, null, 2),
  );
  let lastSaved = structuredClone(manifest);
  notify(structuredClone(manifest));
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
      if (e.scanError) throw new Error(e.scanError);
      let current = e.file;
      if (e.sourceHandle) current = await e.sourceHandle.getFile();
      else if (source) {
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
    try {
      await write(
        dir,
        "operation-manifest.json",
        JSON.stringify(manifest, null, 2),
      );
      lastSaved = structuredClone(manifest);
    } catch (error) {
      throw new CopyInterruptedError(
        `Copy interrupted while saving the report: ${error instanceof Error ? error.message : "Storage unavailable"}. Unrecorded outputs may exist; inspect them before retrying.`,
        lastSaved,
        dir,
      );
    }
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
