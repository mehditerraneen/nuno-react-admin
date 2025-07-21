import { test, expect } from '@playwright/test';
import { CarePlanTestHelper, MockDataHelper } from './helpers/test-helpers';

test.describe('CNS Integration Tests', () => {
  let carePlanHelper: CarePlanTestHelper;
  let mockHelper: MockDataHelper;

  test.beforeEach(async ({ page }) => {
    carePlanHelper = new CarePlanTestHelper(page);
    mockHelper = new MockDataHelper(page);
  });

  test('should filter items based on CNS care plan when CNS plan exists', async ({ page }) => {
    // Mock CNS care plan with specific items
    const cnsItems = [
      { id: 1, code: 'CNS001', description: 'CNS Care Item 1' },
      { id: 2, code: 'CNS002', description: 'CNS Care Item 2' }
    ];
    
    await mockHelper.mockCNSCarePlan('123', cnsItems);
    await mockHelper.mockLongTermCareItems([
      ...cnsItems,
      { id: 3, code: 'OTHER001', description: 'Other Care Item' }, // This should be filtered out
    ]);

    await carePlanHelper.navigateToCarePlans();
    await carePlanHelper.openFirstCarePlan();
    await carePlanHelper.openCreateDetailDialog();
    
    // Add care item
    await carePlanHelper.addCareItem();
    
    // Should only see CNS items in the dropdown
    const careItemSelect = page.getByLabel(/care item/i).first();
    await careItemSelect.click();
    
    // Should see CNS items
    await expect(page.getByText('CNS001')).toBeVisible();
    await expect(page.getByText('CNS002')).toBeVisible();
    
    // Should NOT see other items (this would fail if filtering is not working)
    await expect(page.getByText('OTHER001')).not.toBeVisible();
  });

  test('should show all items when no CNS care plan exists', async ({ page }) => {
    // Mock empty CNS care plan
    await mockHelper.mockEmptyCNSCarePlan('123');
    
    const allItems = [
      { id: 1, code: 'ITEM001', description: 'Care Item 1' },
      { id: 2, code: 'ITEM002', description: 'Care Item 2' },
      { id: 3, code: 'ITEM003', description: 'Care Item 3' }
    ];
    
    await mockHelper.mockLongTermCareItems(allItems);

    await carePlanHelper.navigateToCarePlans();
    await carePlanHelper.openFirstCarePlan();
    await carePlanHelper.openCreateDetailDialog();
    
    // Add care item
    await carePlanHelper.addCareItem();
    
    // Should see all items when no CNS filtering
    const careItemSelect = page.getByLabel(/care item/i).first();
    await careItemSelect.click();
    
    await expect(page.getByText('ITEM001')).toBeVisible();
    await expect(page.getByText('ITEM002')).toBeVisible();
    await expect(page.getByText('ITEM003')).toBeVisible();
  });

  test('should handle CNS API errors gracefully', async ({ page }) => {
    // Mock CNS API to return error
    await page.route('**/cnscareplans/123', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await mockHelper.mockLongTermCareItems([
      { id: 1, code: 'ITEM001', description: 'Care Item 1' }
    ]);

    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await carePlanHelper.navigateToCarePlans();
    await carePlanHelper.openFirstCarePlan();
    await carePlanHelper.openCreateDetailDialog();
    
    // Should still be able to add items (fallback to all items)
    await carePlanHelper.addCareItem();
    await carePlanHelper.expectCareItemsToBeAvailable();
    
    // Should have logged the error
    await carePlanHelper.waitForCNSLogging();
    expect(errors.some(error => error.includes('Failed to fetch CNS item IDs'))).toBeTruthy();
  });

  test('should log CNS care plan ID for debugging', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(msg.text());
    });

    await carePlanHelper.navigateToCarePlans();
    await carePlanHelper.openFirstCarePlan();
    await carePlanHelper.openCreateDetailDialog();
    
    await carePlanHelper.waitForCNSLogging();
    
    // Should log CNS care plan information
    expect(logs.some(log => log.includes('CNS Care Plan ID'))).toBeTruthy();
    expect(logs.some(log => log.includes('CNS available item IDs') || log.includes('No CNS care plan ID provided'))).toBeTruthy();
  });

});