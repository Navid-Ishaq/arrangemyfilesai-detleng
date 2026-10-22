import { extract } from "./extract";
import { documentSample } from "./document-sample";
import { propose, meaningfulName, type FolderRule } from "./naming";
import { MAX_BYTES, extension, supported } from "./domain";
export async function planDocument(file: File, rules: FolderRule[]) {
  if (!supported.has(extension(file.name)))
    throw new Error("Not supported in this release—original preserved");
  if (file.size > MAX_BYTES)
    throw new Error("OVERSIZED: Maximum file size is 20 MB.");
  const fromName = propose(file.name, "", [], rules);
  if (meaningfulName(file.name) && fromName.reason.includes("keyword rule:"))
    return {
      suggestion: fromName,
      coverage:
        "Descriptive filename and keyword rule only; content reading was not needed.",
    };
  try {
    const content = await extract(file);
    const sample = documentSample(content.text);
    const suggestion = propose(
      file.name,
      sample.text,
      content.hints || [],
      rules,
    );
    return {
      suggestion,
      coverage: `${content.coverage}. ${sample.text.length.toLocaleString()} opening characters checked. ${suggestion.reason}`,
      warning: suggestion.needsReview
        ? "Please review: title evidence is limited or multiple folder rules matched."
        : undefined,
    };
  } catch (error) {
    // A read failure cannot justify inventing a document title.
    const suggestion = propose(file.name, "", [], rules);
    return {
      suggestion: { ...suggestion, needsReview: true },
      coverage:
        "Filename and file type only; document contents could not be read.",
      warning: `${error instanceof Error ? error.message : "Document reading failed"} Original name retained; review before copying.`,
    };
  }
}
