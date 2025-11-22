import { test, expect } from '@playwright/test';

test('should load offline fallback or cached page when offline', async ({ page, context }) => {
    // Enable console logging from the browser
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err));

    // 1. Go online and visit the page to install SW and cache resources
    await context.setOffline(false);
    console.log('Navigating to page...');
    await page.goto('http://localhost:3000');
    console.log('Page loaded.');

    // Check if SW file exists
    const swResponse = await page.request.get('http://localhost:3000/sw.js');
    console.log('SW File Status:', swResponse.status());

    // Wait for Service Worker registration with timeout handling
    console.log('Waiting for SW registration...');
    try {
        await page.evaluate(async () => {
            if (!('serviceWorker' in navigator)) {
                console.log('Service Worker not supported in this browser');
                return;
            }

            // Manually register to debug
            console.log('Manually registering SW...');
            try {
                const reg = await navigator.serviceWorker.register('/sw.js');
                console.log('Manual registration successful:', reg.scope);

                if (reg.installing) {
                    console.log('SW is installing...');
                    reg.installing.addEventListener('statechange', (e) => {
                        // @ts-ignore
                        console.log('SW installing state change:', e.target?.state);
                    });
                }
            } catch (err) {
                console.error('Manual registration failed:', err);
                return;
            }

            console.log('Checking SW ready status...');
            // Wait for ready, but don't block forever if it fails
            const registration = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 5000))
            ]) as ServiceWorkerRegistration;
            console.log('SW Ready:', registration.active?.state);

            // Ensure page is controlled
            if (!navigator.serviceWorker.controller) {
                console.log('Waiting for controller...');
                await new Promise<void>(resolve => {
                    navigator.serviceWorker.addEventListener('controllerchange', () => {
                        console.log('Controller changed');
                        resolve();
                    });
                });
            }
            console.log('Page is controlled by:', navigator.serviceWorker.controller?.scriptURL);
            return registration.active?.state;
        });
    } catch (e) {
        console.log('Timeout or error waiting for SW ready:', e);
    }

    // Check if page is controlled
    const isControlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    console.log('Page Controlled:', isControlled);

    // Verify cache content
    const cacheKeys = await page.evaluate(async () => {
        const keys = await caches.keys();
        console.log('Cache Names:', keys);
        const results = [];
        for (const key of keys) {
            const cache = await caches.open(key);
            const requests = await cache.keys();
            results.push({ name: key, count: requests.length, urls: requests.map(r => r.url) });
        }
        return results;
    });
    console.log('Cache Content:', JSON.stringify(cacheKeys, null, 2));

    // Explicitly visit offline page to verify it works online
    console.log('Visiting /offline to verify...');
    await page.goto('http://localhost:3000/offline');
    console.log('Offline page title:', await page.title());
    await page.goBack();

    // Give it a moment to cache assets
    await page.waitForTimeout(5000);

    // 2. Go offline
    console.log('Going offline...');
    await context.setOffline(true);

    // 3. Reload the page
    console.log('Reloading page...');
    try {
        await page.reload({ waitUntil: 'domcontentloaded' });
    } catch (e) {
        console.log('Reload threw error:', e);
    }

    // 4. Verify content
    const offlineText = await page.getByText('You are offline').isVisible();
    const dashboardText = await page.getByText('Dashboard').isVisible();
    const loginText = await page.getByText('Sign in to your account').isVisible();

    console.log('Offline Text Visible:', offlineText);
    console.log('Dashboard Text Visible:', dashboardText);
    console.log('Login Text Visible:', loginText);
    console.log('Current URL:', page.url());
    console.log('Page Title:', await page.title());

    if (!offlineText && !dashboardText && !loginText) {
        console.log('Page Content Dump:', await page.content());
    }

    expect(offlineText || dashboardText || loginText).toBeTruthy();
});
