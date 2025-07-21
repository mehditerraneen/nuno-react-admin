import { Page, expect } from '@playwright/test';

export class CarePlanTestHelper {
  constructor(private page: Page) {}

  async navigateToCarePlans() {
    await this.page.goto('/careplans');
    await this.page.waitForLoadState('networkidle');
  }

  async openFirstCarePlan() {
    await this.page.click('[data-testid="show-button"]:first-child, .MuiTableRow-root:first-child');
    await this.page.waitForLoadState('networkidle');
  }

  async openCreateDetailDialog() {
    await this.page.getByRole('button', { name: /add new detail/i }).click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  async fillBasicDetailForm(name: string, timeStart: string, timeEnd: string) {
    await this.page.getByLabel(/name/i).fill(name);
    await this.page.getByLabel(/time start/i).fill(timeStart);
    await this.page.getByLabel(/time end/i).fill(timeEnd);
  }

  async addCareItem(careItemName?: string, quantity: number = 1) {
    // Click add button to add a new care item row
    await this.page.getByRole('button', { name: /add/i }).last().click();
    
    if (careItemName) {
      // Select care item
      const careItemSelect = this.page.getByLabel(/care item/i).last();
      await careItemSelect.click();
      await this.page.getByText(careItemName).click();
    }
    
    // Set quantity
    const quantityInput = this.page.getByLabel(/quantity/i).last();
    await quantityInput.fill(quantity.toString());
  }

  async selectOccurrence(dayName: string) {
    await this.page.getByLabel(dayName).check();
  }

  async saveDetail() {
    await this.page.getByRole('button', { name: /save/i }).click();
  }

  async cancelDetail() {
    await this.page.getByRole('button', { name: /cancel/i }).click();
  }

  async expectDetailDialogToBeOpen() {
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  async expectDetailDialogToBeClosed() {
    await expect(this.page.getByRole('dialog')).not.toBeVisible();
  }

  async expectAddButtonToBeVisible() {
    await expect(this.page.getByRole('button', { name: /add new detail/i })).toBeVisible();
  }

  async expectEmptyStateMessage() {
    await expect(this.page.getByText(/no details found.*click.*add new detail/i)).toBeVisible();
  }

  async expectValidationError(fieldName: string) {
    await expect(this.page.getByText(new RegExp(`${fieldName}.*required`, 'i'))).toBeVisible();
  }

  async waitForCNSLogging() {
    // Wait for CNS-related console logs
    await this.page.waitForTimeout(1000);
  }

  async expectCareItemsToBeAvailable() {
    const careItemSelect = this.page.getByLabel(/care item/i).first();
    await careItemSelect.click();
    
    const options = this.page.locator('.MuiAutocomplete-option');
    await expect(options.first()).toBeVisible({ timeout: 5000 });
  }
}

export class MockDataHelper {
  constructor(private page: Page) {}

  async mockCNSCarePlan(carePlanId: string, cnsItems: Array<{id: number, code: string, description: string}>) {
    await this.page.route(`**/cnscareplans/${carePlanId}`, async route => {
      const mockDetails = cnsItems.map(item => ({
        id: item.id,
        item: item,
        custom_description: '',
        medical_care_summary_per_patient_id: parseInt(carePlanId),
        number_of_care: 1,
        periodicity: 'daily'
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDetails)
      });
    });
  }

  async mockEmptyCNSCarePlan(carePlanId: string) {
    await this.page.route(`**/cnscareplans/${carePlanId}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
  }

  async mockLongTermCareItems(items: Array<{id: number, code: string, description: string}>) {
    await this.page.route('**/longtermcareitems**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: items,
          total: items.length
        })
      });
    });
  }
}