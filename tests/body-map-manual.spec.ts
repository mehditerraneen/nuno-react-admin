import { test } from '@playwright/test';

test('Manual check - open create wound page', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5174');
    await page.waitForSelector('text=Username', { timeout: 10000 });
    await page.getByLabel('Username *').fill('mehdi');
    await page.getByLabel('Password *').fill('Polisario77');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/');
    await page.waitForLoadState('networkidle');

    // Navigate to create page
    await page.goto('http://localhost:5174/#/wounds/create');
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial state
    await page.screenshot({ path: 'screenshots/create-initial.png', fullPage: true });

    // Wait for patient input and select a patient
    await page.waitForSelector('input[aria-autocomplete="list"]', { timeout: 5000 });
    const patientInput = page.locator('input[aria-autocomplete="list"]').first();
    await patientInput.click();
    await patientInput.fill('LIMA');

    // Wait for options
    await page.waitForTimeout(2000);

    // Take screenshot with autocomplete open
    await page.screenshot({ path: 'screenshots/create-autocomplete.png', fullPage: true });

    // Select first option
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Wait for body map to appear
    await page.waitForTimeout(3000);

    // Take screenshot with body map
    await page.screenshot({ path: 'screenshots/create-with-bodymap.png', fullPage: true });

    // Keep browser open
    await page.waitForTimeout(60000);
});
