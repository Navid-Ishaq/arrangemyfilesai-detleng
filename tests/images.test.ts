import { afterEach, expect, it, vi } from "vitest";
import { imageData, suggestImage } from "../src/images";
import {
  isImage,
  destination,
  workflowComplete,
  type Entry,
} from "../src/domain";
import { suggest } from "../src/ollama";
const valid = {
  title: "Printed Project Notes",
  category: "Projects",
  subcategory: "",
  reason: "Visible printed notes",
  needsReview: false,
};
const png = () =>
  new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])], "page.PNG");
afterEach(() => vi.unstubAllGlobals());
it("recognizes only JPG JPEG PNG images case insensitively", () => {
  for (const name of ["a.jpg", "a.JPEG", "a.PNG"])
    expect(isImage(name)).toBe(true);
  expect(isImage("a.svg")).toBe(false);
});
it("rejects mismatched or corrupt image bytes before inference", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(
    suggestImage(new File(["not an image"], "fake.jpg")),
  ).rejects.toThrow("INVALID_IMAGE");
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockRejectedValue(new Error("decode")),
  );
  await expect(imageData(png())).rejects.toThrow("cannot be decoded");
  expect(fetch).not.toHaveBeenCalled();
});
it("enforces decoded pixel limits and closes image resources", async () => {
  const close = vi.fn();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 25000, height: 10000, close }),
  );
  await expect(imageData(png())).rejects.toThrow("24 megapixels");
  expect(close).toHaveBeenCalled();
});
it("sends base64 images only to loopback with the vision model", async () => {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 10, height: 10, close: vi.fn() }),
  );
  const fetch = vi
    .fn()
    .mockResolvedValue(
      Response.json({ message: { content: JSON.stringify(valid) } }),
    );
  vi.stubGlobal("fetch", fetch);
  expect(await suggestImage(png())).toEqual(valid);
  expect(fetch.mock.calls[0][0]).toBe("http://127.0.0.1:11434/api/chat");
  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.model).toBe("qwen3-vl:4b");
  expect(body.messages[1].images[0]).toBeTruthy();
});
it("keeps text on qwen3:4b without attached images", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      Response.json({ message: { content: JSON.stringify(valid) } }),
    );
  vi.stubGlobal("fetch", fetch);
  await suggest("notes");
  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.model).toBe("qwen3:4b");
  expect(body.messages[1].images).toBeUndefined();
});
it("does not fabricate a suggestion on missing or failed vision model", async () => {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 10, height: 10, close: vi.fn() }),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("", { status: 404 })),
  );
  await expect(suggestImage(png())).rejects.toThrow("ollama pull qwen3-vl:4b");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("", { status: 500 })),
  );
  await expect(suggestImage(png())).rejects.toThrow("Image inference failed");
});
const entry = (approved = false) =>
  ({
    id: "1",
    name: "page.JPG",
    title: "Notes",
    category: "Projects",
    subcategory: "",
    status: "suggested",
    approved,
  }) as Entry;
it("completes review only after valid approval or verified copy", () => {
  expect(workflowComplete(3, true, [entry()])).toBe(false);
  expect(workflowComplete(3, true, [entry(true)])).toBe(true);
  expect(workflowComplete(3, true, [{ ...entry(true), title: "" }])).toBe(
    false,
  );
  expect(workflowComplete(3, false, [], [{ status: "copied" }])).toBe(true);
  for (const results of [
    [],
    [{ status: "failed" }],
    [{ status: "rolled-back" }],
  ])
    expect(workflowComplete(3, true, [], results)).toBe(false);
});
it("retains original image extension and validates the destination", () => {
  expect(destination({ ...entry(), title: "Project Notes" })).toBe(
    "Projects/Project Notes.jpg",
  );
  expect(() => destination({ ...entry(), title: "../" })).toThrow();
});
it("refuses uncertain visual interpretations instead of fabricating approved suggestions", async () => {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 10, height: 10, close: vi.fn() }),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        message: { content: JSON.stringify({ ...valid, needsReview: true }) },
      }),
    ),
  );
  await expect(suggestImage(png())).rejects.toThrow("IMAGE_UNCERTAIN");
});
it.each(["jpg", "jpeg"])("validates and decodes %s images", async (ext) => {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 10, height: 10, close: vi.fn() }),
  );
  expect(
    await imageData(
      new File([new Uint8Array([255, 216, 255, 0])], `photo.${ext}`),
    ),
  ).toBeTruthy();
});
it("does not complete review for conflicting approved image destinations", () => {
  expect(
    workflowComplete(3, true, [entry(true), { ...entry(true), id: "2" }]),
  ).toBe(false);
});
it("rejects oversized image bytes before decoding or contacting a model", async () => {
  const decode = vi.fn();
  vi.stubGlobal("createImageBitmap", decode);
  await expect(
    imageData(new File([new Uint8Array(20 * 1024 * 1024 + 1)], "large.png")),
  ).rejects.toThrow("20 MB");
  expect(decode).not.toHaveBeenCalled();
});
it("rejects a truncated image answer even when its partial JSON looks valid", async () => {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 10, height: 10, close: vi.fn() }),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        done_reason: "length",
        message: { content: JSON.stringify(valid) },
      }),
    ),
  );
  await expect(suggestImage(png())).rejects.toMatchObject({
    code: "OLLAMA_INVALID_RESPONSE",
  });
});
it("prepares a bounded image preview without writing or changing the original", async () => {
  const original = png();
  const originalBytes = new Uint8Array(await original.arrayBuffer());
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 3072, height: 1536, close: vi.fn() }),
  );
  const drawImage = vi.fn();
  const convertToBlob = vi.fn(async () => new Blob(["preview"]));
  const sizes: number[][] = [];
  vi.stubGlobal(
    "OffscreenCanvas",
    class {
      constructor(w: number, h: number) {
        sizes.push([w, h]);
      }
      getContext() {
        return { fillRect: vi.fn(), drawImage, fillStyle: "" };
      }
      convertToBlob = convertToBlob;
    },
  );
  expect(await imageData(original)).toBe(btoa("preview"));
  expect(sizes).toEqual([[1536, 768]]);
  expect(drawImage).toHaveBeenCalledOnce();
  expect(new Uint8Array(await original.arrayBuffer())).toEqual(originalBytes);
  convertToBlob.mockClear();
  await imageData(original, true);
  expect(convertToBlob).not.toHaveBeenCalled();
});
