import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:3003",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev --port 3003",
    env: {
      APP_PASSWORD: "test-password",
      JWT_SECRET: "test-jwt-secret",
    },
    url: "http://localhost:3003",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
