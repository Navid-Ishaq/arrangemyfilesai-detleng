import { z } from "zod";
export const stages = [
  "setup",
  "choose",
  "analysis",
  "review",
  "results",
  "demo",
] as const;
export const errorCodes = [
  "OLLAMA_UNREACHABLE",
  "MODEL_MISSING",
  "INFERENCE_FAILED",
  "PERMISSION_DENIED",
  "UNSUPPORTED",
  "EXTRACTION_FAILED",
  "OCR_REQUIRED",
  "OVERSIZED",
  "EMPTY",
  "CONFLICT",
  "NONE",
] as const;
export const chatSchema = z
  .object({
    message: z.string().trim().min(1).max(2500),
    context: z
      .object({ stage: z.enum(stages), error: z.enum(errorCodes) })
      .strict()
      .optional(),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().max(3000),
          })
          .strict(),
      )
      .max(4)
      .optional(),
  })
  .strict();
export const actionSchema = z.enum([
  "open-setup",
  "open-demo",
  "open-review",
  "none",
]);
export const answerSchema = z
  .object({ reply: z.string().min(1).max(6000), action: actionSchema })
  .strict();
export const help: Record<string, string> = {
  OLLAMA_UNREACHABLE:
    "The organizer no longer requires Ollama or a local AI model. Refresh the website, choose documents, and use Build organization plan.",
  MODEL_MISSING:
    "The organizer no longer requires Ollama or a local AI model. Refresh the website, choose documents, and use Build organization plan.",
  INFERENCE_FAILED:
    "The organizer no longer requires Ollama or a local AI model. Refresh the website, choose documents, and use Build organization plan.",
  PERMISSION_DENIED:
    "Choose the folder again using the browser picker. Reading and output writing require separate permissions. Use Chrome or Edge on Windows.",
  UNSUPPORTED:
    "Supported formats: TXT, MD, DOCX, selectable-text PDF, CSV, XLSX and PPTX. OCR is not included. Encrypted or corrupt documents may fail extraction.",
  CONFLICT:
    "Two selected files have the same destination. Edit one proposed name or category. The application prevents overwrites.",
  EXTRACTION_FAILED:
    "The document could not be read. It may be encrypted, corrupt, or use unsupported content. Skip it or save an unencrypted modern copy manually. Never upload it to the Guide.",
  OCR_REQUIRED:
    "No selectable PDF text was found. OCR is not included. Keep this file for manual review.",
  OVERSIZED:
    "The file or expanded Office archive exceeds a safety limit. Choose a smaller document or skip it.",
  EMPTY:
    "No readable text was found. Skip this file or check it manually; a filename cannot establish its content.",
  NONE: "Choose documents, use Build organization plan, review and edit suggestions, then explicitly approve copying to a separate output folder.",
};
