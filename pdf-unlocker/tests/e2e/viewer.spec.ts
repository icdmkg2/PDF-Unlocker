import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { downloadBytes, pdfFile, upload } from "./fixtures";

async function formPdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const form = doc.getForm();
  form.createTextField("Tenant name").addToPage(page, { x: 160, y: 600, width: 250, height: 22 });
  form.createCheckBox("Pets allowed").addToPage(page, { x: 60, y: 560, width: 16, height: 16 });
  return { name: "lease.pdf", mimeType: "application/pdf", buffer: Buffer.from(await doc.save()) };
}

const download = async (page: import("@playwright/test").Page) => {
  const downloading = page.waitForEvent("download");
  await page.getByTestId("result-card").getByRole("button", { name: "Download" }).click();
  return downloadBytes(await downloading);
};

test("fill forms types into fields on the page and saves them", async ({ page }) => {
  await page.goto("/forms");
  await upload(page, [await formPdf()]);
  await page.getByLabel("Tenant name").fill("Dana Okafor");
  await page.getByLabel("Pets allowed").check();
  await expect(page.getByText("2 of 2 fields filled")).toBeVisible();
  await page.getByLabel("Lock fields after filling").uncheck();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const form = (await PDFDocument.load(await download(page))).getForm();
  expect(form.getTextField("Tenant name").getText()).toBe("Dana Okafor");
  expect(form.getCheckBox("Pets allowed").isChecked()).toBe(true);
});

test("sign: draw, drag into place, and stamp", async ({ page }) => {
  await page.goto("/sign");
  await upload(page, [await pdfFile("contract.pdf", 2)]);
  const pad = page.getByLabel("Signature drawing area");
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 100);
  await page.mouse.down();
  for (let i = 0; i < 30; i++) await page.mouse.move(box.x + 40 + i * 8, box.y + 100 - Math.sin(i / 3) * 25);
  await page.mouse.up();
  await page.getByRole("button", { name: "Use this signature" }).click();

  const sig = page.getByRole("img", { name: "Signature, drag to move" });
  await expect(sig).toBeVisible();
  const before = (await sig.boundingBox())!;
  await page.mouse.move(before.x + 10, before.y + 10);
  await page.mouse.down();
  await page.mouse.move(before.x - 150, before.y - 200, { steps: 6 });
  await page.mouse.up();
  const after = (await sig.boundingBox())!;
  expect(after.y).toBeLessThan(before.y - 100);

  await page.getByRole("button", { name: "Sign", exact: true }).click();
  await expect(page.getByTestId("result-card")).toContainText("Signed on page 1");
  const bytes = await download(page);
  expect(bytes.length).toBeGreaterThan(1000);
});

test("redact: draw a box and apply", async ({ page }) => {
  await page.goto("/redact");
  await upload(page, [await pdfFile("statement.pdf", 2)]);
  const surface = page.getByTestId("redact-surface");
  const s = (await surface.boundingBox())!;
  await page.mouse.move(s.x + 50, s.y + 40);
  await page.mouse.down();
  await page.mouse.move(s.x + 250, s.y + 80, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByText("1 box on 1 page")).toBeVisible();
  await page.getByRole("button", { name: "Redact", exact: true }).click();
  await expect(page.getByTestId("result-card")).toContainText("1 area redacted");
});

test("compare highlights the page that changed", async ({ page }) => {
  const make = async (word: string) => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    doc.addPage([300, 400]).drawText("Same page", { x: 30, y: 300, font, size: 16 });
    doc.addPage([300, 400]).drawText(word, { x: 30, y: 300, font, size: 16 });
    return Buffer.from(await doc.save());
  };
  await page.goto("/compare");
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: "v1.pdf", mimeType: "application/pdf", buffer: await make("Rent: 900") },
    { name: "v2.pdf", mimeType: "application/pdf", buffer: await make("Rent: 950") },
  ]);
  await expect(page.getByText("Page 1 looks the same in both.")).toBeVisible();
  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(page.getByText(/of page 2 changed, shown in red/)).toBeVisible();
  await page.getByRole("radio", { name: "Text" }).click();
  await expect(page.getByText("+ Rent: 950", { exact: false })).toBeVisible();
});
