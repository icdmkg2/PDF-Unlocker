import { PDFDocument } from "pdf-lib";

export async function getPageThumbnails(file: File): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const thumbnails: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 0.25 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    thumbnails.push(canvas.toDataURL("image/png"));
  }
  return thumbnails;
}

export async function reorderPages(file: File, order: number[]): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(bytes);
  const newDoc = await PDFDocument.create();
  const pages = await newDoc.copyPages(srcDoc, order);
  for (const page of pages) newDoc.addPage(page);
  return newDoc.save();
}
