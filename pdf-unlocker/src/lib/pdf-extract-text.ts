import { loadPdfDocument } from "./pdf-utils";

export async function extractTextFromPDF(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<string> {
  const bytes = await file.arrayBuffer();
  const pdf = await loadPdfDocument(bytes);
  const parts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(i, pdf.numPages);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    parts.push(`--- Page ${i} ---\n${line}`);
  }

  return parts.join("\n\n");
}
