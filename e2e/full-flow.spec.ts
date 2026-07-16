import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * Full product journey against the production build (spec SC3/SC5):
 * auth → new project → upload sketch → generate (real vision API call) →
 * GrapesJS edit + autosave persistence → export .zip → the export is a
 * standalone site: no supabase/unsplash URLs, images bundled and rendering
 * from file://.
 *
 * Credentials: a fixed throwaway account, created on first run (override
 * with E2E_EMAIL / E2E_PASSWORD). Requires Supabase email confirmation to
 * be disabled; the test fails with a clear message if it isn't.
 */
const EMAIL = process.env.E2E_EMAIL ?? 'pp-e2e@example.com';
const PASSWORD = process.env.E2E_PASSWORD ?? 'pp-e2e-Password1!';
const SKETCH = join(__dirname, 'fixtures', 'sketch.png');
const EDITED_HEADLINE = 'E2E edited headline';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type=email]', EMAIL);
  await page.fill('input[type=password]', PASSWORD);
  await page.click('button[type=submit]');
  const outcome = await Promise.race([
    page.waitForURL('**/dashboard', { timeout: 15_000 }).then(() => 'ok' as const),
    page.locator('p.text-red-600').waitFor({ timeout: 15_000 }).then(() => 'error' as const),
  ]).catch(() => 'timeout' as const);
  if (outcome === 'ok') return;

  // First run: the account doesn't exist yet — sign up.
  await page.goto('/signup');
  await page.fill('input[type=email]', EMAIL);
  await page.fill('input[type=password]', PASSWORD);
  await page.click('button[type=submit]');
  await page
    .waitForURL('**/dashboard', { timeout: 15_000 })
    .catch(async () => {
      const err = await page.locator('p.text-red-600').textContent().catch(() => null);
      throw new Error(
        `Signup did not reach /dashboard (${err ?? 'no visible error'}). ` +
          'If Supabase email confirmation is enabled, disable it or provide E2E_EMAIL/E2E_PASSWORD for a confirmed account.',
      );
    });
}

test('sketch → generate → edit → export is a standalone site', async ({ page }, testInfo) => {
  await signIn(page);

  // --- Create a project; the URL carries its id for cleanup. ---
  await page.getByRole('button', { name: 'New project' }).click();
  await page.waitForURL('**/studio/*');
  const projectId = page.url().split('/studio/')[1];

  try {
    // --- Upload the sketch and generate (one real vision API call). ---
    await page.setInputFiles('input[type=file]', SKETCH);
    await expect(page.getByAltText('Sketch preview')).toBeVisible();
    await page.getByRole('button', { name: 'Generate' }).click();

    const generated = await Promise.race([
      page
        .getByRole('button', { name: 'Export .zip' })
        .waitFor({ timeout: 180_000 })
        .then(() => 'ok' as const),
      page.locator('p.text-red-600').waitFor({ timeout: 180_000 }).then(() => 'error' as const),
    ]);
    if (generated === 'error') {
      throw new Error(`Generation failed: ${await page.locator('p.text-red-600').textContent()}`);
    }

    // --- GrapesJS editor loads the generated page in its canvas. ---
    const canvas = page.frameLocator('iframe.gjs-frame');
    await expect(canvas.locator('.pp-section').first()).toBeVisible({ timeout: 60_000 });

    // The renderer theme must reach the canvas intact (protected base CSS):
    // a themed hero keeps its gradient background instead of collapsing to white.
    const canvasHeroBg = await canvas
      .locator('.pp-hero')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(canvasHeroBg, 'editor canvas keeps the themed hero background').not.toBe('none');

    // --- Edit the first heading in place; autosave must confirm. ---
    const heading = canvas.locator('.pp-heading').first();
    await heading.dblclick();
    await page.keyboard.press('Control+a');
    await page.keyboard.type(EDITED_HEADLINE);
    await canvas.locator('.pp-section').last().click(); // blur to commit the edit
    await expect(page.getByText('Saved ✓')).toBeVisible({ timeout: 20_000 });

    // --- The edit survives a full reload (persisted server-side). ---
    await page.reload();
    await expect(page.frameLocator('iframe.gjs-frame').getByText(EDITED_HEADLINE)).toBeVisible({
      timeout: 60_000,
    });

    // --- Export the .zip. ---
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export .zip' }).click(),
    ]);
    const zipPath = testInfo.outputPath('export.zip');
    await download.saveAs(zipPath);

    // --- The zip is a self-contained site. ---
    const zip = await JSZip.loadAsync(readFileSync(zipPath));
    const html = await zip.file('index.html')!.async('string');
    const css = await zip.file('styles.css')!.async('string');

    expect(html).toContain(EDITED_HEADLINE);

    // Theme must survive the GrapesJS round-trip: the base stylesheet is
    // protected (never parsed by GrapesJS), so nothing may be stripped.
    expect(html, 'exported body keeps the pp-page theme scope').toMatch(/<body[^>]*class="[^"]*pp-page/);
    expect(css, 'base layer present').toContain('@layer pp-base');
    expect(css, 'keyframes survive').toContain('@keyframes');
    expect(css, 'font import survives').toContain('fonts.googleapis.com');
    expect(css, 'var()-based button background survives').toContain('background: var(--pp-primary)');

    for (const leftover of ['supabase.co', 'unsplash.com']) {
      expect(html, `index.html must not reference ${leftover}`).not.toContain(leftover);
      expect(css, `styles.css must not reference ${leftover}`).not.toContain(leftover);
    }
    // Every referenced ./assets/… file must actually be bundled.
    const referenced = [...`${html}\n${css}`.matchAll(/\.\/assets\/[^"')\s]+/g)].map((m) =>
      m[0].replace('./', ''),
    );
    for (const rel of referenced) {
      expect(zip.file(rel), `${rel} referenced but missing from zip`).toBeTruthy();
    }

    // --- The extracted site renders standalone from file://. ---
    const siteDir = testInfo.outputPath('site');
    for (const [rel, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const abs = join(siteDir, rel);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, await entry.async('nodebuffer'));
    }
    await page.goto(`file://${join(siteDir, 'index.html')}`);
    await expect(page.locator('.pp-section').first()).toBeVisible();
    await expect(page.getByText(EDITED_HEADLINE)).toBeVisible();
    const brokenImages = await page.evaluate(() =>
      Array.from(document.images)
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.src),
    );
    expect(brokenImages, 'all exported images load offline').toEqual([]);

    // The standalone page is themed, not a white-on-white skeleton.
    const standaloneTheme = await page.evaluate(() => {
      const hero = document.querySelector('.pp-hero');
      const body = document.body;
      return {
        heroBg: hero ? getComputedStyle(hero).backgroundImage : 'missing',
        bodyFont: getComputedStyle(body).fontFamily,
      };
    });
    expect(standaloneTheme.heroBg, 'standalone hero keeps its themed background').not.toBe('none');
    expect(standaloneTheme.heroBg).not.toBe('missing');
    // The renderer's body font stack always includes system-ui; the browser
    // serif default means the .pp-page scope was lost.
    expect(standaloneTheme.bodyFont, 'standalone body uses the theme font stack').toContain('system-ui');
    await page.screenshot({ path: testInfo.outputPath('standalone-site.png'), fullPage: true });
  } finally {
    // Remove the test project (and its storage) so runs don't accumulate.
    await page.request.delete(`/api/projects/${projectId}`).catch(() => {});
  }
});
