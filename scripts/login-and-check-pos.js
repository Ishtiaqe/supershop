const { chromium } = require('playwright');

(async () => {
  const email = 'owner@shop1.com';
  const password = 'Owner123!';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (m) => {
    try {
      console.log(`[browser:${m.type()}] ${m.text()}`);
    } catch {}
  });
  page.on('pageerror', (err) => console.error('[pageerror]', err));

  try {
    // Load login page
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

    // Fill email + password using placeholders from AntD inputs
    await page.fill('input[placeholder="Enter your email"]', email);
    await page.fill('input[placeholder="Enter your password"]', password);

    // Submit - try both button click and Enter in the password field
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
    } else {
      await page.press('input[name="password"]', 'Enter');
    }

    // Wait for access token cookie to be set by the backend<br/>    // (cookies are now used for auth instead of localStorage tokens)
    await page.waitForFunction(() => document.cookie.includes('accessToken='), null, { timeout: 10000 }).catch(() => {});

    // Capture network calls to inventory endpoint
    const responses = [];
    page.on('response', (r) => {
      const url = r.url();
      if (url.includes('/inventory')) responses.push({ url, status: r.status() });
    });

    // Go to POS page and wait for network idle
    const resp = await page.goto('http://localhost:3000/dashboard/pos', { waitUntil: 'networkidle' });
    console.log('POS page HTTP status:', resp?.status());

    // Wait a bit to let auth-set items and client behavior happen
    await page.waitForTimeout(2000);

    // Wait a moment for the inventory calls to finish so they can be observed
    await page.waitForTimeout(2000);

    console.log('Inventory responses:', responses);

    // Take a screenshot of the POS page for visual review (optional)
    await page.screenshot({ path: 'pos-page-screenshot.png', fullPage: true });
    console.log('Saved screenshot: pos-page-screenshot.png');

  } catch (err) {
    console.error('error during test:', err);
  } finally {
    await browser.close();
  }
})();
