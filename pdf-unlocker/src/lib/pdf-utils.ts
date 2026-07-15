/** Shared PDF helpers used across tools. */

export function parsePageRanges(input: string, maxPage: number): number[] {
  const pages = new Set<number>();
  const parts = input.split(",").map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error(`Invalid page: "${part}"`);
    const start = Math.max(1, parseInt(match[1], 10));
    const end = match[2] ? Math.min(maxPage, parseInt(match[2], 10)) : Math.min(maxPage, start);
    if (start > end) throw new Error(`Invalid range: "${part}"`);
    for (let i = start; i <= end; i++) {
      if (i >= 1 && i <= maxPage) pages.add(i);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/** 0-based indices from 1-based range string. */
export function parsePageRangeIndices(input: string, maxPage: number): number[] {
  return parsePageRanges(input, maxPage).map((n) => n - 1);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Revoke after the browser has a chance to start the download
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadBytes(bytes: Uint8Array, filename: string, mime = "application/pdf") {
  const copy = new Uint8Array(bytes);
  downloadBlob(new Blob([copy], { type: mime }), filename);
}

export function revokeUrl(url: string | null | undefined) {
  if (url) URL.revokeObjectURL(url);
}

let pdfjsWorkerReady = false;

export async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjsWorkerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    pdfjsWorkerReady = true;
  }
  return pdfjs;
}

export async function loadPdfDocument(data: ArrayBuffer | Uint8Array) {
  const pdfjs = await getPdfjs();
  // Clone so the original buffer can still be used elsewhere
  const copy = data instanceof Uint8Array ? data.slice() : new Uint8Array(data).slice();
  return pdfjs.getDocument({ data: copy }).promise;
}

export async function isPdfEncrypted(file: File): Promise<boolean> {
  try {
    const bytes = await file.arrayBuffer();
    const pdfjs = await getPdfjs();
    const task = pdfjs.getDocument({ data: new Uint8Array(bytes), password: "" });
    await task.promise;
    return false;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
    return (
      name === "PasswordException" ||
      /password/i.test(msg) ||
      /encrypted/i.test(msg)
    );
  }
}

export async function getPageCount(file: File): Promise<number> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  return doc.getPageCount();
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function canvasToJpegBytes(canvas: HTMLCanvasElement, quality = 0.92): Promise<Uint8Array> {
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrlToBytes(dataUrl);
}

export async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrlToBytes(dataUrl);
}
