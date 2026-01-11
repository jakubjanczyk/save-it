import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
const focusUrlRegex = /\/match\?linkId=/;

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

  test("triages a link in focus view", async ({ page }) => {
    await page.goto("/match");

    if (await page.getByText("No pending links").isVisible()) {
      test.skip(true, "Seed at least one email with pending links first.");
    }

    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Discard" })).toBeVisible();

    await expect(page).toHaveURL(focusUrlRegex);
    await page.getByRole("button", { name: "Discard" }).click();
  });
});
