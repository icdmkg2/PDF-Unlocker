import { PDFDocument } from "pdf-lib";

export interface PdfFacts {
  name: string;
  size: number;
  /** Null when the file is encrypted or too damaged to count pages. */
  pages: number | null;
  encrypted: boolean;
  formFields: number;
  /** pdf-lib could not parse it at all. */
  damaged: boolean;
}

/** Quick, local look at a PDF to decide which tools make sense for it. */
export async function inspectPdf(file: File): Promise<PdfFacts> {
  const facts: PdfFacts = {
    name: file.name,
    size: file.size,
    pages: null,
    encrypted: false,
    formFields: 0,
    damaged: false,
  };
  try {
    const doc = await PDFDocument.load(await file.arrayBuffer(), {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    facts.encrypted = doc.isEncrypted;
    if (!facts.encrypted) {
      facts.pages = doc.getPageCount();
      try {
        facts.formFields = doc.getForm().getFields().length;
      } catch {
        // malformed AcroForm; treat as no fields
      }
    }
  } catch {
    facts.damaged = true;
  }
  return facts;
}
