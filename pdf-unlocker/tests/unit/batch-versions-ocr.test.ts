import { beforeEach, describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { asFile, makePdf, pageCount } from "../helpers";
import { orderSteps, outputNames, runSteps, validateSteps, type BatchStep } from "@/lib/batch";
import { getChain, noteInput, recordResult, resetChain, rewindTo } from "@/lib/versions";
import { addTextLayer, encodable } from "@/lib/ocr";

describe("batch", () => {
  it("runs unlock first and protect last, keeping the rest in order", () => {
    const steps: BatchStep[] = [
      { kind: "protect", password: "x" },
      { kind: "watermark", text: "A" },
      { kind: "unlock", password: "" },
      { kind: "compress" },
    ];
    expect(orderSteps(steps).map((s) => s.kind)).toEqual(["unlock", "watermark", "compress", "protect"]);
  });

  it("explains settings that would fail every file", () => {
    expect(validateSteps([])).toMatch(/at least one/);
    expect(validateSteps([{ kind: "protect", password: "" }])).toMatch(/password/);
    expect(validateSteps([{ kind: "watermark", text: "  " }])).toMatch(/text/);
    expect(validateSteps([{ kind: "metadata", title: "", author: "" }])).toMatch(/title/);
    expect(validateSteps([{ kind: "compress" }])).toBeNull();
  });

  it("names outputs from a pattern without collisions", () => {
    expect(outputNames("{n}-{name}", ["a.pdf", "b.PDF"])).toEqual(["1-a.pdf", "2-b.pdf"]);
    expect(outputNames("report", ["a.pdf", "b.pdf", "c.pdf"])).toEqual(["report.pdf", "report (2).pdf", "report (3).pdf"]);
    expect(outputNames("x/y:{name}", ["a.pdf"])).toEqual(["x-y-a.pdf"]);
    expect(outputNames("  ", ["a.pdf"])).toEqual(["a.pdf"]);
  });

  it("chains steps on one file", async () => {
    const out = await runSteps(asFile(await makePdf(3)), [
      { kind: "rotate", angle: 90 },
      { kind: "metadata", title: "Batch", author: "" },
    ]);
    const doc = await PDFDocument.load(out);
    expect(await pageCount(out)).toBe(3);
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([90, 90, 90]);
    expect(doc.getTitle()).toBe("Batch");
  });
});

describe("versions", () => {
  beforeEach(() => resetChain());
  const pdf = (name: string) => new File(["%PDF"], name, { type: "application/pdf" });

  it("a fresh single PDF starts a chain; several files start none", () => {
    noteInput([pdf("a.pdf")], true);
    expect(getChain().map((v) => v.tool)).toEqual([null]);
    noteInput([pdf("a.pdf"), pdf("b.pdf")], true);
    expect(getChain()).toEqual([]);
  });

  it("records results, replacing a re-run of the same tool", () => {
    noteInput([pdf("a.pdf")], true);
    recordResult("/compress", new Blob(["1"]), "a.pdf");
    recordResult("/compress", new Blob(["2"]), "a.pdf");
    recordResult("/rotate", new Blob(["3"]), "a.pdf");
    expect(getChain().map((v) => v.tool)).toEqual([null, "/compress", "/rotate"]);
  });

  it("the same result is recorded once", () => {
    const blob = new Blob(["1"]);
    recordResult("/compress", blob, "a.pdf");
    recordResult("/compress", blob, "a.pdf");
    expect(getChain()).toHaveLength(1);
  });

  it("opening an earlier version cuts off what came after it", () => {
    noteInput([pdf("a.pdf")], true);
    const first = recordResult("/compress", new Blob(["1"]), "a.pdf");
    recordResult("/rotate", new Blob(["2"]), "a.pdf");
    noteInput([first.file], false);
    expect(getChain().map((v) => v.tool)).toEqual([null, "/compress"]);
    rewindTo(getChain()[0].id);
    expect(getChain()).toHaveLength(1);
  });
});

describe("OCR text layer", () => {
  it("replaces characters the standard font can't encode", async () => {
    const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    expect(encodable(font, "It’s “fine” — 漢 ✓")).toBe("It’s “fine” — ? ?");
  });

  it("writes invisible text that a reader can find", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([300, 200]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    addTextLayer(page, font, [{ text: "Searchable words", x0: 20, y0: 100, x1: 220, y1: 100, size: 14 }]);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loaded = await pdfjs.getDocument({ data: await doc.save() }).promise;
    const content = await (await loaded.getPage(1)).getTextContent();
    const items = content.items.filter((it) => "str" in it && it.str);
    expect(items.map((it) => ("str" in it ? it.str : "")).join("")).toBe("Searchable words");
    // Stretched to the measured width so selection lines up with the scan.
    expect("width" in items[0] && items[0].width).toBeGreaterThan(198);
    expect("width" in items[0] && items[0].width).toBeLessThan(202);
  });
});
