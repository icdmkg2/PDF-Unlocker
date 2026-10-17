import { expect, test } from "@playwright/test";
import { makePdf } from "../helpers";

test("landing page lists every tool without the app sidebar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Work on PDFs");
  await expect(page.getByRole("heading", { name: "All tools" })).toBeVisible();
  const toolLinks = page.locator("#tools ul a");
  await expect(toolLinks).toHaveCount(26);
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
  await expect(page.locator("#tools")).toContainText("Unlock");
  await expect(page.locator("#tools")).toContainText("Protect");
  await page.getByPlaceholder("Find a tool").fill("zzz");
  await expect(page.getByText("No tool matches")).toBeVisible();
});

test("category chips narrow the catalog", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: /Secure/ }).click();
  await expect(page.locator("#tools ul a")).toHaveCount(3);
  await page.getByRole("radio", { name: /^All/ }).click();
  await expect(page.locator("#tools ul a")).toHaveCount(26);
});

test("favorites: star on the landing page, see them in the sidebar, unstar from the tool page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: /Favorites/ }).click();
  await expect(page.getByText("No favorites yet")).toBeVisible();
  await page.getByRole("radio", { name: /^All/ }).click();

  await page.getByRole("button", { name: "Add Compress to favorites" }).click();
  await page.getByRole("button", { name: "Add Sign to favorites" }).click();
  const favGroup = page.getByRole("region", { name: "Favorites" });
  await expect(favGroup.getByRole("link")).toHaveCount(2);
  await expect(page.getByRole("radio", { name: /Favorites/ })).toContainText("2");

  await favGroup.getByRole("link", { name: /Compress/ }).click();
  await expect(page).toHaveURL(/\/compress$/);
  const sidebarFavs = page.locator("aside").getByRole("list", { name: "Favorites" });
  await expect(sidebarFavs.getByRole("link")).toHaveText(["Compress", "Sign"]);

  // The star beside the page title reflects and changes the same list.
  await page.getByRole("main").getByRole("button", { name: "Remove Compress from favorites" }).click();
  await expect(sidebarFavs.getByRole("link")).toHaveText(["Sign"]);

  // Survives a reload
  await page.reload();
  await expect(page.locator("aside").getByRole("list", { name: "Favorites" }).getByRole("link")).toHaveText(["Sign"]);
});
