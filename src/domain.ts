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
  suggestion?: Suggestion;
  approved: boolean;
  title: string;
  category: string;
  subcategory: string;
};
export const MAX_FILES = 250;
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
  "jpg",
  "jpeg",
  "png",
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
  entry: Pick<Entry, "name" | "title" | "category" | "subcategory">,
): string {
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
    if (e.status !== "suggested") {
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

export const isImage = (name: string) =>
  ["jpg", "jpeg", "png"].includes(extension(name));
export function workflowComplete(
  index: number,
  ready: boolean,
  entries: Entry[],
  results: { status: string }[] = [],
): boolean {
  const copied = results.some(
    (r) => r.status === "copied" && results.length > 0,
  );
  const approved = entries.filter((e) => e.approved);
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
