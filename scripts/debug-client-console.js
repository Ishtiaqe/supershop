const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[browser:${type}] ${text}`);
  });

  page.on('pageerror', (err) => {
    console.error('[pageerror]', err.message);
    console.error(err.stack);
  });

  try {
    const resp = await page.goto('http://localhost:3000/dashboard/pos', { waitUntil: 'networkidle' });
    console.log('HTTP status:', resp.status());

    // Wait a little for client code to run
    await page.waitForTimeout(2000);
  } catch (err) {
    console.error('[goto error]', err);
  } finally {
    await browser.close();
  }
})();
