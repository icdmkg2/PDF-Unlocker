import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { downloadBytes, pdfFile, upload } from "./fixtures";

test("rotate turns only the selected pages", async ({ page }) => {
  await page.goto("/rotate");
  await upload(page, [await pdfFile("survey.pdf", 4)]);
  await page.getByRole("button", { name: "Page 2", exact: true }).click();
  await page.getByRole("button", { name: "Page 3", exact: true }).click({ modifiers: ["Shift"] });
  await expect(page.getByText("2 of 4 selected")).toBeVisible();
  await page.getByRole("button", { name: "Turn right 90 degrees" }).click();
  await page.getByRole("button", { name: "Save rotated PDF" }).click();

  const downloading = page.waitForEvent("download");
  await page.getByTestId("result-card").getByRole("button", { name: "Download" }).click();
  const doc = await PDFDocument.load(await downloadBytes(await downloading));
  expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([0, 90, 90, 0]);
});

test("split cuts before the selected pages", async ({ page }) => {
  await page.goto("/split");
  await upload(page, [await pdfFile("report.pdf", 6)]);
  await page.getByRole("radio", { name: "Cut into parts" }).click();
  await page.getByRole("button", { name: "Page 3", exact: true }).click();
  await page.getByRole("button", { name: "Page 5", exact: true }).click();
  await expect(page.getByText("3 · file 2")).toBeVisible();
  await page.getByRole("button", { name: "Make 3 files" }).click();
  await expect(page.getByTestId("result-card")).toContainText("Split into 3 files");
  await expect(page.getByTestId("result-card")).toContainText("pages-1-2.pdf, pages-3-4.pdf, pages-5-6.pdf");
});

test("organize deletes and reorders, and the next step carries the file", async ({ page }) => {
  await page.goto("/organize");
  await upload(page, [await pdfFile("deck.pdf", 3)]);
  await page.getByRole("button", { name: "Page 2", exact: true }).click();
  await page.getByRole("button", { name: /Delete 1 selected/ }).click();
  await page.getByRole("button", { name: "Reverse order" }).click();
  await page.getByRole("button", { name: "Save 2 pages" }).click();
  await expect(page.getByTestId("result-card")).toContainText("Reorganized");

  await page.getByRole("navigation", { name: "Next steps" }).getByRole("button", { name: /Page numbers/ }).click();
  await expect(page).toHaveURL(/\/page-numbers$/);
  await expect(page.getByText("deck_organized.pdf")).toBeVisible();
  await expect(page.getByText(/^2 pages ·/)).toBeVisible();
});
