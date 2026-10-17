import { expect, test } from "@playwright/test";

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
