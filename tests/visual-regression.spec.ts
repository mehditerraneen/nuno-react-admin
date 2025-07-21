import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  
  test('care plan list page should look correct', async ({ page }) => {
    await page.goto('/careplans');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of the care plans list
    await expect(page).toHaveScreenshot('care-plans-list.png');
  });

  test('care plan detail view should look correct', async ({ page }) => {
    await page.goto('/careplans');
    await page.waitForLoadState('networkidle');
    
    // Click on first care plan
    await page.click('[data-testid="show-button"]:first-child, .MuiTableRow-root:first-child');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of care plan details view
    await expect(page).toHaveScreenshot('care-plan-details-view.png');
  });

  test('create care plan detail dialog should look correct', async ({ page }) => {
    await page.goto('/careplans');
    await page.click('[data-testid="show-button"]:first-child, .MuiTableRow-root:first-child');
    await page.waitForLoadState('networkidle');
    
    // Open create dialog
    await page.getByRole('button', { name: /add new detail/i }).click();
    
    // Take screenshot of create dialog
    await expect(page.getByRole('dialog')).toHaveScreenshot('create-detail-dialog.png');
  });

  test('empty care plan state should look correct', async ({ page }) => {
    // This test assumes there's a care plan without details
    await page.goto('/careplans');
    await page.click('[data-testid="show-button"]:first-child, .MuiTableRow-root:first-child');
    await page.waitForLoadState('networkidle');
    
    // If we see the empty state, capture it
    const emptyMessage = page.getByText(/no details found.*click.*add new detail/i);
    if (await emptyMessage.isVisible()) {
      await expect(page.locator('[data-testid="care-plan-details-section"]')).toHaveScreenshot('empty-care-plan-state.png');
    }
  });

});