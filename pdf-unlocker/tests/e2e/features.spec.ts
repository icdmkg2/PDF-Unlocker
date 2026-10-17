import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { downloadBytes, pageCountOf, pdfFile, upload } from "./fixtures";

async function textOf(bytes: Uint8Array): Promise<string> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    out.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  return out.join("\n");
}

test("OCR makes a scanned PDF searchable", async ({ page }) => {
  test.setTimeout(180_000);
  const scanned = await readFile("tests/fixtures/scanned.pdf");
  expect(await textOf(scanned)).not.toMatch(/fox/);

  await page.goto("/ocr");
  await upload(page, [{ name: "scan.pdf", mimeType: "application/pdf", buffer: scanned }]);
  await page.getByRole("button", { name: "Recognize text" }).click();
  await expect(page.getByTestId("ocr-text")).toContainText("quick brown fox", { timeout: 150_000 });

  const downloading = page.waitForEvent("download");
  await page.getByTestId("result-card").getByRole("button", { name: "Download", exact: true }).click();
  const out = await downloadBytes(await downloading);
  expect(await textOf(out)).toMatch(/quick brown fox/i);
});

test("extract text offers OCR when a PDF has no text", async ({ page }) => {
  await page.goto("/extract-text");
  await upload(page, [{ name: "scan.pdf", mimeType: "application/pdf", buffer: await readFile("tests/fixtures/scanned.pdf") }]);
  await page.getByRole("button", { name: "Extract text", exact: true }).click();
  await page.getByRole("button", { name: "Make it searchable with OCR" }).click();
  await expect(page).toHaveURL(/\/ocr$/);
  await expect(page.getByText("scan.pdf")).toBeVisible();
});

test("batch runs the same steps on every file and zips them", async ({ page }) => {
  await page.goto("/batch");
  await upload(page, [await pdfFile("a.pdf", 2), await pdfFile("b.pdf", 3)]);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Add page numbers", exact: true }).click();
  await page.locator("#batch-pattern").fill("{n}-{name}-done");
  await page.getByRole("button", { name: "Run on 2 files" }).click();
  await expect(page.getByText("All 2 files done")).toBeVisible();

  const downloading = page.waitForEvent("download");
  await page.getByTestId("result-card").getByRole("button", { name: "Download", exact: true }).click();
  const zip = await JSZip.loadAsync(await downloadBytes(await downloading));
  expect(Object.keys(zip.files).sort()).toEqual(["1-a-done.pdf", "2-b-done.pdf"]);
  const b = await zip.file("2-b-done.pdf")!.async("uint8array");
  expect(await pageCountOf(b)).toBe(3);
  expect(await textOf(b)).toMatch(/\b3\b/);
});

test("undo goes back to the previous version across tools", async ({ page }) => {
  await page.goto("/rotate");
  await upload(page, [await pdfFile("report.pdf", 2)]);
  await page.getByRole("button", { name: "Page 1", exact: true }).click();
  await page.getByRole("button", { name: "Turn right 90 degrees" }).click();
  await page.getByRole("button", { name: /Save rotated PDF/ }).click();
  const card = page.getByTestId("result-card");
  await card.getByRole("button", { name: /^Page numbers/ }).click();

  await expect(page).toHaveURL(/\/page-numbers$/);
  await page.getByRole("button", { name: "Add page numbers", exact: true }).click();
  const versions = page.getByRole("list", { name: "Versions" });
  await expect(versions.getByRole("button")).toHaveText(["Original", "Rotate", "Page numbers"]);

  await page.getByTestId("result-card").getByRole("button", { name: "Undo" }).click();
  // Back on page numbers with the compressed file loaded and the numbered version gone.
  await expect(page.getByRole("button", { name: "Add page numbers", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add page numbers", exact: true }).click();
  await expect(versions.getByRole("button")).toHaveText(["Original", "Rotate", "Page numbers"]);

  await versions.getByRole("button", { name: "Original" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download this version" }).click();
  expect((await downloading).suggestedFilename()).toBe("report.pdf");
});

test("edit text replaces a line of existing text", async ({ page }) => {
  await page.goto("/edit");
  await upload(page, [await pdfFile("letter.pdf", 2)]);
  await page.getByRole("button", { name: "Edit text", exact: true }).click();
  await page.getByRole("button", { name: "Edit text: Page 1" }).click();
  await page.keyboard.type("Hello there");
  await expect(page.getByRole("button", { name: "Edit text: Page 1" })).toHaveCount(0);

  await page.getByRole("button", { name: "Save PDF" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByTestId("result-card").getByRole("button", { name: "Download", exact: true }).click();
  const out = await downloadBytes(await downloading);
  // The edited page is flattened, so its old text is gone; the untouched page keeps its text.
  const text = await textOf(out);
  expect(text).not.toMatch(/Page 1/);
  expect(text).toMatch(/Page 2/);
});
