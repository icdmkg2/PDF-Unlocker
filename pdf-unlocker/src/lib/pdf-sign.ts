import { PDFDocument } from "pdf-lib";

export async function signPDF(
  file: File,
  signaturePngDataUrl: string,
  placement: { pageIndex: number; x: number; y: number; width: number; height: number }
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);

  const base64 = signaturePngDataUrl.replace(/^data:image\/png;base64,/, "");
  const pngBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const img = await doc.embedPng(pngBytes);

  const page = doc.getPage(placement.pageIndex);
  const { height } = page.getSize();

  page.drawImage(img, {
    x: placement.x,
    y: height - placement.y - placement.height,
    width: placement.width,
    height: placement.height,
  });

  return doc.save();
}
