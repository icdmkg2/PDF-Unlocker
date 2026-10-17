import { asPdfcpuInput, runPdfcpu } from "./pdfcpu";

export interface ExtractedImage {
  name: string;
  bytes: Uint8Array;
  page: number;
}

/**
 * Extract the images embedded in a PDF in their original encoding
 * (JPEG stays JPEG, no re-rendering). Pages with no embedded images,
 * such as pure vector or text pages, yield nothing.
 */
export async function extractImagesFromPDF(file: File): Promise<ExtractedImage[]> {
  const out = await runPdfcpu(
    ["extract", "-mode", "image", "/input/input.pdf", "/output"],
    [await asPdfcpuInput(file)]
  );

  // pdfcpu names files "<input>_<page>_<resource>.<ext>"
  return out
    .list()
    .map(({ path, bytes }) => {
      const match = path.match(/^input_(\d+)_(.+)$/);
      const page = match ? Number(match[1]) : 0;
      const name = match ? `page-${match[1].padStart(3, "0")}_${match[2]}` : path;
      return { name, bytes, page };
    })
    .sort((a, b) => a.page - b.page || a.name.localeCompare(b.name));
}

export async function zipImages(images: ExtractedImage[]): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const img of images) zip.file(img.name, img.bytes);
  return zip.generateAsync({ type: "blob" });
}
