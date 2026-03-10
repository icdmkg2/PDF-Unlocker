import { PDFDocument } from "pdf-lib";

export async function repairPDF(file: File): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer();
  try {
    const doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    } as Parameters<typeof PDFDocument.load>[1]);
    return doc.save();
  } catch {
    // Fallback: try pdfcpu optimize
    const { Pdfcpu } = await import("pdfcpu-wasm");
    const pdfcpu = new Pdfcpu("/pdfcpu.wasm");
    const inputFile = new File([bytes], "input.pdf", { type: "application/pdf" });
    const result = await pdfcpu.run(
      ["optimize", "/input/input.pdf", "/output/output.pdf"],
      [inputFile]
    );
    const output = await result.readFile("output.pdf", "application/pdf");
    if (!output) throw new Error("pdfcpu repair produced no output");
    return new Uint8Array(await output.arrayBuffer());
  }
}
