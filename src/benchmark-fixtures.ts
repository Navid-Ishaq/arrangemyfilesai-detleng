import { zipSync, strToU8 } from "fflate";
import { PDFDocument, StandardFonts } from "pdf-lib";
import ExcelJS from "exceljs";
export async function benchmarkFixtures(
  count: number,
): Promise<{ file: File; category: string; titleContains: string }[]> {
  const result = [];
  for (let i = 0; i < count; i++) {
    const kind = i % 7,
      id = String(i + 1).padStart(4, "0");
    let name = "",
      title = "",
      category = "",
      bytes: Uint8Array | string = "";
    if (kind === 0) {
      title = `Biology Study Notes ${id}`;
      category = "Study & Learning";
      name = `notes-${id}.txt`;
      bytes =
        title +
        "\n" +
        `Cell structure and scientific learning exercise ${id}.\n`.repeat(
          20 + (i % 100),
        );
    }
    if (kind === 1) {
      title = `Project Roadmap ${id}`;
      category = "Projects";
      name = `document-${id}.md`;
      bytes =
        `# ${title}\n` +
        `Project milestones and deployment checklist ${id}.\n`.repeat(30);
    }
    if (kind === 2) {
      title = `Invoice ${id}`;
      category = "Finance";
      name = `Invoice ${id}.csv`;
      bytes = `item,cost\nTraining,${i + 12}\n`;
    }
    if (kind === 3) {
      title = `Quantum Physics Lecture ${id}`;
      category = "Study & Learning";
      name = `${id}.docx`;
      bytes = zipSync({
        "word/document.xml": strToU8(
          `<w:document><w:body><w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>${title}</w:t></w:r></w:p>${`<w:p><w:r><w:t>Course study and physics notes ${id}.</w:t></w:r></w:p>`.repeat(30 + (i % 60))}</w:body></w:document>`,
        ),
        "docProps/core.xml": strToU8(
          `<cp:coreProperties><dc:title>${title}</dc:title></cp:coreProperties>`,
        ),
      });
    }
    if (kind === 4) {
      title = `Project Milestones ${id}`;
      category = "Projects";
      name = `scan-${id}.pdf`;
      const pdf = await PDFDocument.create();
      pdf.setTitle(title);
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      for (let j = 0; j < 4; j++) {
        const page = pdf.addPage();
        page.drawText(
          j === 0 ? title : `Project scope and roadmap ${id} page ${j + 1}`,
          { x: 40, y: 720, size: 18, font },
        );
      }
      bytes = await pdf.save();
    }
    if (kind === 5) {
      title = `Training Budget ${id}`;
      category = "Finance";
      name = `book-${id}.xlsx`;
      const book = new ExcelJS.Workbook();
      const sheet = book.addWorksheet(title);
      sheet.addRow(["Expense", "Cost"]);
      for (let r = 0; r < 20; r++) sheet.addRow([`Cost ${id}-${r}`, r + 10]);
      bytes = new Uint8Array(await book.xlsx.writeBuffer());
    }
    if (kind === 6) {
      title = `Leadership Workshop ${id}`;
      category = "Study & Learning";
      name = `presentation-${id}.pptx`;
      bytes = zipSync({
        "ppt/slides/slide1.xml": strToU8(
          `<p:sld><a:t>${title}</a:t><a:t>Training workshop agenda</a:t></p:sld>`,
        ),
      });
    }
    result.push({
      file: new File(
        [typeof bytes === "string" ? bytes : new Uint8Array(bytes)],
        name,
      ),
      category,
      titleContains: title,
    });
  }
  return result;
}
