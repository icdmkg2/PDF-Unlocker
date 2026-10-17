import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { asFile, makePdf } from "../helpers";
import { inspectPdf, type PdfFacts } from "@/lib/pdf-inspect";
import { suggestTools } from "@/lib/suggest-tools";
import { setHandoff, takeHandoff } from "@/lib/handoff";
import { protectPDF } from "@/lib/pdf-protect";

const facts = (over: Partial<PdfFacts> = {}): PdfFacts => ({
  name: "a.pdf", size: 100_000, pages: 3, encrypted: false, formFields: 0, damaged: false, ...over,
});

describe("inspectPdf", () => {
  it("reads pages and form fields", async () => {
    const doc = await PDFDocument.create();
    doc.addPage(); doc.addPage();
    doc.getForm().createTextField("name").addToPage(doc.getPage(0), { x: 10, y: 10, width: 100, height: 20 });
    const f = await inspectPdf(asFile(await doc.save()));
    expect(f).toMatchObject({ pages: 2, formFields: 1, encrypted: false, damaged: false });
  });

  it("detects encrypted files", async () => {
    const locked = await protectPDF(asFile(await makePdf(1)), "pw", "");
    expect(await inspectPdf(asFile(locked))).toMatchObject({ encrypted: true, pages: null });
  });

  it("flags files that aren't PDFs at all", async () => {
    const f = await inspectPdf(new File(["hello"], "x.pdf"));
    expect(f.damaged).toBe(true);
  });
});

describe("suggestTools", () => {
  const hrefs = (f: PdfFacts[]) => suggestTools(f).map((s) => s.href);

  it("only offers Unlock for a locked file", () => {
    expect(hrefs([facts({ encrypted: true, pages: null })])).toEqual(["/unlock"]);
  });

  it("only offers Repair for a damaged file", () => {
    expect(hrefs([facts({ damaged: true })])).toEqual(["/repair"]);
  });

  it("leads with Fill forms when the file has fields", () => {
    expect(hrefs([facts({ formFields: 2 })])[0]).toBe("/forms");
  });

  it("leads with Compress for large files and doesn't list it twice", () => {
    const list = hrefs([facts({ size: 20 * 1024 * 1024 })]);
    expect(list[0]).toBe("/compress");
    expect(list.filter((h) => h === "/compress")).toHaveLength(1);
  });

  it("skips page tools for a single page and caps the list at six", () => {
    const one = hrefs([facts({ pages: 1 })]);
    expect(one).not.toContain("/split");
    expect(hrefs([facts({ pages: 9, formFields: 1, size: 9e6 })]).length).toBeLessThanOrEqual(6);
  });

  it("offers Merge first for several files", () => {
    expect(hrefs([facts(), facts()])[0]).toBe("/merge");
  });
});

describe("handoff", () => {
  it("hands files over once", () => {
    const f = asFile(new Uint8Array([1]));
    setHandoff([f]);
    expect(takeHandoff()).toEqual([f]);
    expect(takeHandoff()).toBeNull();
  });

  it("clears when given nothing", () => {
    setHandoff([asFile(new Uint8Array([1]))]);
    setHandoff([]);
    expect(takeHandoff()).toBeNull();
  });
});
