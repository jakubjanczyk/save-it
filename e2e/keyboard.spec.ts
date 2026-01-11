import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
}

test.describe("with Convex configured", () => {
  test.skip(!hasConvexUrl, "Set NEXT_PUBLIC_CONVEX_URL to run these tests.");

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("opens shortcuts help in focus view with ?", async ({ page }) => {
    await page.goto("/match");

    if (await page.getByText("No pending links").isVisible()) {
      test.skip(true, "Seed at least one pending link first.");
    }

    await page.keyboard.press("?");
    await expect(page.getByText("Focus shortcuts")).toBeVisible();
  });

  test("opens shortcuts help in email detail view with ?", async ({ page }) => {
    await page.goto("/");

    if (await page.getByText("No newsletters to triage yet.").isVisible()) {
      test.skip(true, "Seed at least one email with pending links first.");
    }

    await page.locator("ul").getByRole("link").first().click();
    await page.keyboard.press("?");
    await expect(page.getByText("List shortcuts")).toBeVisible();
  });
});
