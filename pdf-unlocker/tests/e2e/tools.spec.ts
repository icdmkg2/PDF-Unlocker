import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { makePdfWithImage, makePng } from "../helpers";
import { downloadBytes, pageCountOf, pdfFile, upload } from "./fixtures";

test("merge combines files and the result appears under Recent", async ({ page }) => {
  await page.goto("/merge");
  await upload(page, [await pdfFile("first.pdf", 2), await pdfFile("second.pdf", 3)]);
  await page.getByRole("button", { name: "Merge 2 PDFs" }).click();

  const downloading = page.waitForEvent("download");
  await page.getByTestId("result-card").getByRole("button", { name: "Download" }).click();
  expect(await pageCountOf(await downloadBytes(await downloading))).toBe(5);

  await page.goto("/");
  const recent = page.locator('section[aria-labelledby="recent-heading"]');
  await expect(recent).toContainText("2 files merged");
  await expect(recent).toContainText("Merge");
});

test("compress keeps text by default and never makes the file bigger", async ({ page }) => {
  const input = await pdfFile("report.pdf", 3);
  await page.goto("/compress");
  await upload(page, [input]);
  await expect(page.getByRole("radio", { name: /Keep text/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Compress", exact: true }).click();

  const downloading = page.waitForEvent("download");
  await page.getByTestId("result-card").getByRole("button", { name: "Download" }).click();
  const out = await downloadBytes(await downloading);
  expect(out.length).toBeLessThanOrEqual(input.buffer.length);
  expect(await pageCountOf(out)).toBe(3);
});

test("extract images finds embedded images, and explains when there are none", async ({ page }) => {
  await page.goto("/extract-images");
  const withImage = Buffer.from(await makePdfWithImage(makePng(40, 40, [10, 200, 90])));
  await upload(page, [{ name: "photo.pdf", mimeType: "application/pdf", buffer: withImage }]);
  await page.getByRole("button", { name: "Extract Images" }).click();
  await expect(page.getByText("1 image found")).toBeVisible();

  await page.getByRole("button", { name: "Start Over" }).click();
  await upload(page, [await pdfFile("text-only.pdf", 2)]);
  await page.getByRole("button", { name: "Extract Images" }).click();
  await expect(page.getByText("This PDF has no embedded images")).toBeVisible();
});

test("protect then unlock, remembering a named password", async ({ page }) => {
  // Protect a file in the app to get an encrypted fixture.
  await page.goto("/protect");
  await upload(page, [await pdfFile("contract.pdf", 2)]);
  await page.locator("#userPw").fill("tulip-42");
  await page.getByLabel("Confirm password").fill("tulip-42");
  await page.getByRole("button", { name: "Protect PDF" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByTestId("result-card").getByRole("button", { name: "Download" }).click();
  const locked = await downloadBytes(await downloading);
  await expect(PDFDocument.load(locked)).rejects.toThrow(/encrypted/i);
  const lockedFile = { name: "contract.pdf", mimeType: "application/pdf", buffer: locked };

  // Wrong password
  await page.goto("/unlock");
  await upload(page, [lockedFile]);
  await page.getByLabel("Password", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Unlock PDF" }).click();
  await expect(page.getByText("That password didn't work.")).toBeVisible();

  // Saving is opt-in and off by default
  await page.getByLabel("Password", { exact: true }).fill("tulip-42");
  const remember = page.getByLabel("Remember this password on this device");
  await expect(remember).not.toBeChecked();
  await remember.check();
  await page.getByLabel("Name for this password").fill("Contracts");
  await page.getByRole("button", { name: "Unlock PDF" }).click();
  await expect(page.getByTestId("result-card")).toContainText("Unlocked");
  const unlocking = page.waitForEvent("download");
  await page.getByTestId("result-card").getByRole("button", { name: "Download" }).click();
  expect(await pageCountOf(await downloadBytes(await unlocking))).toBe(2);

  // After a reload the named password is offered and "Try saved passwords" finds it.
  await page.reload();
  await upload(page, [lockedFile]);
  await expect(page.getByRole("button", { name: "Contracts" })).toBeVisible();
  await page.getByRole("button", { name: "Try saved passwords" }).click();
  await expect(page.getByText("Unlocked with “Contracts”")).toBeVisible();

  // Manage: rename then forget
  await page.getByRole("button", { name: "Unlock another PDF" }).click();
  await upload(page, [lockedFile]);
  await page.getByRole("button", { name: "Manage" }).click();
  await page.getByRole("button", { name: "Rename" }).click();
  await page.getByLabel("Password name").fill("Work contracts");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Work contracts")).toBeVisible();
  await page.getByRole("button", { name: "Forget", exact: true }).click();
  await expect(page.getByText("Saved passwords")).toHaveCount(0);
});

test("a password is not saved unless the user opts in", async ({ page }) => {
  await page.goto("/unlock");
  await upload(page, [await pdfFile("plain.pdf")]);
  await page.getByLabel("Password", { exact: true }).fill("not-saved");
  await expect(page.getByLabel("Remember this password on this device")).not.toBeChecked();
  const stored = await page.evaluate(() => localStorage.getItem("pdf-studio:saved-passwords"));
  expect(stored).toBeNull();
});
