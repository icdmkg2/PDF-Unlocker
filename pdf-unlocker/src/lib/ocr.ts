import {
  PDFDocument,
  StandardFonts,
  TextRenderingMode,
  beginText,
  endText,
  popGraphicsState,
  pushGraphicsState,
  setFontAndSize,
  setTextMatrix,
  setTextRenderingMode,
  showText,
  type PDFFont,
  type PDFName,
} from "pdf-lib";
import { loadPdfDocument } from "./pdf-utils";

/** A recognized line, in PDF points: baseline start, direction, size. */
export interface OcrLine {
  text: string;
  /** Baseline start and end in PDF user space. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Line height in points. */
  size: number;
}

export interface OcrPage {
  index: number;
  lines: OcrLine[];
  text: string;
  /** True when the page already had a text layer and was left alone. */
  skipped: boolean;
}

/** Pages with at least this many characters of real text are treated as already searchable. */
const HAS_TEXT_CHARS = 20;
/** Render scale for recognition (~144 dpi). Higher is slower with little gain for print. */
const SCALE = 2;

/** Replace characters the standard font can't encode, so writing the text layer never fails. */
export function encodable(font: PDFFont, text: string): string {
  const set = new Set(font.getCharacterSet());
  return Array.from(text)
    .map((c) => (set.has(c.codePointAt(0)!) ? c : c === "’" || c === "‘" ? "'" : c === "“" || c === "”" ? '"' : c === "—" || c === "–" ? "-" : "?"))
    .join("");
}

/**
 * Write lines as invisible text over a page: rendering mode 3 draws nothing
 * but keeps the text selectable and searchable. Each line is stretched
 * horizontally to the width Tesseract measured so selection lines up.
 */
export function addTextLayer(page: import("pdf-lib").PDFPage, font: PDFFont, lines: OcrLine[]): void {
  if (!lines.length) return;
  page.setFont(font);
  const fontKey = (page as unknown as { fontKey: PDFName }).fontKey;
  const ops = [pushGraphicsState(), beginText(), setTextRenderingMode(TextRenderingMode.Invisible)];
  for (const line of lines) {
    const text = encodable(font, line.text);
    const natural = font.widthOfTextAtSize(text, line.size);
    const length = Math.hypot(line.x1 - line.x0, line.y1 - line.y0);
    if (!text.trim() || natural <= 0 || length <= 0) continue;
    const cos = (line.x1 - line.x0) / length;
    const sin = (line.y1 - line.y0) / length;
    const stretch = length / natural;
    ops.push(setFontAndSize(fontKey, line.size), setTextMatrix(stretch * cos, stretch * sin, -sin, cos, line.x0, line.y0), showText(font.encodeText(text)));
  }
  ops.push(endText(), popGraphicsState());
  page.pushOperators(...ops);
}

type Bbox = { x0: number; y0: number; x1: number; y1: number };
type TessLine = { text: string; bbox: Bbox; confidence: number };
type TessBlock = { paragraphs: { lines: TessLine[] }[] };

/**
 * Recognize text on every page and return a copy of the PDF with an
 * invisible, searchable text layer. The visible pages are untouched.
 */
export async function ocrPdf(
  file: File,
  options: { redoTextPages?: boolean; onProgress?: (message: string, done: number, total: number) => void } = {}
): Promise<{ bytes: Uint8Array; pages: OcrPage[] }> {
  const original = await file.arrayBuffer();
  const pdf = await loadPdfDocument(original);
  const total = pdf.numPages;
  const report = (m: string, d: number) => options.onProgress?.(m, d, total);

  report("Loading the OCR engine (first run downloads about 7 MB from this site)…", 0);
  const { createWorker } = await import("tesseract.js");
  let current = 0;
  const worker = await createWorker("eng", 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr/core",
    langPath: "/ocr/lang",
    gzip: true,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") report(`Reading page ${current + 1} of ${total} · ${Math.round(m.progress * 100)}%`, current);
    },
  });

  const pages: OcrPage[] = [];
  try {
    for (let i = 0; i < total; i++) {
      current = i;
      const page = await pdf.getPage(i + 1);
      if (!options.redoTextPages) {
        const content = await page.getTextContent();
        const chars = content.items.reduce((n, it) => n + ("str" in it ? it.str.trim().length : 0), 0);
        if (chars >= HAS_TEXT_CHARS) {
          pages.push({ index: i, lines: [], text: content.items.map((it) => ("str" in it ? it.str : "")).join(" "), skipped: true });
          continue;
        }
      }
      report(`Reading page ${i + 1} of ${total}…`, i);
      const viewport = page.getViewport({ scale: SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, canvas, viewport }).promise;

      const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
      const blocks = ((data as unknown as { blocks: TessBlock[] | null }).blocks ?? []) as TessBlock[];
      const lines: OcrLine[] = [];
      for (const b of blocks)
        for (const p of b.paragraphs)
          for (const l of p.lines) {
            const text = l.text.replace(/\s+/g, " ").trim();
            if (!text || l.confidence < 30) continue;
            // Baseline approximated by the box bottom; convert to PDF space (handles rotation and crop offsets).
            const [x0, y0] = viewport.convertToPdfPoint(l.bbox.x0, l.bbox.y1);
            const [x1, y1] = viewport.convertToPdfPoint(l.bbox.x1, l.bbox.y1);
            const [tx, ty] = viewport.convertToPdfPoint(l.bbox.x0, l.bbox.y0);
            lines.push({ text, x0, y0, x1, y1, size: Math.max(1, Math.hypot(tx - x0, ty - y0) * 0.9) });
          }
      pages.push({ index: i, lines, text: data.text.trim(), skipped: false });
      canvas.width = canvas.height = 0;
    }
  } finally {
    await worker.terminate();
  }

  report("Writing the searchable PDF…", total);
  const doc = await PDFDocument.load(original);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const p of pages) if (!p.skipped) addTextLayer(doc.getPage(p.index), font, p.lines);
  return { bytes: await doc.save(), pages };
}
