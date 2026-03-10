import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

export async function addWatermark(
  file: File,
  options: {
    text: string;
    opacity: number;
    fontSize: number;
    rotation: number;
    tiled: boolean;
    color: [number, number, number];
  }
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const [r, g, b] = options.color;

  for (let i = 0; i < doc.getPageCount(); i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);

    if (options.tiled) {
      const step = options.fontSize * 4;
      for (let y = 0; y < height + step; y += step) {
        for (let x = -textWidth; x < width + textWidth; x += step + textWidth) {
          page.drawText(options.text, {
            x,
            y,
            size: options.fontSize,
            font,
            color: rgb(r, g, b),
            opacity: options.opacity,
            rotate: degrees(options.rotation),
          });
        }
      }
    } else {
      page.drawText(options.text, {
        x: (width - textWidth) / 2,
        y: (height - options.fontSize) / 2,
        size: options.fontSize,
        font,
        color: rgb(r, g, b),
        opacity: options.opacity,
        rotate: degrees(options.rotation),
      });
    }
  }

  return doc.save();
}
