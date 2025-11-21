import { test, expect } from '@playwright/test';

test('inventory expand functionality', async ({ page }) => {
  // Go to login page
  await page.goto('/login');

  // Login
  await page.fill('input[type="email"]', 'owner@shop1.com');
  await page.fill('input[type="password"]', 'Owner123!');
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard');

  // Go to inventory page
  await page.goto('/dashboard/inventory');

  // Wait for inventory table to load
  await page.waitForSelector('.ant-table');

  // Look for expand icons
  const expandIcons = page.locator('.ant-table-row-expand-icon');

  // Check if there are any expand icons
  const count = await expandIcons.count();
  console.log(`Found ${count} expand icons`);

  if (count > 0) {
    // Click the first expand icon
    await expandIcons.first().click();

    // Wait a bit
    await page.waitForTimeout(1000);

    // Check if expanded row is visible
    const expandedRow = page.locator('.ant-table-expanded-row');
    await expect(expandedRow).toBeVisible();

    console.log('Expand functionality works');
  } else {
    console.log('No expandable rows found');
  }
});