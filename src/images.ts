import { extension, MAX_BYTES } from "./domain";
import { LocalAIError, suggest, VISION_MODEL } from "./ollama";
export async function imageData(
  file: File,
  fullDetail = false,
): Promise<string> {
  if (file.size > MAX_BYTES)
    throw new Error("OVERSIZED: Images must be under 20 MB.");
  let bytes = new Uint8Array(await file.arrayBuffer());
  const ext = extension(file.name);
  const png =
    ext === "png" &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  const jpg =
    ["jpg", "jpeg"].includes(ext) &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255;
  if (!png && !jpg)
    throw new Error(
      "INVALID_IMAGE: Expected a genuine JPG, JPEG or PNG image.",
    );
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(
      new Blob([bytes], { type: png ? "image/png" : "image/jpeg" }),
    );
  } catch {
    throw new Error(
      "INVALID_IMAGE: Image cannot be decoded. Original preserved.",
    );
  }
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 24000000
    )
      throw new Error(
        "OVERSIZED: Image exceeds 24 megapixels. Use a smaller copy.",
      );
    if (!fullDetail && Math.max(bitmap.width, bitmap.height) > 1536) {
      const scale = Math.min(1536 / bitmap.width, 1536 / bitmap.height, 1);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error(
          "IMAGE_PREPARATION_FAILED: Could not prepare a local image preview.",
        );
      context.fillStyle = "white";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      const preview = await canvas.convertToBlob({
        type: "image/jpeg",
        quality: 0.9,
      });
      bytes = new Uint8Array(await preview.arrayBuffer());
    }
  } finally {
    bitmap.close();
  }
  let binary = "";
  for (let start = 0; start < bytes.length; start += 8192)
    binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
  return btoa(binary);
}
export async function suggestImage(
  file: File,
  signal?: AbortSignal,
  stage?: (value: string) => void,
  fullDetail = false,
) {
  stage?.("Preparing a local image preview");
  const image = await imageData(file, fullDetail);
  signal?.throwIfAborted();
  stage?.("Analyzing image locally");
  try {
    const result = await suggest(
      "Name and categorize this image from visible evidence only. For illegible or ambiguous content set needsReview true. Return final JSON.",
      signal,
      image,
    );
    if (result.needsReview)
      throw new Error(
        "IMAGE_UNCERTAIN: The model could not confidently interpret this image. No suggestion created; review manually.",
      );
    return result;
  } catch (error) {
    if (error instanceof LocalAIError && error.code === "VISION_MODEL_MISSING")
      throw new Error(
        `VISION_MODEL_MISSING: Run ollama pull ${VISION_MODEL}. Text documents remain available.`,
      );
    throw error;
  }
}
