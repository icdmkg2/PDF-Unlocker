import { PDFDocument } from "pdf-lib";

/** Parse a range string like "1-3, 5, 7-9" into 0-indexed page arrays */
export function parseRanges(input: string, totalPages: number): number[][] {
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.map((part) => {
    const match = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error(`Invalid range: "${part}"`);
    const start = Math.max(1, parseInt(match[1]));
    const end = match[2] ? Math.min(totalPages, parseInt(match[2])) : start;
    if (start > end) throw new Error(`Invalid range: "${part}"`);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i - 1); // 0-indexed
    return pages;
  });
}

export async function splitPDF(
  file: File,
  ranges: number[][]
): Promise<{ bytes: Uint8Array; name: string }[]> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes);

  const results: { bytes: Uint8Array; name: string }[] = [];
  const baseName = file.name.replace(/\.pdf$/i, "");

  for (let i = 0; i < ranges.length; i++) {
    const doc = await PDFDocument.create();
    const pages = await doc.copyPages(src, ranges[i]);
    for (const page of pages) doc.addPage(page);
    const saved = await doc.save();
    results.push({
      bytes: saved,
      name: `${baseName}_part${i + 1}.pdf`,
    });
  }

  return results;
}
