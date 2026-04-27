import { test, expect, type Page } from '@playwright/test';

const USERNAME = process.env.TEST_USERNAME || 'mehdi';
const PASSWORD = process.env.TEST_PASSWORD || '1,(U9]9~C@t^';
const API = 'http://127.0.0.1:8000/fast';

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

async function getApiToken(page: Page): Promise<string> {
  const r = await page.request.post(
    `${API}/mobile/api/v1/react-admin/auth/login`,
    { data: { username: USERNAME, password: PASSWORD } },
  );
  expect(r.ok()).toBeTruthy();
  const { access_token } = await r.json();
  return access_token;
}

test.describe('Patient show with embedded anamnesis', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Patients menu entry is present and list loads', async ({ page }) => {
    await page.goto('/#/patients');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });
  });

  test('opening a patient who HAS an anamnesis shows the section cards', async ({
    page,
  }) => {
    const token = await getApiToken(page);
    // Find a patient that has an anamnesis: list anamneses, take its patient_id.
    const anamnesisList = await page.request.get(
      `${API}/patient-anamnesis?_start=0&_end=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(anamnesisList.ok()).toBeTruthy();
    const { data } = await anamnesisList.json();
    if (!data?.length) test.skip(true, 'No anamneses in DB');
    const patientId = data[0].patient_id;

    const fiveHundreds: string[] = [];
    page.on('response', (r) => {
      if (r.status() >= 500 && /\/(patients|patient-anamnesis)/.test(r.url())) {
        fiveHundreds.push(`${r.request().method()} ${r.url()} → ${r.status()}`);
      }
    });

    await page.goto(`/#/patients/${patientId}/show`);
    await page.waitForLoadState('networkidle');

    // Patient header must render.
    await expect(page.getByText(/Matricule:/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Anamnesis sections from the embedded view.
    await expect(page.getByText(/Pathologies & antécédents/i).first())
      .toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Hygiène/i).first()).toBeVisible();
    await expect(
      page.getByText(/Évaluation du risque de chute/i).first(),
    ).toBeVisible();

    if (fiveHundreds.length) {
      throw new Error(`Backend 5xx:\n${fiveHundreds.join('\n')}`);
    }
  });

  test('opening a patient with NO anamnesis shows the empty state', async ({
    page,
  }) => {
    const token = await getApiToken(page);

    // Find a patient without any anamnesis. We page through patients and
    // check anamnesis count for each until we find one with zero.
    let candidate: number | null = null;
    for (let start = 0; start < 200 && candidate === null; start += 25) {
      const list = await page.request.get(
        `${API}/patients?_start=${start}&_end=${start + 25}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(list.ok()).toBeTruthy();
      const body = await list.json();
      for (const p of body.data || []) {
        const a = await page.request.get(
          `${API}/patient-anamnesis?patient_id=${p.id}&_start=0&_end=1`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const aBody = await a.json();
        if (!aBody?.data?.length) {
          candidate = p.id;
          break;
        }
      }
      if ((body.data || []).length < 25) break;
    }

    if (candidate === null) {
      test.skip(true, 'Every patient in the first 200 has an anamnesis');
    }

    const fiveHundreds: string[] = [];
    page.on('response', (r) => {
      if (r.status() >= 500 && /\/(patients|patient-anamnesis)/.test(r.url())) {
        fiveHundreds.push(`${r.request().method()} ${r.url()} → ${r.status()}`);
      }
    });

    await page.goto(`/#/patients/${candidate}/show`);
    await page.waitForLoadState('networkidle');

    // Patient header still renders.
    await expect(page.getByText(/Matricule:/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Empty state shown instead of section cards.
    await expect(
      page.getByText(/Aucune anamnèse enregistrée/i).first(),
    ).toBeVisible({ timeout: 10000 });

    // No section card titles are visible.
    await expect(
      page.getByText(/Pathologies & antécédents/i),
    ).toHaveCount(0);

    if (fiveHundreds.length) {
      throw new Error(`Backend 5xx:\n${fiveHundreds.join('\n')}`);
    }
  });

  test('the standalone "Anamnèses" entry is no longer in the sidebar', async ({
    page,
  }) => {
    await page.goto('/#/patients');
    await page.waitForLoadState('networkidle');
    // Should NOT see a sidebar link for "Anamnèses".
    await expect(
      page.getByRole('menuitem', { name: /^Anamnèses$/i }),
    ).toHaveCount(0);
    // Patients should be in the menu.
    await expect(
      page.getByRole('menuitem', { name: /^Patients$/i }).first(),
    ).toBeVisible();
  });
});
