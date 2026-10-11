import { defineConfig } from "@playwright/test";

const baseURL = process.env.KARANTA_QA_BASE_URL || "http://127.0.0.1:4173";
const isolated = process.env.KARANTA_QA_CONFIRM_ISOLATED === "yes";
const supabaseUrl = isolated
  ? process.env.KARANTA_QA_SUPABASE_URL!
  : "https://karanta-offline-ui.invalid";
const publishableKey = isolated
  ? process.env.KARANTA_QA_PUBLISHABLE_KEY!
  : "karanta-offline-ui-placeholder";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: isolated
    ? [["list"], ["./tests/reporters/karanta-markdown-reporter.ts"]]
    : [
        ["list"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
        ["./tests/reporters/karanta-markdown-reporter.ts"],
      ],
  outputDir: "test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "tablet-chromium",
      use: { browserName: "chromium", viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
  ],
  webServer:
    baseURL === "http://127.0.0.1:4173"
      ? {
          command: "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
          url: `${baseURL}/auth?portal=family`,
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            VITE_SUPABASE_URL: supabaseUrl,
            VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
            SUPABASE_URL: supabaseUrl,
            SUPABASE_PUBLISHABLE_KEY: publishableKey,
            SUPABASE_SERVICE_ROLE_KEY: "",
            VITE_GOOGLE_OAUTH_ENABLED: "false",
          },
        }
      : undefined,
});
