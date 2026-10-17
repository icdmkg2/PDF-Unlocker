import { PDFDocument, StandardFonts } from "pdf-lib";
import { deflateSync } from "node:zlib";

/** A PDF with one line of text per page, e.g. "Page 1". */
export async function makePdf(pages = 1, label = "Page"): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    doc.addPage([300, 400]).drawText(`${label} ${i}`, { x: 40, y: 340, size: 18, font });
  }
  return doc.save();
}

/** A PDF that embeds the given PNG on its first page. */
export async function makePdfWithImage(png: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const img = await doc.embedPng(png);
  const page = doc.addPage([300, 400]);
  page.drawText("Has an image", { x: 40, y: 360, size: 14 });
  page.drawImage(img, { x: 50, y: 50, width: 200, height: 200 });
  return doc.save();
}

/** Minimal solid-color RGB PNG encoder, so tests need no binary fixtures. */
export function makePng(width: number, height: number, rgb: [number, number, number]): Uint8Array {
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) row.set(rgb, 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ])
  );
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

export function asFile(bytes: Uint8Array, name = "test.pdf"): File {
  return new File([bytes as Uint8Array<ArrayBuffer>], name, { type: "application/pdf" });
}

export async function pageCount(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}
