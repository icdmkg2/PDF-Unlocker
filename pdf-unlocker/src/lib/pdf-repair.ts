import { PDFDocument } from "pdf-lib";

export interface RepairResult {
  bytes: Uint8Array;
  method: "pdf-lib" | "pdfcpu";
  pageCount: number;
  notes: string[];
}

export async function repairPDF(file: File): Promise<RepairResult> {
  const bytes = await file.arrayBuffer();
  const notes: string[] = [];

  try {
    const doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false,
    } as Parameters<typeof PDFDocument.load>[1]);

    const pageCount = doc.getPageCount();
    notes.push(`Loaded ${pageCount} page(s) with pdf-lib`);
    notes.push("Rebuilt object graph and cross-reference table");

    // Touch pages to force structural rebuild
    for (let i = 0; i < pageCount; i++) {
      doc.getPage(i);
    }

    const saved = await doc.save({ useObjectStreams: false });
    notes.push("Saved without object streams for maximum compatibility");

    return {
      bytes: saved,
      method: "pdf-lib",
      pageCount,
      notes,
    };
  } catch (err) {
    notes.push(`pdf-lib failed: ${err instanceof Error ? err.message : String(err)}`);
    notes.push("Trying pdfcpu optimize fallback…");

    const { Pdfcpu } = await import("pdfcpu-wasm");
    const pdfcpu = new Pdfcpu("/pdfcpu.wasm");
    const inputFile = new File([bytes], "input.pdf", { type: "application/pdf" });
    const result = await pdfcpu.run(
      ["optimize", "/input/input.pdf", "/output/output.pdf"],
      [inputFile]
    );
    const output = await result.readFile("output.pdf", "application/pdf");
    if (!output) throw new Error("pdfcpu repair produced no output");

    const outBytes = new Uint8Array(await output.arrayBuffer());
    let pageCount = 0;
    try {
      const doc = await PDFDocument.load(outBytes, { ignoreEncryption: true });
      pageCount = doc.getPageCount();
    } catch {
      pageCount = 0;
    }

    notes.push("Optimized structure with pdfcpu");
    return { bytes: outBytes, method: "pdfcpu", pageCount, notes };
  }
}
