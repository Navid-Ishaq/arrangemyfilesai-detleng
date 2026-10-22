export function analysisWarning(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Document processing failed.";
  if (
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed|Failed to load module script/i.test(
      message,
    )
  )
    return "APP_UPDATE_REQUIRED: A document reader could not load. After a website update an old tab may request outdated files. Refresh with Ctrl+F5 (this clears the current in-memory review), choose the folder again and retry. Originals are unchanged.";
  return message.slice(0, 400);
}
