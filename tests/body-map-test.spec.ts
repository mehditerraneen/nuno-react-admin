import { test, expect } from '@playwright/test';

test.describe('Body Map Implementation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5174');

        // Wait for login form
        await page.waitForSelector('text=Username', { timeout: 10000 });

        // Login
        await page.getByLabel('Username *').fill(process.env.VITE_TEST_USERNAME || 'mehdi');
        await page.getByLabel('Password *').fill(process.env.VITE_TEST_PASSWORD || 'Polisario77');
        await page.getByRole('button', { name: /sign in/i }).click();

        await page.waitForURL('**/');
        await page.waitForLoadState('networkidle');
    });

    test('should navigate to wound create page and show body map', async ({ page }) => {
        // Navigate to wounds
        await page.click('text=Gestion des plaies');
        await page.waitForURL('**/wounds');

        // Take screenshot of wounds list
        await page.screenshot({ path: 'screenshots/wounds-list.png', fullPage: true });

        // Click create button
        await page.click('a[href="#/wounds/create"]');
        await page.waitForURL('**/wounds/create');
        await page.waitForLoadState('networkidle');

        // Take screenshot of create page
        await page.screenshot({ path: 'screenshots/wound-create-page.png', fullPage: true });

        // Check if patient selector exists
        const patientSelector = page.locator('input[aria-label*="Patient"]');
        await expect(patientSelector).toBeVisible({ timeout: 10000 });

        // Check for any error messages
        const errorMessages = await page.locator('.MuiAlert-message').allTextContents();
        console.log('Error messages:', errorMessages);

        // Check what components are rendered
        const pageContent = await page.content();
        console.log('Body map viewer present:', pageContent.includes('BodyMapViewer'));
        console.log('SVG present:', pageContent.includes('<svg'));

        // List all visible elements
        const visibleElements = await page.locator('body *').evaluateAll(elements =>
            elements.filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden';
            }).map(el => el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ').join('.') : ''))
        );
        console.log('Visible elements sample:', visibleElements.slice(0, 50));
    });

    test('should show body map after patient selection', async ({ page }) => {
        // Navigate to wound create
        await page.goto('http://localhost:5174/#/wounds/create');
        await page.waitForLoadState('networkidle');

        // Select a patient
        const patientInput = page.locator('input[aria-label*="Patient"]');
        await patientInput.click();
        await patientInput.fill('622');

        // Wait a bit for options to load
        await page.waitForTimeout(1000);

        // Try to select first option
        const firstOption = page.locator('li[role="option"]').first();
        if (await firstOption.isVisible()) {
            await firstOption.click();
        }

        // Wait for body map to appear
        await page.waitForTimeout(2000);

        // Take screenshot
        await page.screenshot({ path: 'screenshots/wound-create-with-patient.png', fullPage: true });

        // Check for body map
        const bodyMapContainer = page.locator('svg[viewBox="0 0 512 1024"]');
        const isVisible = await bodyMapContainer.isVisible().catch(() => false);
        console.log('Body map SVG visible:', isVisible);

        if (!isVisible) {
            // Check for any console errors
            console.log('Body map not visible. Checking page state...');
            const allText = await page.locator('body').textContent();
            console.log('Page text content:', allText);
        }
    });
});
