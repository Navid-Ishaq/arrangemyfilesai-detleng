export type Suggestion = {
  title: string;
  category: string;
  subcategory: string;
  reason: string;
  needsReview: boolean;
};
export type Entry = {
  id: string;
  path: string;
  name: string;
  size: number;
  file: File;
  status: string;
  text?: string;
  warning?: string;
  coverage?: string;
  suggestion?: Suggestion;
  approved: boolean;
  title: string;
  category: string;
  subcategory: string;
  copyRoute?: "organized" | "review";
  outputPath?: string;
  reviewAccepted?: boolean;
  keepForReview?: boolean;
  scanError?: string;
  sourceHandle?: FileSystemFileHandle;
  sourceRoot?: FileSystemDirectoryHandle;
};
export type ScanIssue = { path: string; reason: string };
export const MAX_FILES = 1000;
export const MAX_BYTES = 20 * 1024 * 1024;
export const MAX_TEXT = 14000;
export const supported = new Set([
  "txt",
  "md",
  "csv",
  "docx",
  "pdf",
  "xlsx",
  "pptx",
]);
export const extension = (name: string) =>
  name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "";
export function safeSegment(value: string): string {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\x00-\x1f\u202a-\u202e\u2066-\u2069]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "")
    .slice(0, 90)
    .replace(/[. ]+$/g, "");
  if (!cleaned || cleaned === "." || cleaned === "..")
    throw new Error("Enter a meaningful name.");
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:[ .]|$)/i.test(cleaned)
    ? `_${cleaned}`
    : cleaned;
}
export function destination(
  entry: Pick<Entry, "name" | "title" | "category" | "subcategory"> &
    Partial<Pick<Entry, "outputPath" | "copyRoute" | "path">>,
): string {
  if (entry.outputPath) return relativePath(entry.outputPath);
  if (entry.copyRoute === "review")
    return relativePath(`Needs Review/${entry.path || entry.name}`);
  const ext = extension(entry.name);
  let title = entry.title.trim();
  if (ext && title.toLowerCase().endsWith("." + ext))
    title = title.slice(0, -ext.length - 1);
  const parts = [
    safeSegment(entry.category),
    ...(entry.subcategory.trim() ? [safeSegment(entry.subcategory)] : []),
    safeSegment(title) + (ext ? "." + ext : ""),
  ];
  if (parts.join("/").length > 220)
    throw new Error(
      "Destination is too long. Shorten the category or filename.",
    );
  return parts.join("/");
}
export function validatePlan(entries: Entry[]): Map<string, string> {
  const errors = new Map<string, string>();
  const paths = new Map<string, string[]>();
  for (const e of entries.filter((e) => e.approved)) {
    if (e.copyRoute !== "review" && !supported.has(extension(e.name))) {
      errors.set(e.id, "Not supported in this release—original preserved");
      continue;
    }
    if (e.copyRoute !== "review" && e.status !== "suggested") {
      errors.set(e.id, "This file has no validated suggestion.");
      continue;
    }
    try {
      const p = destination(e).normalize("NFKC").toLocaleLowerCase("en-US");
      paths.set(p, [...(paths.get(p) || []), e.id]);
    } catch (error) {
      errors.set(e.id, (error as Error).message);
    }
  }
  for (const ids of paths.values())
    if (ids.length > 1)
      for (const id of ids)
        errors.set(id, "Duplicate destination. Edit the name or folder.");
  return errors;
}

// Reserve every approved path before adding suffixes, including existing (2) names.
export function uniqueApprovedNames(entries: Entry[]): Entry[] {
  const key = (e: Entry) =>
    destination(e).normalize("NFKC").toLocaleLowerCase("en-US");
  const reserved = new Set<string>();
  for (const e of entries.filter((e) => e.approved)) {
    try {
      reserved.add(key(e));
    } catch {
      /* Invalid paths remain for manual review. */
    }
  }
  const seen = new Set<string>();
  return entries.map((e) => {
    if (!e.approved) return e;
    try {
      const original = key(e);
      if (!seen.has(original)) {
        seen.add(original);
        return e;
      }
      const ext = extension(e.name);
      const stem = e.title.toLowerCase().endsWith("." + ext)
        ? e.title.slice(0, -ext.length - 1)
        : e.title;
      for (let i = 2; i <= entries.length + 1; i++) {
        const suffix = ` (${i})`;
        const updated = {
          ...e,
          title:
            safeSegment(stem)
              .slice(0, 90 - suffix.length)
              .trimEnd() + suffix,
        };
        const next = key(updated);
        if (!reserved.has(next)) {
          reserved.add(next);
          seen.add(next);
          return updated;
        }
      }
    } catch {
      /* Keep invalid entries visible; never bypass validation. */
    }
    return e;
  });
}

export const isImage = (name: string) =>
  ["jpg", "jpeg", "png"].includes(extension(name));
export function workflowComplete(
  index: number,
  ready: boolean,
  entries: Entry[],
  results: { status: string }[] = [],
  scanIncomplete = false,
): boolean {
  const approved = entries.filter((e) => e.approved);
  const copied =
    !scanIncomplete &&
    approved.length > 0 &&
    results.length === approved.length &&
    results.every((r) => r.status === "copied");
  const reviewed = approved.length > 0 && validatePlan(entries).size === 0;
  return (
    [
      ready,
      entries.length > 0,
      entries.some((e) => e.status === "suggested") || copied,
      reviewed || copied,
      copied,
    ][index] ?? false
  );
}

export function relativePath(path: string): string {
  if (
    /[\\\x00-\x1f]/.test(path) ||
    path.split("/").some((p) => !p || p === "." || p === "..")
  )
    throw new Error("Invalid relative output path.");
  return path;
}
// Inclusion and acceptance are separate: uncertain content is copied unchanged.
export function completePlan(entries: Entry[]): Entry[] {
  const prepared = entries.map((entry) => {
    const e: Entry = { ...entry, outputPath: undefined };
    e.copyRoute =
      e.status === "suggested" &&
      !e.keepForReview &&
      (!e.warning || e.reviewAccepted) &&
      !e.scanError
        ? "organized"
        : "review";
    let target: string;
    try {
      target = destination(e);
    } catch {
      e.copyRoute = "review";
      e.warning =
        e.warning ||
        "Invalid suggested destination; original name retained for review.";
      target = destination(e);
    }
    return { ...e, outputPath: target };
  });
  const key = (p: string) => p.normalize("NFKC").toLocaleLowerCase("en-US");
  const reserved = new Set(
    prepared.filter((e) => e.approved).map((e) => key(e.outputPath)),
  );
  const used = new Set<string>();
  return prepared.map((e) => {
    if (!e.approved) return e;
    const original = e.outputPath;
    let target = original,
      n = 2;
    if (used.has(key(target))) {
      do {
        const slash = original.lastIndexOf("/");
        const dot = original.lastIndexOf(".");
        const at = dot > slash + 1 ? dot : original.length;
        target = `${original.slice(0, at)} (${n++})${original.slice(at)}`;
      } while (reserved.has(key(target)) || used.has(key(target)));
    }
    used.add(key(target));
    return { ...e, outputPath: target };
  });
}
