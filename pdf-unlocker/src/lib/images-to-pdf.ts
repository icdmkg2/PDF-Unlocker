import { PDFDocument } from "pdf-lib";

export type ImagePageMode = "native" | "a4-fit" | "a4-fill";

const A4W = 595;
const A4H = 842;

async function fileToEmbeddable(
  doc: PDFDocument,
  img: File
): Promise<{ width: number; height: number; draw: (page: import("pdf-lib").PDFPage, x: number, y: number, w: number, h: number) => void }> {
  const type = img.type || "";
  const name = img.name.toLowerCase();

  // Convert WebP/GIF/AVIF/etc via canvas to PNG
  if (
    type === "image/webp" ||
    type === "image/gif" ||
    type === "image/avif" ||
    type === "image/bmp" ||
    name.endsWith(".webp") ||
    name.endsWith(".gif") ||
    name.endsWith(".avif") ||
    name.endsWith(".bmp")
  ) {
    const bitmap = await createImageBitmap(img);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    bitmap.close();
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const pngBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const embedded = await doc.embedPng(pngBytes as Uint8Array<ArrayBuffer>);
    return {
      width: embedded.width,
      height: embedded.height,
      draw: (page, x, y, w, h) => page.drawImage(embedded, { x, y, width: w, height: h }),
    };
  }

  const bytes = new Uint8Array(await img.arrayBuffer());
  const isJpeg =
    type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg");
  const embedded = isJpeg
    ? await doc.embedJpg(bytes as Uint8Array<ArrayBuffer>)
    : await doc.embedPng(bytes as Uint8Array<ArrayBuffer>);

  return {
    width: embedded.width,
    height: embedded.height,
    draw: (page, x, y, w, h) => page.drawImage(embedded, { x, y, width: w, height: h }),
  };
}

export async function imagesToPDF(
  images: File[],
  mode: ImagePageMode = "native"
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  for (const img of images) {
    const embedded = await fileToEmbeddable(doc, img);

    if (mode === "native") {
      // Cap enormous pages so PDF viewers don't choke (max ~2000pt)
      const maxDim = 2000;
      let w = embedded.width;
      let h = embedded.height;
      if (w > maxDim || h > maxDim) {
        const s = maxDim / Math.max(w, h);
        w *= s;
        h *= s;
      }
      const page = doc.addPage([w, h]);
      embedded.draw(page, 0, 0, w, h);
      continue;
    }

    const page = doc.addPage([A4W, A4H]);
    const scale =
      mode === "a4-fit"
        ? Math.min(A4W / embedded.width, A4H / embedded.height)
        : Math.max(A4W / embedded.width, A4H / embedded.height);
    const w = embedded.width * scale;
    const h = embedded.height * scale;
    const x = (A4W - w) / 2;
    const y = (A4H - h) / 2;
    embedded.draw(page, x, y, w, h);
  }

  return doc.save();
}
