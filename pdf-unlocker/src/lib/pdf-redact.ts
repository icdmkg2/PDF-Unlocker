import { PDFDocument, rgb } from "pdf-lib";

export interface Redaction {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function applyRedactions(file: File, redactions: Redaction[]): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);

  for (const r of redactions) {
    const page = doc.getPage(r.pageIndex);
    const { height } = page.getSize();
    page.drawRectangle({
      x: r.x,
      y: height - r.y - r.height,
      width: r.width,
      height: r.height,
      color: rgb(0, 0, 0),
      borderColor: rgb(0, 0, 0),
    });
  }

  return doc.save();
}
