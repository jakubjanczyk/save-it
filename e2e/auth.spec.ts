import { expect, test } from "@playwright/test";

const LOGIN_URL_REGEX = /\/login$/;

test("redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(LOGIN_URL_REGEX);
});

test("shows an error on invalid password", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid password");
});

test("allows access after successful login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
});
