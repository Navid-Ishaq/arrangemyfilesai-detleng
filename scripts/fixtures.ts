import { mkdir, writeFile } from "node:fs/promises";
import { zipSync, strToU8 } from "fflate";
import ExcelJS from "exceljs";
import pptxgen from "pptxgenjs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { sampleDocuments } from "../src/samples";
const root = "work/fixtures";
await mkdir(root + "/nested", { recursive: true });
await mkdir("work/output", { recursive: true });
for (const s of sampleDocuments) await writeFile(root + "/" + s.name, s.text);
await writeFile(root + "/nested/0.txt", sampleDocuments[0].text);
await writeFile(root + "/unsupported.bin", new Uint8Array([0, 1, 2]));
const docx = zipSync({
  "[Content_Types].xml": strToU8(
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  ),
  "_rels/.rels": strToU8(
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  ),
  "word/document.xml": strToU8(
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Project management notes about project scope, risk registers and milestones.</w:t></w:r></w:p></w:body></w:document>',
  ),
});
await writeFile(root + "/0.docx", docx);
const pdf = await PDFDocument.create();
const p = pdf.addPage();
const font = await pdf.embedFont(StandardFonts.Helvetica);
p.drawText("Python Data Cleaning: missing values and duplicate rows.", {
  x: 40,
  y: 700,
  size: 13,
  font,
});
await writeFile(root + "/final2.pdf", await pdf.save());
const scan = await PDFDocument.create();
scan.addPage();
await writeFile(root + "/scan.pdf", await scan.save());
const book = new ExcelJS.Workbook();
const sheet = book.addWorksheet("Training Budget");
sheet.addRow(["Course", "Cost"]);
sheet.addRow(["Project management", 200]);
await book.xlsx.writeFile(root + "/budget.xlsx");
const presentation = new pptxgen();
const slide = presentation.addSlide();
slide.addText("Leadership workshop: active listening and team communication.", {
  x: 1,
  y: 1,
  w: 8,
  h: 1,
  fontSize: 24,
});
await presentation.writeFile({ fileName: root + "/slides.pptx" });
console.log(
  "Synthetic fixtures created in work/fixtures. Separate copy destination: work/output.",
);
