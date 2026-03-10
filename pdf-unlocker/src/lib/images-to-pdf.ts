import { PDFDocument } from "pdf-lib";

export async function imagesToPDF(images: File[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const img of images) {
    const bytes = new Uint8Array(await img.arrayBuffer());
    const isJpeg = img.type === "image/jpeg" || img.name.toLowerCase().endsWith(".jpg") || img.name.toLowerCase().endsWith(".jpeg");
    const embedded = isJpeg ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
    const page = doc.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
  }
  return doc.save();
}
