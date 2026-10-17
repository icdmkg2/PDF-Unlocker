import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { asFile, makePdf, makePdfWithImage, makePng, pageCount } from "../helpers";
import { protectPDF } from "@/lib/pdf-protect";
import { unlockPDF, unlockWithAny } from "@/lib/pdf-unlock";
import { compressLossless } from "@/lib/pdf-compress";
import { extractImagesFromPDF } from "@/lib/pdf-extract-images";

const isEncrypted = async (bytes: Uint8Array) => {
  try {
    const doc = await PDFDocument.load(bytes);
    return doc.isEncrypted;
  } catch {
    return true;
  }
};

describe("protect and unlock", async () => {
  const locked = await protectPDF(asFile(await makePdf(2)), "open-sesame", "");

  it("protect produces an encrypted PDF", async () => {
    expect(await isEncrypted(locked)).toBe(true);
  });

  it("unlock reports a wrong password clearly", async () => {
    const r = await unlockPDF(asFile(locked), "nope");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.wrongPassword).toBe(true);
      expect(r.message).toMatch(/didn't work/);
    }
  });

  it("unlock asks for a password when none is given", async () => {
    const r = await unlockPDF(asFile(locked));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/needs a password/);
  });

  it("unlock with the right password returns a readable, unencrypted PDF", async () => {
    const r = await unlockPDF(asFile(locked), "open-sesame");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(await isEncrypted(r.bytes)).toBe(false);
      expect(await pageCount(r.bytes)).toBe(2);
    }
  });

  it("tries saved passwords in order and reports which worked", async () => {
    const tried: number[] = [];
    const r = await unlockWithAny(asFile(locked), ["a", "b", "open-sesame", "never-tried"], (i) => tried.push(i));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.password).toBe("open-sesame");
    expect(tried).toEqual([0, 1, 2]);
  });

  it("says so when no saved password works", async () => {
    const r = await unlockWithAny(asFile(locked), ["a", "b"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/None of your saved passwords/);
  });
});

describe("lossless compress", () => {
  it("keeps every page and never grows the file", async () => {
    const input = await makePdf(4);
    const out = await compressLossless(asFile(input));
    expect(await pageCount(out)).toBe(4);
    expect(out.length).toBeLessThanOrEqual(input.length);
  });

  it("shrinks a PDF with a duplicated image", async () => {
    const png = makePng(200, 200, [200, 40, 40]);
    const doc = await PDFDocument.create();
    for (let i = 0; i < 3; i++) {
      // Embedding the same image per page stores three copies; optimize should dedupe them.
      const img = await doc.embedPng(png);
      doc.addPage([300, 300]).drawImage(img, { x: 0, y: 0, width: 300, height: 300 });
    }
    const input = await doc.save();
    const out = await compressLossless(asFile(input));
    expect(out.length).toBeLessThan(input.length);
  });
});

describe("extract images", () => {
  it("returns the embedded image, tagged with its page", async () => {
    const images = await extractImagesFromPDF(asFile(await makePdfWithImage(makePng(64, 32, [0, 120, 255]))));
    expect(images).toHaveLength(1);
    expect(images[0].page).toBe(1);
    expect(images[0].name).toMatch(/^page-001_.+\.png$/);
    // PNG signature
    expect(Array.from(images[0].bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("returns nothing for a text-only PDF", async () => {
    expect(await extractImagesFromPDF(asFile(await makePdf(2)))).toEqual([]);
  });
});
