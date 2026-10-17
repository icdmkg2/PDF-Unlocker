import type { PDFDocumentProxy } from "pdfjs-dist";

async function renderPage(doc: PDFDocumentProxy, index: number, scale: number): Promise<HTMLCanvasElement | null> {
  if (index >= doc.numPages) return null;
  const page = await doc.getPage(index + 1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvasContext: canvas.getContext("2d")!, canvas, viewport }).promise;
  return canvas;
}

/** Mark pixels whose average channel difference exceeds `threshold`. Returns how many changed. */
export function diffPixels(a: Uint8ClampedArray, b: Uint8ClampedArray, out: Uint8ClampedArray, threshold = 12): number {
  let changed = 0;
  for (let i = 0; i < out.length; i += 4) {
    const delta = (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3;
    if (delta > threshold) {
      changed++;
      out[i] = 230;
      out[i + 1] = 40;
      out[i + 2] = 40;
      out[i + 3] = 150;
    } else {
      out[i + 3] = 0;
    }
  }
  return changed;
}

/** Below this many differing pixels a page counts as unchanged (anti-aliasing noise). */
export const NOISE_PIXELS = 8;

/**
 * Compare one page of two documents. Returns a transparent overlay with
 * changed pixels in red, the share of the page that changed, and whether
 * anything changed at all. A page missing from either side counts as fully
 * changed.
 */
export async function comparePage(a: PDFDocumentProxy, b: PDFDocumentProxy, index: number, scale = 1.25) {
  const [ca, cb] = await Promise.all([renderPage(a, index, scale), renderPage(b, index, scale)]);
  if (!ca || !cb) return { overlay: null, changed: 1, differs: true };
  const w = Math.max(ca.width, cb.width);
  const h = Math.max(ca.height, cb.height);
  const read = (c: HTMLCanvasElement) => {
    const t = document.createElement("canvas");
    t.width = w;
    t.height = h;
    const ctx = t.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(c, 0, 0);
    return ctx.getImageData(0, 0, w, h).data;
  };
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  const img = octx.createImageData(w, h);
  const pixels = diffPixels(read(ca), read(cb), img.data);
  octx.putImageData(img, 0, 0);
  const differs = pixels >= NOISE_PIXELS;
  return { overlay: differs ? out.toDataURL("image/png") : null, changed: pixels / (w * h), differs };
}

export async function extractAllText(doc: PDFDocumentProxy): Promise<string> {
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    parts.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return parts.join("\n");
}
