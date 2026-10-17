import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import type { Download, Page } from "@playwright/test";
import { makePdf } from "../helpers";

export async function pdfFile(name: string, pages = 1) {
  return { name, mimeType: "application/pdf", buffer: Buffer.from(await makePdf(pages)) };
}

export async function upload(page: Page, files: { name: string; mimeType: string; buffer: Buffer }[]) {
  await page.locator('input[type="file"]').first().setInputFiles(files);
}

export async function downloadBytes(download: Download): Promise<Buffer> {
  const path = await download.path();
  return readFile(path!);
}

export async function pageCountOf(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}
