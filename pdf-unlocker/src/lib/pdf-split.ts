import { PDFDocument } from "pdf-lib";
import { parsePageRanges } from "./pdf-utils";

/** Parse "1-3, 5" into array of 0-based page index groups (one group per comma token). */
export function parseRanges(input: string, maxPage: number): number[][] {
  const tokens = input.split(",").map((t) => t.trim()).filter(Boolean);
  return tokens.map((token) => {
    const pages = parsePageRanges(token, maxPage);
    return pages.map((p) => p - 1);
  });
}

export async function splitPDF(
  file: File,
  ranges: number[][]
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes);
  const results: { name: string; bytes: Uint8Array }[] = [];

  for (const indices of ranges) {
    if (!indices.length) continue;
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, indices);
    for (const p of copied) out.addPage(p);
    const saved = await out.save();
    const first = indices[0] + 1;
    const last = indices[indices.length - 1] + 1;
    const label = indices.length === 1 ? `page-${first}` : `pages-${first}-${last}`;
    results.push({ name: `${label}.pdf`, bytes: saved });
  }

  return results;
}

export async function splitAllPages(file: File): Promise<{ name: string; bytes: Uint8Array }[]> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes);
  const results: { name: string; bytes: Uint8Array }[] = [];
  for (let i = 0; i < src.getPageCount(); i++) {
    const out = await PDFDocument.create();
    const [page] = await out.copyPages(src, [i]);
    out.addPage(page);
    results.push({
      name: `page-${String(i + 1).padStart(3, "0")}.pdf`,
      bytes: await out.save(),
    });
  }
  return results;
}

export async function splitToZip(parts: { name: string; bytes: Uint8Array }[]): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const p of parts) zip.file(p.name, p.bytes);
  return zip.generateAsync({ type: "blob" });
}

export type SplitMode = "extract" | "cut" | "each" | "ranges";

/** Turn the current mode and selection into groups of 0-based page indices. */
export function planParts(mode: SplitMode, pageCount: number, selected: Set<number>, ranges: string): number[][] {
  const all = Array.from({ length: pageCount }, (_, i) => i);
  if (mode === "each") return all.map((i) => [i]);
  if (mode === "extract") return selected.size ? [[...selected].sort((a, b) => a - b)] : [];
  if (mode === "cut") {
    const starts = new Set([0, ...selected]);
    const parts: number[][] = [];
    for (const i of all) {
      if (starts.has(i)) parts.push([]);
      parts[parts.length - 1].push(i);
    }
    return parts.length > 1 ? parts : [];
  }
  return ranges.trim() ? parseRanges(ranges, pageCount).filter((r) => r.length) : [];
}

