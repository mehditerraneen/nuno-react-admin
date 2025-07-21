import { test, expect } from '@playwright/test';

test.describe('Care Plan Details', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to care plans list
    await page.goto('/careplans');
    await page.waitForLoadState('networkidle');
  });

  test('should show "Add New Detail" button on empty care plan', async ({ page }) => {
    // Click on a care plan to view details
    await page.click('[data-testid="show-button"]:first-child, .MuiTableRow-root:first-child');
    await page.waitForLoadState('networkidle');
    
    // Should see the "Add New Detail" button even with no existing details
    const addButton = page.getByRole('button', { name: /add new detail/i });
    await expect(addButton).toBeVisible();
    
    // Should see encouraging message when no details exist
    const emptyMessage = page.getByText(/no details found.*click.*add new detail.*to get started/i);
    await expect(emptyMessage).toBeVisible();
  });

  test('should open create dialog when clicking "Add New Detail"', async ({ page }) => {
    // Navigate to a care plan
    await page.click('[data-testid="show-button"]:first-child, .MuiTableRow-root:first-child');
    await page.waitForLoadState('networkidle');
    
    // Click "Add New Detail" button
    await page.getByRole('button', { name: /add new detail/i }).click();
    
    // Dialog should open
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    
    // Dialog should have title
    await expect(page.getByText('Create Care Plan Detail')).toBeVisible();
    
    // Should have form fields
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByText(/occurrences.*days of week/i)).toBeVisible();
    await expect(page.getByLabel(/time start/i)).toBeVisible();
    await expect(page.getByLabel(/time end/i)).toBeVisible();
    await expect(page.getByText(/long term care items/i)).toBeVisible();
  });

  test('should show Long Term Care Items when CNS plan is linked', async ({ page }) => {
    // Navigate to a care plan with CNS link
    await page.click('[data-testid="show-button"]:first-child, .MuiTableRow-root:first-child');
    await page.waitForLoadState('networkidle');
    
    // Open create dialog
    await page.getByRole('button', { name: /add new detail/i }).click();
    
    // Add a care item
    await page.getByRole('button', { name: /add/i }).last().click();
    
    // Should be able to select care items
    const careItemSelect = page.getByLabel(/care item/i).first();
    await expect(careItemSelect).toBeVisible();
    
    // Click the select to open options
    await careItemSelect.click();
    
    // Should have options available (either from CNS plan or all items)
    const options = page.locator('.MuiAutocomplete-option');
    await expect(options.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show quantity input for care items', async ({ page }) => {
    // Navigate to care plan and open dialog
    await page.click('[data-testid="show-button"]:first-child, .MuiTableRow-root:first-child');
    await page.getByRole('button', { name: /add new detail/i }).click();
    
    // Add a care item
    await page.getByRole('button', { name: /add/i }).last().click();
    
    // Should have quantity input
    const quantityInput = page.getByLabel(/quantity/i);
    await expect(quantityInput).toBeVisible();
    await expect(quantityInput).toHaveAttribute('type', 'number');
  });

  test('should validate required fields', async ({ page }) => {
    // Navigate to care plan and open dialog
    await page.click('[data-testid="show-button"]:first-child, .MuiTableRow-root:first-child');
    await page.getByRole('button', { name: /add new detail/i }).click();
    
    // Try to save without filling required fields
    await page.getByRole('button', { name: /save/i }).click();
    
    // Should show validation errors for required fields
    const nameError = page.getByText(/name.*required/i);
    await expect(nameError).toBeVisible();
  });

  test('should close dialog on cancel', async ({ page }) => {
    // Navigate to care plan and open dialog
    await page.click('[data-testid="show-button"]:first-child, .MuiTableRow-root:first-child');
    await page.getByRole('button', { name: /add new detail/i }).click();
    
    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();
    
    // Dialog should close
    const dialog = page.getByRole('dialog');
    await expect(dialog).not.toBeVisible();
  });

  test('should edit existing care plan detail', async ({ page }) => {
    // Navigate to care plan with existing details
    await page.click('[data-testid="show-button"]:first-child, .MuiTableRow-root:first-child');
    await page.waitForLoadState('networkidle');
    
    // If there are existing details, click edit button
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Edit dialog should open
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(page.getByText('Edit Care Plan Detail')).toBeVisible();
      
      // Should have pre-filled form
      const nameInput = page.getByLabel(/name/i);
      await expect(nameInput).toHaveValue(/.+/); // Should have some value
    }
  });

});

test.describe('CNS Integration', () => {
  
  test('should log CNS care plan ID when dialog opens', async ({ page }) => {
    // Listen for console logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('CNS Care Plan ID')) {
        logs.push(msg.text());
      }
    });
    
    // Navigate and open dialog
    await page.goto('/careplans');
    await page.click('[data-testid="show-button"]:first-child, .MuiTableRow-root:first-child');
    await page.getByRole('button', { name: /add new detail/i }).click();
    
    // Wait a bit for async operations
    await page.waitForTimeout(1000);
    
    // Should have logged CNS information
    expect(logs.some(log => log.includes('CNS Care Plan ID'))).toBeTruthy();
  });
  
});