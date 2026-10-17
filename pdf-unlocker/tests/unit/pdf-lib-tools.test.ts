import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { asFile, makePdf, pageCount } from "../helpers";
import { mergePDFs } from "@/lib/pdf-merge";
import { splitPDF } from "@/lib/pdf-split";
import { rotatePDF } from "@/lib/pdf-rotate";
import { reorderPages } from "@/lib/pdf-organize";
import { addPageNumbers } from "@/lib/pdf-page-numbers";
import { addWatermark } from "@/lib/pdf-watermark";
import { readPdfMetadata, writePdfMetadata } from "@/lib/pdf-metadata";

describe("pdf-lib tools", () => {
  it("merges files in order", async () => {
    const out = await mergePDFs([asFile(await makePdf(2)), asFile(await makePdf(3))]);
    expect(await pageCount(out)).toBe(5);
  });

  it("splits into named parts", async () => {
    const parts = await splitPDF(asFile(await makePdf(5)), [[0, 1], [4]]);
    expect(parts.map((p) => p.name)).toEqual(["pages-1-2.pdf", "page-5.pdf"]);
    expect(await pageCount(parts[0].bytes)).toBe(2);
  });

  it("rotates only the chosen pages", async () => {
    const doc = await PDFDocument.load(await rotatePDF(asFile(await makePdf(3)), [1], 90));
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([0, 90, 0]);
  });

  it("reorders and drops pages", async () => {
    const src = await PDFDocument.create();
    for (const w of [100, 200, 300]) src.addPage([w, 100]);
    const out = await PDFDocument.load(await reorderPages(asFile(await src.save()), [2, 0]));
    expect(out.getPages().map((p) => p.getWidth())).toEqual([300, 100]);
  });

  it("adds page numbers and watermarks without changing page count", async () => {
    const file = asFile(await makePdf(3));
    const numbered = await addPageNumbers(file, { position: "bottom-center", startFrom: 1, fontSize: 10, color: [0, 0, 0] });
    expect(await pageCount(numbered)).toBe(3);
    const marked = await addWatermark(file, { text: "DRAFT", opacity: 0.3, fontSize: 40, rotation: 45, tiled: false, color: [1, 0, 0] });
    expect(await pageCount(marked)).toBe(3);
    expect(marked.length).toBeGreaterThan((await makePdf(3)).length);
  });

  it("writes and reads back metadata", async () => {
    const out = await writePdfMetadata(asFile(await makePdf(1)), { title: "Report", author: "Ada", keywords: "a, b" });
    const meta = await readPdfMetadata(asFile(out));
    expect(meta.title).toBe("Report");
    expect(meta.author).toBe("Ada");
  });
});

describe("split planning", async () => {
  const { planParts } = await import("@/lib/pdf-split");
  it("pulls selected pages into one file", () => {
    expect(planParts("extract", 5, new Set([3, 0]), "")).toEqual([[0, 3]]);
  });
  it("cuts before each selected page", () => {
    expect(planParts("cut", 6, new Set([2, 4]), "")).toEqual([[0, 1], [2, 3], [4, 5]]);
  });
  it("needs at least one cut to make parts", () => {
    expect(planParts("cut", 3, new Set([0]), "")).toEqual([]);
  });
  it("makes one file per page", () => {
    expect(planParts("each", 3, new Set(), "")).toEqual([[0], [1], [2]]);
  });
  it("reads typed ranges", () => {
    expect(planParts("ranges", 9, new Set(), "1-2, 9")).toEqual([[0, 1], [8]]);
  });
});

describe("watermark centering", async () => {
  const { centeredOrigin } = await import("@/lib/pdf-watermark");
  it("puts an unrotated box's middle on the point", () => {
    expect(centeredOrigin(300, 400, 100, 20, 0)).toEqual({ x: 250, y: 390 });
  });
  it("keeps a rotated box centered", () => {
    const { x, y } = centeredOrigin(300, 400, 100, 20, 90);
    // Rotated 90° about its origin, the box's middle is at origin + (-h/2, w/2).
    expect(x - 10).toBeCloseTo(300);
    expect(y + 50).toBeCloseTo(400);
  });
});

describe("form fields", async () => {
  const { listFormFields } = await import("@/lib/pdf-forms");
  it("reports field types and where each field sits", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const form = doc.getForm();
    form.createTextField("name").addToPage(page, { x: 100, y: 700, width: 200, height: 20 });
    form.createCheckBox("agree").addToPage(page, { x: 100, y: 650, width: 12, height: 12 });
    const fields = await listFormFields(asFile(await doc.save()));
    expect(fields.map((f) => f.type)).toEqual(["Text", "CheckBox"]);
    // pdf-lib pads the widget by half its border width
    const w = fields[0].widgets[0];
    expect(w.pageIndex).toBe(0);
    expect(Math.abs(w.x - 100)).toBeLessThanOrEqual(1);
    expect(Math.abs(w.y - 80)).toBeLessThanOrEqual(1);
    expect(Math.abs(w.width - 200)).toBeLessThanOrEqual(2);
  });
});

describe("pixel diff", async () => {
  const { diffPixels } = await import("@/lib/pdf-compare");
  it("counts and marks only pixels that differ", () => {
    const a = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    const b = new Uint8ClampedArray([255, 255, 255, 255, 255, 255, 255, 255]);
    const out = new Uint8ClampedArray(8);
    expect(diffPixels(a, b, out)).toBe(1);
    expect(out[3]).toBe(0);
    expect(out[7]).toBeGreaterThan(0);
  });
});
