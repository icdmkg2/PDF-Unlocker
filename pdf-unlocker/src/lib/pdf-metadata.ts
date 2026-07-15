import { PDFDocument } from "pdf-lib";

export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: string;
  modificationDate: string;
  pageCount: number;
}

function fmtDate(d: Date | undefined): string {
  if (!d) return "";
  try {
    return d.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

export async function readPdfMetadata(file: File): Promise<PdfMetadata> {
  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  return {
    title: doc.getTitle() ?? "",
    author: doc.getAuthor() ?? "",
    subject: doc.getSubject() ?? "",
    keywords: (() => {
      const k = doc.getKeywords();
      if (!k) return "";
      return Array.isArray(k) ? k.join(", ") : String(k);
    })(),
    creator: doc.getCreator() ?? "",
    producer: doc.getProducer() ?? "",
    creationDate: fmtDate(doc.getCreationDate()),
    modificationDate: fmtDate(doc.getModificationDate()),
    pageCount: doc.getPageCount(),
  };
}

export async function writePdfMetadata(
  file: File,
  meta: Partial<Omit<PdfMetadata, "pageCount" | "creationDate" | "modificationDate" | "producer">>
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await file.arrayBuffer());

  if (meta.title !== undefined) doc.setTitle(meta.title);
  if (meta.author !== undefined) doc.setAuthor(meta.author);
  if (meta.subject !== undefined) doc.setSubject(meta.subject);
  if (meta.keywords !== undefined) {
    doc.setKeywords(meta.keywords.split(/[,;]/).map((k) => k.trim()).filter(Boolean));
  }
  if (meta.creator !== undefined) doc.setCreator(meta.creator);
  doc.setModificationDate(new Date());
  doc.setProducer("PDF Studio");

  return doc.save();
}
