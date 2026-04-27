import { test, expect, type Page } from '@playwright/test';

/**
 * Medication Plan Creation — functional E2E
 *
 * Covers: login, create-plan form validation, plan creation, add-medication
 * dialog (validation, medicine search, schedule toggles, success), and a few
 * edge cases (end-before-start dates, dialog-cancel resets).
 */

// Real dev creds — TEST_USERNAME / TEST_PASSWORD env vars override.
const USERNAME = process.env.TEST_USERNAME || 'mehdi';
const PASSWORD = process.env.TEST_PASSWORD || '1,(U9]9~C@t^';

async function login(page: Page) {
  await page.goto('/');
  await page.waitForSelector('text=Username', { timeout: 10000 });
  await page.getByLabel('Username *').fill(USERNAME);
  await page.getByLabel('Password *').fill(PASSWORD);
  const signIn = page.getByRole('button', { name: /^sign in$/i });
  await expect(signIn).toBeEnabled({ timeout: 5000 });
  await signIn.click();
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/login/);
}

async function gotoMedicationPlansList(page: Page) {
  await page.goto('/#/medication-plans');
  await page.waitForLoadState('networkidle');
}

test.describe('Medication Plan Creation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('list shows the Create button for an admin user', async ({ page }) => {
    await gotoMedicationPlansList(page);
    const createBtn = page.locator('a[href*="/medication-plans/create"], button').filter({ hasText: /^(create|créer)$/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
  });

  test('Create form: required-field markers are visible', async ({ page }) => {
    await gotoMedicationPlansList(page);
    await page.locator('a[href*="/medication-plans/create"], button').filter({ hasText: /^(create|créer)$/i }).first().click();
    await page.waitForURL(/medication-plans\/create/);

    // patient, description, plan_start_date, status are all marked required (`*`).
    // We verify the form renders these required markers — the Save button itself
    // is not gated on form validity in react-admin's default toolbar; backend
    // returns 400 on incomplete submit.
    const requiredLabels = page.locator('label').filter({ hasText: /\*/ });
    expect(await requiredLabels.count()).toBeGreaterThanOrEqual(3);
  });

  test('Create form: end date before start date should not silently succeed', async ({ page }) => {
    await gotoMedicationPlansList(page);
    await page.locator('a[href*="/medication-plans/create"], button').filter({ hasText: /^(create|créer)$/i }).first().click();
    await page.waitForURL(/medication-plans\/create/);

    // Pick first patient from autocomplete
    const patientInput = page.getByLabel(/patient/i).first();
    await patientInput.click();
    await patientInput.fill('a');
    await page.locator('.MuiAutocomplete-option').first().click({ timeout: 5000 }).catch(() => {});

    await page.getByLabel(/description/i).fill('E2E end-before-start test');

    // start = today (default). Set end before start.
    const yesterday = new Date(Date.now() - 86400_000).toISOString().split('T')[0];
    const endInput = page.getByLabel(/plan_end_date|end date/i).first();
    await endInput.fill(yesterday);

    await page.getByRole('button', { name: /save|sauvegarder|enregistrer/i }).first().click();

    // We give the backend up to 5s to either reject (stay on /create) or
    // accept (redirect to /show). Whichever happens, we record the outcome.
    await page.waitForTimeout(5000);
    const url = page.url();
    const stayedOnCreate = /\/medication-plans\/create/.test(url);
    if (stayedOnCreate) {
      // OK — error surfaced inline or via notification.
      const error = page.getByText(/end.*before.*start|invalid|erreur|date/i);
      await expect(error.first()).toBeVisible({ timeout: 2000 });
    } else {
      // Landed on /show — gap to fix.
      throw new Error(
        `Plan was created with plan_end_date < plan_start_date — current url=${url}. ` +
        'Frontend or backend should reject this.',
      );
    }
  });

  test('happy path: create a plan, then add a medication via the dialog', async ({ page }) => {
    await gotoMedicationPlansList(page);
    await page.locator('a[href*="/medication-plans/create"], button').filter({ hasText: /^(create|créer)$/i }).first().click();
    await page.waitForURL(/medication-plans\/create/);

    // Patient
    const patientInput = page.getByLabel(/patient/i).first();
    await patientInput.click();
    await patientInput.fill('a');
    const firstOption = page.locator('.MuiAutocomplete-option').first();
    await firstOption.waitFor({ state: 'visible', timeout: 5000 });
    await firstOption.click();

    // Description
    const desc = `E2E test plan ${Date.now()}`;
    await page.getByLabel(/description/i).fill(desc);

    // Capture all writes for diagnostics.
    const writes: { method: string; url: string; status: number }[] = [];
    page.on('response', async (r) => {
      const m = r.request().method();
      if (m !== 'GET' && m !== 'OPTIONS') {
        writes.push({ method: m, url: r.url(), status: r.status() });
      }
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[browser]', msg.text());
    });

    await page.getByRole('button', { name: /save|sauvegarder|enregistrer/i }).first().click();

    // Wait for either redirect to /show OR error to surface.
    try {
      await page.waitForURL(/medication-plans\/\d+\/show/, { timeout: 15000 });
    } catch (e) {
      const url = page.url();
      throw new Error(
        `Did not reach /show. URL=${url}. Writes captured:\n${JSON.stringify(writes, null, 2)}`,
      );
    }

    // The "Add medication" / "Ajouter un médicament" trigger should be visible.
    const addBtn = page.getByRole('button', { name: /add medication|ajouter.*médicament/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 8000 });
    await addBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Submit button starts disabled (no medicine, no dosage).
    const submitBtn = dialog.getByRole('button', { name: /add|ajouter|submit|enregistrer/i }).last();
    await expect(submitBtn).toBeDisabled();

    // Searching with < 2 chars: no options.
    const medicineField = dialog.getByLabel(/medicine|médicament/i).first();
    await medicineField.click();
    await medicineField.fill('a');
    // The dialog should hint to type more chars; shouldn't show options yet.
    await page.waitForTimeout(300);

    // Now type 2+ chars to trigger search.
    await medicineField.fill('par');
    // Wait for autocomplete options OR a "no results" state — whichever comes first.
    await page.waitForTimeout(1500);
    const options = page.locator('.MuiAutocomplete-option');
    const optionCount = await options.count();
    if (optionCount > 0) {
      await options.first().click();
    } else {
      // No medicines starting with 'par' — try a broader prefix.
      await medicineField.fill('a');
      await medicineField.fill('a'); // re-trigger search
      await page.waitForTimeout(1500);
      const fallback = page.locator('.MuiAutocomplete-option');
      const n = await fallback.count();
      if (n === 0) {
        test.skip(true, 'No medicines available in DB for E2E search.');
      }
      await fallback.first().click();
    }

    await dialog.getByLabel(/dosage/i).fill('1 cp');
    await expect(submitBtn).toBeEnabled();

    await submitBtn.click();

    // Dialog closes, success notification, list refreshes.
    await expect(dialog).not.toBeVisible({ timeout: 8000 });

    // The medication should now appear on the page.
    await expect(page.getByText(/1 cp/).first()).toBeVisible({ timeout: 8000 });
  });

  test('Add Medication dialog: cancel resets form state', async ({ page }) => {
    // Reuse the most recent plan from the list.
    await gotoMedicationPlansList(page);
    const firstRow = page.getByRole('row').nth(1);
    await firstRow.click();
    await page.waitForURL(/medication-plans\/\d+\/show/, { timeout: 10000 });

    const addBtn = page.getByRole('button', { name: /add medication|ajouter.*médicament/i }).first();
    if (!(await addBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Could not find "Add medication" trigger on this plan.');
    }
    await addBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Type something into dosage, then cancel.
    await dialog.getByLabel(/dosage/i).fill('999');
    await dialog.getByRole('button', { name: /cancel|annuler/i }).first().click();
    await expect(dialog).not.toBeVisible();

    // Reopen — dosage should be empty again.
    await addBtn.click();
    await expect(dialog).toBeVisible();
    const dosageVal = await dialog.getByLabel(/dosage/i).inputValue();
    expect(dosageVal).toBe('');
  });
});
