import { test } from '@playwright/test';

test('Debug body map - check console logs', async ({ page }) => {
    // Listen to console messages
    page.on('console', msg => {
        console.log('BROWSER CONSOLE:', msg.type(), msg.text());
    });

    // Listen to page errors
    page.on('pageerror', error => {
        console.log('PAGE ERROR:', error.message);
    });

    // Login
    await page.goto('http://localhost:5174');
    await page.waitForSelector('text=Username', { timeout: 10000 });
    await page.getByLabel('Username *').fill('mehdi');
    await page.getByLabel('Password *').fill('Polisario77');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    console.log('\n=== Navigating to create wound page ===\n');

    // Navigate to create page
    await page.goto('http://localhost:5174/#/wounds/create');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== Taking initial screenshot ===\n');
    await page.screenshot({ path: 'screenshots/debug-initial.png', fullPage: true });

    // Find and click patient dropdown
    console.log('\n=== Looking for patient dropdown ===\n');

    const patientCombobox = page.locator('[role="combobox"]').first();
    await patientCombobox.waitFor({ state: 'visible', timeout: 5000 });

    console.log('\n=== Clicking patient dropdown ===\n');
    await patientCombobox.click();
    await page.waitForTimeout(1000);

    // Type to search for patient
    console.log('\n=== Typing LIMA ===\n');
    await page.keyboard.type('LIMA');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshots/debug-after-typing.png', fullPage: true });

    // Select first option
    console.log('\n=== Selecting first option ===\n');
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible()) {
        await firstOption.click();
        console.log('\n=== Option clicked ===\n');
    }

    // Wait for body map to appear
    await page.waitForTimeout(3000);

    console.log('\n=== Taking final screenshot ===\n');
    await page.screenshot({ path: 'screenshots/debug-final.png', fullPage: true });

    // Check if SVG body map exists
    const bodyMapSVG = page.locator('svg[viewBox="0 0 512 1024"]');
    const svgVisible = await bodyMapSVG.isVisible().catch(() => false);
    console.log('\n=== Body map SVG visible:', svgVisible, '===\n');

    // Keep browser open for inspection
    console.log('\n=== Keeping browser open for 60 seconds ===\n');
    await page.waitForTimeout(60000);
});
