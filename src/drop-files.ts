import { type Entry, MAX_FILES, type ScanIssue } from "./domain";
import { inventory } from "./files";
export type DropSelection = {
  entries: Entry[];
  source?: FileSystemDirectoryHandle;
  limited: boolean;
  issues?: ScanIssue[];
};
export function fileEntry(file: File, path = file.name): Entry {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    path,
    size: file.size,
    file,
    status: "inventoried",
    approved: false,
    title: "",
    category: "",
    subcategory: "",
  };
}
// Invoke all handle accessors synchronously inside the drop event, before awaiting.
export function captureDrop(
  data: DataTransfer,
  progress?: (count: number, path: string) => void,
): () => Promise<DropSelection> {
  const items = Array.from(data.items).filter((i) => i.kind === "file");
  const requests = items.map((item) => {
    const getter = (
      item as DataTransferItem & {
        getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
      }
    ).getAsFileSystemHandle;
    if (getter) return getter.call(item);
    const entry = item.webkitGetAsEntry?.();
    if (entry?.isDirectory)
      throw new Error(
        "Folder dropping is unavailable in this browser. Use Choose a folder in desktop Chrome or Edge.",
      );
    const file = item.getAsFile();
    return Promise.resolve(file);
  });
  const fallback = Array.from(data.files);
  return async () => {
    const settled = await Promise.allSettled(requests);
    const issues: ScanIssue[] = [];
    const handles = settled.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      issues.push({ path: `Dropped item ${i + 1}`, reason: String(r.reason) });
      return null;
    });
    if (
      handles.length === 1 &&
      handles[0] &&
      !(handles[0] instanceof File) &&
      handles[0].kind === "directory"
    ) {
      const source = handles[0] as FileSystemDirectoryHandle;
      return {
        ...(await (progress ? inventory(source, progress) : inventory(source))),
        source,
      };
    }
    const entries: Entry[] = [];
    let limited = false;
    for (const handle of handles.length ? handles : fallback) {
      if (!handle) {
        issues.push({
          path: "Dropped item",
          reason:
            "A dropped item could not be read. Use the file picker instead.",
        });
        continue;
      }
      if (entries.length >= MAX_FILES) {
        limited = true;
        break;
      }
      if (handle instanceof File) entries.push(fileEntry(handle));
      else if (handle.kind === "file") {
        try {
          entries.push({
            ...fileEntry(await (handle as FileSystemFileHandle).getFile()),
            sourceHandle: handle as FileSystemFileHandle,
          });
        } catch (error) {
          entries.push({
            ...fileEntry(new File([], handle.name)),
            sourceHandle: handle as FileSystemFileHandle,
            scanError: String(error),
          });
        }
      } else {
        const found = await inventory(
          handle as FileSystemDirectoryHandle,
          progress,
        );
        const remaining = MAX_FILES - entries.length;
        entries.push(
          ...found.entries
            .slice(0, remaining)
            .map((e) => ({ ...e, path: `${handle.name}/${e.path}` })),
        );
        limited ||= found.limited || found.entries.length > remaining;
        issues.push(
          ...(found.issues || []).map((issue) => ({
            ...issue,
            path: `${handle.name}/${issue.path}`,
          })),
        );
      }
    }
    if (!entries.length)
      throw new Error(
        "A dropped item could not be read. No readable files were dropped. Choose files or a folder from your computer.",
      );
    return { entries, limited, issues };
  };
}

// Additive selection: keep existing edits; only explicit Clear removes them.
export async function mergeSelection(
  existing: Entry[],
  selection: DropSelection,
) {
  const entries = [...existing];
  const issues = (selection.issues || []).map((issue) => ({
    ...issue,
    path:
      selection.source && issue.path !== selection.source.name
        ? `${selection.source.name}/${issue.path}`
        : issue.path,
  }));
  let duplicates = 0;
  for (const incoming of selection.entries) {
    const path = selection.source
      ? `${selection.source.name}/${incoming.path}`
      : incoming.path;
    const candidates = entries.filter(
      (e) =>
        e.name === incoming.name &&
        e.size === incoming.size &&
        e.file.lastModified === incoming.file.lastModified,
    );
    let duplicate = false;
    for (const e of candidates) {
      if (
        e.file === incoming.file ||
        (e.sourceHandle &&
          incoming.sourceHandle &&
          (await e.sourceHandle.isSameEntry?.(incoming.sourceHandle)))
      ) {
        duplicate = true;
        break;
      }
    }
    if (duplicate) {
      duplicates++;
      continue;
    }
    if (entries.length >= MAX_FILES) {
      issues.push({
        path,
        reason:
          "Combined 1,000-file limit reached; this item and remaining selection were not added.",
      });
      break;
    }
    let uniquePath = path,
      batch = 2;
    while (
      entries.some(
        (e) =>
          e.path.normalize("NFKC").toLowerCase() ===
          uniquePath.normalize("NFKC").toLowerCase(),
      )
    )
      uniquePath = `Additional input (${batch++})/${path}`;
    entries.push({
      ...incoming,
      path: uniquePath,
      approved: true,
      copyRoute: "review",
    });
  }
  if (selection.limited && !issues.length)
    issues.push({
      path: selection.source?.name || "Selection",
      reason: "Inventory limit reached; some input content was not scanned.",
    });
  return { entries, issues, duplicates };
}
