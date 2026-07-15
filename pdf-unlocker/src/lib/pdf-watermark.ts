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
    imageDataUrl?: string | null;
    imageScale?: number;
  }
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const [r, g, b] = options.color;

  let embeddedImg: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  if (options.imageDataUrl) {
    const base64 = options.imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const isJpeg = options.imageDataUrl.startsWith("data:image/jpeg");
    embeddedImg = isJpeg
      ? await doc.embedJpg(imgBytes as Uint8Array<ArrayBuffer>)
      : await doc.embedPng(imgBytes as Uint8Array<ArrayBuffer>);
  }

  for (let i = 0; i < doc.getPageCount(); i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();

    if (embeddedImg) {
      const scale = options.imageScale ?? 0.35;
      const w = embeddedImg.width * scale;
      const h = embeddedImg.height * scale;
      if (options.tiled) {
        const stepX = w * 1.5;
        const stepY = h * 1.5;
        for (let y = 0; y < height + stepY; y += stepY) {
          for (let x = 0; x < width + stepX; x += stepX) {
            page.drawImage(embeddedImg, {
              x,
              y,
              width: w,
              height: h,
              opacity: options.opacity,
              rotate: degrees(options.rotation),
            });
          }
        }
      } else {
        page.drawImage(embeddedImg, {
          x: (width - w) / 2,
          y: (height - h) / 2,
          width: w,
          height: h,
          opacity: options.opacity,
          rotate: degrees(options.rotation),
        });
      }
      continue;
    }

    if (!options.text.trim()) continue;
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
