import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PageNumberPosition =
  | "bottom-center"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "top-right"
  | "top-left";

export async function addPageNumbers(
  file: File,
  options: {
    position: PageNumberPosition;
    startFrom: number;
    fontSize: number;
    color: [number, number, number];
  }
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const [r, g, b] = options.color;

  for (let i = 0; i < doc.getPageCount(); i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const text = String(i + options.startFrom);
    const textWidth = font.widthOfTextAtSize(text, options.fontSize);
    const margin = 20;

    let x: number;
    let y: number;

    const pos = options.position;
    if (pos.includes("left")) x = margin;
    else if (pos.includes("right")) x = width - textWidth - margin;
    else x = (width - textWidth) / 2;

    if (pos.includes("top")) y = height - margin - options.fontSize;
    else y = margin;

    page.drawText(text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(r, g, b),
    });
  }

  return doc.save();
}
