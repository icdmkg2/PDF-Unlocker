import { expect, test } from "@playwright/test";
import { makePdf } from "../helpers";

test("landing page lists every tool without the app sidebar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Work on PDFs");
  await expect(page.getByRole("heading", { name: "All tools" })).toBeVisible();
  const toolLinks = page.locator("#tools ul a");
  await expect(toolLinks).toHaveCount(24);
  await expect(page.locator("aside")).toHaveCount(0);
  // No history yet, so no Recent section
  await expect(page.getByRole("heading", { name: "Recent" })).toHaveCount(0);
});

test("tool pages show the sidebar with the current tool highlighted", async ({ page }) => {
  await page.goto("/");
  await page.locator("#tools").getByRole("link", { name: /Merge/ }).click();
  await expect(page).toHaveURL(/\/merge$/);
  await expect(page.getByRole("heading", { name: "Merge PDF" })).toBeVisible();
  await expect(page.locator("aside").getByRole("link", { name: "Merge" })).toHaveClass(/text-primary/);
});

test("manifest and icons are served", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe("PDF Studio");
  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
  expect((await request.get("/icon.svg")).ok()).toBe(true);
  expect((await request.get("/logo.svg")).ok()).toBe(true);
});

test("dropping a PDF on the landing page suggests tools and opens one with the file loaded", async ({ page }) => {
  await page.goto("/");
  await page.locator("#landing-file").setInputFiles({
    name: "Quarterly report.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await makePdf(4)),
  });
  const suggestions = page.getByRole("list", { name: "Suggested tools" });
  await expect(page.getByText("Quarterly report", { exact: true })).toBeVisible();
  await expect(page.getByText(/^4 pages · /)).toBeVisible();
  await suggestions.getByRole("button", { name: /Split/ }).click();
  await expect(page).toHaveURL(/\/split$/);
  await expect(page.getByText("Quarterly report.pdf")).toBeVisible();
});

test("the catalog filter narrows the tool list", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Find a tool").fill("password");
  const links = page.locator("#tools ul a");
  await expect(links).toHaveCount(2);
  await expect(links.first()).toContainText("Unlock");
  await page.getByPlaceholder("Find a tool").fill("zzz");
  await expect(page.getByText("No tool matches")).toBeVisible();
});
