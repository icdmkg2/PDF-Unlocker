import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PageNumberPosition =
  | "bottom-center"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "top-right"
  | "top-left";

export type PageNumberFormat = "number" | "page-n" | "page-n-of-m";

export async function addPageNumbers(
  file: File,
  options: {
    position: PageNumberPosition;
    startFrom: number;
    fontSize: number;
    color: [number, number, number];
    format?: PageNumberFormat;
    skipFirst?: boolean;
  }
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const [r, g, b] = options.color;
  const total = doc.getPageCount();
  const format = options.format ?? "number";

  for (let i = 0; i < total; i++) {
    if (options.skipFirst && i === 0) continue;

    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const n = i + options.startFrom;
    const text =
      format === "page-n-of-m"
        ? `Page ${n} of ${total + options.startFrom - 1}`
        : format === "page-n"
          ? `Page ${n}`
          : String(n);

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
