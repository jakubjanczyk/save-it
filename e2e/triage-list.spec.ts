import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
const emailDetailUrlRegex = /\/emails\//;

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

  test("discards a link in list view", async ({ page }) => {
    await page.goto("/");

    if (await page.getByText("No newsletters to triage yet.").isVisible()) {
      test.skip(true, "Seed at least one email with pending links first.");
    }

    await page.locator("ul").getByRole("link").first().click();
    await expect(page).toHaveURL(emailDetailUrlRegex);
    await page.getByRole("button", { name: "Discard" }).first().click();

    await expect(
      page.getByRole("button", { name: "Save" }).first()
    ).toBeDisabled();
  });
});
