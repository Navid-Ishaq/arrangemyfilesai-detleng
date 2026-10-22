import { type Entry, MAX_FILES } from "./domain";
import { inventory } from "./files";
export type DropSelection = {
  entries: Entry[];
  source?: FileSystemDirectoryHandle;
  limited: boolean;
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
export function captureDrop(data: DataTransfer): () => Promise<DropSelection> {
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
    const handles = await Promise.all(requests);
    if (
      handles.length === 1 &&
      handles[0] &&
      !(handles[0] instanceof File) &&
      handles[0].kind === "directory"
    ) {
      const source = handles[0] as FileSystemDirectoryHandle;
      return { ...(await inventory(source)), source };
    }
    const entries: Entry[] = [];
    let limited = false;
    for (const handle of handles.length ? handles : fallback) {
      if (!handle)
        throw new Error(
          "A dropped item could not be read. Use the file picker instead.",
        );
      if (entries.length >= MAX_FILES) {
        limited = true;
        break;
      }
      if (handle instanceof File) entries.push(fileEntry(handle));
      else if (handle.kind === "file")
        entries.push(
          fileEntry(await (handle as FileSystemFileHandle).getFile()),
        );
      else {
        const found = await inventory(handle as FileSystemDirectoryHandle);
        const remaining = MAX_FILES - entries.length;
        entries.push(
          ...found.entries
            .slice(0, remaining)
            .map((e) => ({ ...e, path: `${handle.name}/${e.path}` })),
        );
        limited ||= found.limited || found.entries.length > remaining;
      }
    }
    if (!entries.length)
      throw new Error(
        "No readable files were dropped. Choose files or a folder from your computer.",
      );
    return { entries, limited };
  };
}
