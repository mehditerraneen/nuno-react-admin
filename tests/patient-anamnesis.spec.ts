import { test, expect, type Page } from '@playwright/test';

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

test.describe('Patient Anamnesis (single-page view)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('list page loads without error and shows the data table', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('response', (r) => {
      if (r.status() >= 500 && /\/patient-anamnesis/.test(r.url())) {
        errors.push(`${r.request().method()} ${r.url()} → ${r.status()}`);
      }
    });

    await page.goto('/#/patient-anamnesis');
    await page.waitForLoadState('networkidle');

    // Datagrid renders a <table role="table">
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });

    if (errors.length) {
      throw new Error(`Got 5xx on list:\n${errors.join('\n')}`);
    }
  });

  test('opening an anamnesis loads the detail page with all sections', async ({
    page,
  }) => {
    const fiveHundreds: string[] = [];
    page.on('response', (r) => {
      if (r.status() >= 500 && /\/patient-anamnesis/.test(r.url())) {
        fiveHundreds.push(`${r.request().method()} ${r.url()} → ${r.status()}`);
      }
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[browser]', msg.text());
    });

    await page.goto('/#/patient-anamnesis');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });

    // Click the first data row (skip header row).
    const firstDataRow = page.getByRole('row').nth(1);
    await firstDataRow.click();

    // Detail URL: /#/patient-anamnesis/{id}/show
    await page.waitForURL(/patient-anamnesis\/\d+\/show/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    if (fiveHundreds.length) {
      throw new Error(`Backend 5xx:\n${fiveHundreds.join('\n')}`);
    }

    // Header KPIs are visible.
    await expect(page.getByText(/Complétude/i).first()).toBeVisible();
    await expect(page.getByText(/Risque de chute \(Morse\)/i).first()).toBeVisible();

    // A representative subset of section cards is visible.
    const expectedSections = [
      /Patient & identité/i,
      /Contrat & prise en charge/i,
      /Personnes de contact/i,
      /Médecins traitants/i,
      /Pathologies & antécédents/i,
      /Aides techniques/i,
      /Risque de chute \(Morse\)/i,
      /Hygiène/i,
      /Nutrition/i,
      /Logement/i,
    ];
    for (const re of expectedSections) {
      await expect(page.getByText(re).first()).toBeVisible();
    }
  });

  test('visiting an anamnesis URL directly does not crash', async ({
    page,
  }) => {
    // Get the id of the first item from the API directly so the test
    // doesn't depend on UI navigation order.
    const apiUrl = 'http://127.0.0.1:8000/fast';

    // Login through the API to grab a token.
    const loginResp = await page.request.post(
      `${apiUrl}/mobile/api/v1/react-admin/auth/login`,
      { data: { username: USERNAME, password: PASSWORD } },
    );
    expect(loginResp.ok()).toBeTruthy();
    const { access_token } = await loginResp.json();
    const list = await page.request.get(
      `${apiUrl}/patient-anamnesis?_start=0&_end=1`,
      { headers: { Authorization: `Bearer ${access_token}` } },
    );
    expect(list.ok()).toBeTruthy();
    const { data } = await list.json();
    if (!data?.length) test.skip(true, 'No anamneses in the database to test.');
    const id = data[0].id;

    // Now hit the detail endpoint and confirm a 200 + valid JSON.
    const detail = await page.request.get(
      `${apiUrl}/patient-anamnesis/${id}`,
      { headers: { Authorization: `Bearer ${access_token}` } },
    );
    if (!detail.ok()) {
      throw new Error(
        `GET /patient-anamnesis/${id} → ${detail.status()} ${await detail.text()}`,
      );
    }
    const body = await detail.json();
    expect(body.id).toBe(id);
    expect(body.patient).toBeTruthy();
    expect(Array.isArray(body.contact_persons)).toBe(true);
    expect(Array.isArray(body.assigned_physicians)).toBe(true);
  });
});
