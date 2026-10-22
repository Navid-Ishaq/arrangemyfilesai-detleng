import { extension, MAX_BYTES, MAX_TEXT } from "./domain";
export async function extract(file: File): Promise<{
  text: string;
  warning?: string;
  coverage: string;
  hints: string[];
}> {
  if (file.size > MAX_BYTES)
    throw new Error("OVERSIZED: Maximum file size is 20 MB.");
  const ext = extension(file.name);
  let text = "";
  let partial = false;
  const hints: string[] = [];
  let coverage = "Opening text";
  if (["txt", "md", "csv"].includes(ext)) text = await file.text();
  else if (ext === "docx") {
    coverage = "Opening Word content (page boundaries are not available)";
    const zip = await checkArchive(file);
    const xml = new TextDecoder().decode(
      zip["word/document.xml"] || new Uint8Array(),
    );
    hints.push(
      ...xmlTitles(
        new TextDecoder().decode(zip["docProps/core.xml"] || new Uint8Array()),
      ),
    );
    const paragraphs = xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) || [];
    for (const paragraph of paragraphs) {
      const value = xmlText(paragraph, "w:t");
      if (/<w:pStyle[^>]*w:val=["'](?:Title|Heading[12])["']/i.test(paragraph))
        hints.push(value);
      text += value + "\n";
      if (text.length >= MAX_TEXT) {
        partial = true;
        break;
      }
    }
  } else if (ext === "pdf") {
    const pdf = await import("pdfjs-dist");
    pdf.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).href;
    const task = pdf.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    });
    const doc = await task.promise.catch((error) => {
      if (error.name === "PasswordException")
        throw new Error(
          "ENCRYPTED: Password-protected PDFs are not supported.",
        );
      throw error;
    });
    try {
      const metadata = await doc.getMetadata().catch(() => null);
      const title = (metadata?.info as { Title?: string } | undefined)?.Title;
      if (title) hints.push(title);
      for (let page = 1; page <= Math.min(doc.numPages, 2); page++) {
        const content = await (await doc.getPage(page)).getTextContent();
        text +=
          content.items
            .map((i) => ("str" in i ? i.str + (i.hasEOL ? "\n" : " ") : ""))
            .join("") + "\n";
        if (text.length > MAX_TEXT) {
          partial = true;
          break;
        }
      }
      partial ||= doc.numPages > 2;
      coverage = `First ${Math.min(doc.numPages, 2)} PDF page(s) of ${doc.numPages}`;
    } finally {
      await task.destroy();
    }
    if (!text.trim())
      throw new Error(
        "OCR_REQUIRED: No selectable text found. Scanned PDFs need OCR, which is not included yet.",
      );
  } else if (ext === "xlsx") {
    await checkArchive(file);
    const { default: ExcelJS } = await import("exceljs");
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(await file.arrayBuffer());
    coverage = "First 2 sheets, up to 12 opening rows per sheet";
    const sheets = book.worksheets.slice(0, 2);
    hints.push(
      ...sheets.map((s) => s.name).filter((name) => !/^sheet\d+$/i.test(name)),
    );
    partial = book.worksheets.length > 2;
    for (const sheet of sheets) {
      text += `Sheet: ${sheet.name}\n`;
      sheet.eachRow((row, n) => {
        if (n <= 12) text += JSON.stringify(row.values) + "\n";
        else partial = true;
      });
    }
  } else if (ext === "pptx") {
    const zip = await checkArchive(file);
    const decoder = new TextDecoder();
    const slides = Object.keys(zip)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    for (const name of slides.slice(0, 4)) {
      const xml = decoder.decode(zip[name]);
      const value = xmlText(xml, "a:t");
      if (name === slides[0]) hints.push(value.split("\n")[0]);
      text += value + "\n";
    }
    partial = slides.length > 4;
    coverage = `First ${Math.min(slides.length, 4)} slides`;
  } else throw new Error("UNSUPPORTED: This format is not supported.");
  if (!text.trim()) throw new Error("EMPTY: No readable text found.");
  partial ||= text.length > MAX_TEXT;
  return {
    text: text.slice(0, MAX_TEXT),
    coverage,
    hints,
    warning: partial
      ? "Partial content: text was sampled or truncated. Review the suggestion."
      : undefined,
  };
}
async function checkArchive(file: File) {
  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (
    header[0] === 0xd0 &&
    header[1] === 0xcf &&
    header[2] === 0x11 &&
    header[3] === 0xe0
  )
    throw new Error(
      "ENCRYPTED_OR_LEGACY: This Office container cannot be read. Use an unencrypted modern Office document.",
    );
  const { unzipSync } = await import("fflate");
  let total = 0;
  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()), {
    filter: (entry) => {
      total += entry.originalSize;
      if (total > 60 * 1024 * 1024)
        throw new Error("OVERSIZED: Expanded document exceeds 60 MB.");
      return /^(word\/document\.xml|docProps\/core\.xml|ppt\/slides\/slide\d+\.xml)$/.test(
        entry.name,
      );
    },
  });
  return zip;
}

function decodeXML(value: string) {
  return value.replace(
    /&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi,
    (entity) => {
      const named: Record<string, string> = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&apos;": "'",
      };
      if (named[entity]) return named[entity];
      const code =
        entity[2].toLowerCase() === "x"
          ? parseInt(entity.slice(3, -1), 16)
          : parseInt(entity.slice(2, -1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    },
  );
}
function xmlText(xml: string, tag: string) {
  return Array.from(
    xml.matchAll(
      new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "g"),
    ),
    (m) => decodeXML(m[1].replace(/<[^>]*>/g, "")),
  ).join("\n");
}
function xmlTitles(xml: string) {
  return [xmlText(xml, "dc:title")].filter(Boolean);
}
