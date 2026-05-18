import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Admin login is custom (Supabase RPC + localStorage), not Supabase Auth.
// We drive the form on /auth -> "Admin" tab. Skip when credentials aren't
// provided via env so the test stays green in CI / local default runs.
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

test.skip(
  !ADMIN_USERNAME || !ADMIN_PASSWORD,
  'Set E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD to run this test',
);

test('admin bulk-imports 2 components from .xlsx', async ({ page }) => {
  // 1. Go to the auth page and select the Admin tab.
  await page.goto('/auth');
  await page.getByRole('tab', { name: /admin/i }).click();

  // 2. Admin form uses id="admin-username" / id="admin-password" with <Label htmlFor=...>,
  //    so getByLabel matches reliably.
  await page.getByLabel(/username/i).fill(ADMIN_USERNAME);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /admin sign in/i }).click();

  // 3. Admin login sets localStorage and navigates to /admin. Wait for it.
  await page.waitForURL('**/admin', { timeout: 15_000 });

  // 4. Navigate to the bulk-import page.
  await page.goto('/admin/bulk-import');
  await expect(page.getByRole('heading', { name: /bulk import/i })).toBeVisible();

  // 5. Upload the fixture. The dropzone renders a hidden <input type="file">.
  const file = resolve(
    __dirname,
    '..',
    'test',
    'fixtures',
    'bulk-import',
    'components-valid-2.xlsx',
  );
  await page.setInputFiles('input[type="file"]', file);

  // 6. Preview phase: summary line shows "✓ 2 valid · ✗ 0 errors · ⚠ 0 warnings".
  await expect(page.getByText(/2 valid/)).toBeVisible();

  // 7. Switch to insert-only mode so re-running the test doesn't fail on
  //    existing SKUs (mode is a RadioGroupItem with id "m-insert" + Label htmlFor).
  await page.getByLabel(/insert new only/i).check();

  // 8. Confirm import. Button label is "Confirm import: 2 rows".
  await page.getByRole('button', { name: /confirm import:\s*2\s*rows/i }).click();

  // 9. Result summary shows the "N inserted" badge once the edge function returns.
  await expect(page.getByText(/inserted/i)).toBeVisible({ timeout: 30_000 });
});
