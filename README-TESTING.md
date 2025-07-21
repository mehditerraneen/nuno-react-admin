# UI Testing Guide

This project uses Playwright for end-to-end testing to prevent regressions and ensure functionality works as expected.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm run test:e2e

# Run tests with UI (visual test runner)
npm run test:e2e:ui

# Run tests with browser visible
npm run test:e2e:headed

# Run specific test file
npx playwright test care-plan-details.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
```

### Development Workflow

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Run tests in another terminal:**
   ```bash
   npm run test:e2e:headed
   ```

## Test Structure

### Test Files

- `tests/care-plan-details.spec.ts` - Core functionality tests
- `tests/cns-integration.spec.ts` - CNS care plan integration tests  
- `tests/visual-regression.spec.ts` - Visual regression tests
- `tests/smoke-tests.spec.ts` - Basic functionality checks

### Test Helpers

- `tests/helpers/test-helpers.ts` - Reusable test utilities and page objects

## Key Test Scenarios

### 1. Care Plan Details Functionality
```typescript
test('should show "Add New Detail" button on empty care plan', async ({ page }) => {
  const helper = new CarePlanTestHelper(page);
  await helper.navigateToCarePlans();
  await helper.openFirstCarePlan();
  await helper.expectAddButtonToBeVisible();
  await helper.expectEmptyStateMessage();
});
```

### 2. CNS Integration
```typescript
test('should filter items based on CNS care plan', async ({ page }) => {
  const mockHelper = new MockDataHelper(page);
  await mockHelper.mockCNSCarePlan('123', cnsItems);
  // ... test CNS filtering logic
});
```

### 3. Visual Regression
```typescript
test('care plan detail view should look correct', async ({ page }) => {
  await page.goto('/careplans/1');
  await expect(page).toHaveScreenshot('care-plan-details.png');
});
```

## Writing New Tests

### 1. Basic Test Structure
```typescript
import { test, expect } from '@playwright/test';
import { CarePlanTestHelper } from './helpers/test-helpers';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    const helper = new CarePlanTestHelper(page);
    await helper.navigateToCarePlans();
    // ... test logic
  });
});
```

### 2. Using Test Helpers
```typescript
const helper = new CarePlanTestHelper(page);

// Navigation
await helper.navigateToCarePlans();
await helper.openFirstCarePlan();

// Dialog operations
await helper.openCreateDetailDialog();
await helper.fillBasicDetailForm('Test Detail', '09:00', '17:00');
await helper.addCareItem('ITEM001', 2);
await helper.saveDetail();

// Assertions
await helper.expectDetailDialogToBeOpen();
await helper.expectAddButtonToBeVisible();
```

### 3. Mocking API Responses
```typescript
const mockHelper = new MockDataHelper(page);

// Mock CNS care plan data
await mockHelper.mockCNSCarePlan('123', [
  { id: 1, code: 'CNS001', description: 'CNS Item 1' }
]);

// Mock long term care items
await mockHelper.mockLongTermCareItems([
  { id: 1, code: 'ITEM001', description: 'Care Item 1' }
]);
```

## Best Practices

### 1. Use Test IDs
```tsx
<Button data-testid="add-new-detail-button">Add New Detail</Button>
```

### 2. Wait for Network Operations
```typescript
await page.waitForLoadState('networkidle');
```

### 3. Use Page Object Pattern
```typescript
class CarePlanTestHelper {
  async openCreateDetailDialog() {
    await this.page.getByTestId('add-new-detail-button').click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }
}
```

### 4. Mock External Dependencies
```typescript
// Mock API calls to avoid dependency on backend
await page.route('**/longtermcareitems**', async route => {
  await route.fulfill({
    status: 200,
    body: JSON.stringify({ data: mockItems })
  });
});
```

## Debugging Tests

### 1. Visual Debugging
```bash
npm run test:e2e:ui
```

### 2. Console Logs
```typescript
page.on('console', msg => console.log(msg.text()));
```

### 3. Screenshots on Failure
```typescript
test('my test', async ({ page }) => {
  // Automatic screenshot on failure (configured in playwright.config.ts)
});
```

### 4. Debug Mode
```bash
npx playwright test --debug care-plan-details.spec.ts
```

## CI/CD Integration

Tests run automatically on:
- Push to main/master branch
- Pull requests
- Via GitHub Actions (see `.github/workflows/tests.yml`)

## Regression Prevention

### 1. Visual Regression Tests
- Automatically compare screenshots
- Detect UI changes between versions
- Update baselines when changes are intentional

### 2. Functional Tests
- Test critical user workflows
- Validate CNS integration logic
- Ensure dialogs and forms work correctly

### 3. Smoke Tests
- Basic application loading
- Navigation between sections
- Mobile responsiveness

## Common Issues & Solutions

### 1. Element Not Found
```typescript
// ❌ Bad: Element might not be loaded
await page.click('button');

// ✅ Good: Wait for element
await page.getByRole('button', { name: 'Add New Detail' }).click();
```

### 2. Timing Issues
```typescript
// ❌ Bad: Race conditions
await page.click('button');
await page.click('save');

// ✅ Good: Wait for state changes
await page.click('button');
await page.waitForLoadState('networkidle');
await page.click('save');
```

### 3. Flaky Tests
```typescript
// Use explicit waits and assertions
await expect(element).toBeVisible({ timeout: 10000 });
```

This testing setup ensures your care plan functionality remains stable and prevents regressions as you add new features.