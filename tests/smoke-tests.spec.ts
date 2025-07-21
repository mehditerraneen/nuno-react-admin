import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  
  test('application should load successfully', async ({ page }) => {
    await page.goto('/');
    
    // Should see React Admin interface
    await expect(page.locator('body')).toContainText('Care Plans', { timeout: 10000 });
  });

  test('care plans list should be accessible', async ({ page }) => {
    await page.goto('/careplans');
    await page.waitForLoadState('networkidle');
    
    // Should see care plans list
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('CNS care plans list should be accessible', async ({ page }) => {
    await page.goto('/cnscareplans');
    await page.waitForLoadState('networkidle');
    
    // Should see CNS care plans list
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('navigation between sections should work', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to care plans
    await page.getByRole('link', { name: /care plans/i }).click();
    await expect(page).toHaveURL(/careplans/);
    
    // Navigate to CNS care plans
    await page.getByRole('link', { name: /cns.*care plans/i }).click();
    await expect(page).toHaveURL(/cnscareplans/);
  });

  test('responsive design should work on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/careplans');
    await page.waitForLoadState('networkidle');
    
    // Should still be functional on mobile
    await expect(page.getByRole('table')).toBeVisible();
  });

});