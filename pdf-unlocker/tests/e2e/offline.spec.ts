import { expect, test } from "@playwright/test";

test("tool pages work offline after the first visit", async ({ page, context }) => {
  await page.goto("/");
  // Wait until the service worker has cached a tool page that was never visited.
  await expect
    .poll(
      () => page.evaluate(async () => !!(await caches.match("/rotate"))),
      { timeout: 60_000 }
    )
    .toBe(true);

  await context.setOffline(true);
  await page.goto("/rotate");
  await expect(page.getByRole("heading", { name: "Rotate PDF" })).toBeVisible();
  // The page is interactive, not just cached HTML: its file input is present and hydrated.
  await expect(page.locator('input[type="file"]')).toHaveCount(1);
  await context.setOffline(false);
});
