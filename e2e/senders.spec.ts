import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
}

test("shows configuration warning when Convex URL is missing", async ({
  page,
}) => {
  test.skip(hasConvexUrl, "Convex is configured; config warning won't show.");

  await login(page);
  await page.goto("/senders");

  await expect(page.getByRole("heading", { name: "Senders" })).toBeVisible();
  await expect(page.getByText("Missing configuration")).toBeVisible();
});

test.describe("with Convex configured", () => {
  test.skip(!hasConvexUrl, "Set NEXT_PUBLIC_CONVEX_URL to run these tests.");

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("adds a sender and shows it in the list", async ({ page }) => {
    await page.goto("/senders");

    await page.getByLabel("Sender email").fill("newsletter@example.com");
    await page.getByRole("button", { name: "Add sender" }).click();

    await expect(page.getByText("newsletter@example.com")).toBeVisible();
  });

  test("removes a sender from the list", async ({ page }) => {
    await page.goto("/senders");

    await page.getByLabel("Sender email").fill("remove-me@example.com");
    await page.getByRole("button", { name: "Add sender" }).click();
    await expect(page.getByText("remove-me@example.com")).toBeVisible();

    await page
      .getByRole("button", { name: "Remove remove-me@example.com" })
      .click();
    await expect(page.getByText("remove-me@example.com")).toHaveCount(0);
  });
});
