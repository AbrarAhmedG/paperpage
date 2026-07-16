import { defineConfig } from '@playwright/test';

// E2E runs against the production build: `npm run build` first, then
// `npm run test:e2e` (starts `npm start` itself unless one is already up).
export default defineConfig({
  testDir: './e2e',
  timeout: 300_000,
  // The flow is one continuous user journey; never parallelize or retry it
  // blindly (each generate call hits the paid vision API).
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
