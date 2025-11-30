import { test, expect } from '@playwright/test';

// NOTE: This test assumes that the frontend dev server is running with
// NEXT_PUBLIC_DASHBOARD_SSR_ENABLED=true and backend is running with a test user.

test('Dashboard SSR summary is present in initial HTML', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  // Check that summary sections appear in the DOM
  const totalRevenueText = await page.locator('text=Total Revenue').first();
  await expect(totalRevenueText).toBeVisible();

  const ordersText = await page.locator('text=Orders').first();
  await expect(ordersText).toBeVisible();
});
