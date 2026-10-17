import { PDFDocument } from "pdf-lib";

export async function reorderPages(file: File, order: number[]): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(bytes);
  const newDoc = await PDFDocument.create();
  const pages = await newDoc.copyPages(srcDoc, order);
  for (const page of pages) newDoc.addPage(page);
  return newDoc.save();
}
