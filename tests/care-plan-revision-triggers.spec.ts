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

async function firstCarePlanId(page: Page, token: string): Promise<number> {
  const list = await page.request.get(`${API}/careplans?_start=0&_end=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(list.ok()).toBeTruthy();
  const { data } = await list.json();
  return data[0].id;
}

test.describe('Care plan revision triggers — API', () => {
  test('lists kinds, lists candidates, rejects unknown kinds', async ({
    page,
  }) => {
    const token = await getApiToken(page);
    const cp = await firstCarePlanId(page, token);
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const kinds = await (
      await page.request.get(
        `${API}/careplans/${cp}/revisions/trigger-kinds`,
        auth,
      )
    ).json();
    const kindNames = kinds.map((k: any) => k.kind);
    expect(kindNames).toEqual(
      expect.arrayContaining([
        'fall',
        'prescription',
        'cns_plan',
        'hospitalization',
      ]),
    );

    const fallCands = await page.request.get(
      `${API}/careplans/${cp}/revisions/trigger-candidates?kind=fall&limit=5`,
      auth,
    );
    expect(fallCands.ok()).toBeTruthy();

    const bogus = await page.request.get(
      `${API}/careplans/${cp}/revisions/trigger-candidates?kind=bogus`,
      auth,
    );
    expect(bogus.status()).toBe(400);
  });

  test('attach + detach a trigger end-to-end', async ({ page }) => {
    const token = await getApiToken(page);
    const cp = await firstCarePlanId(page, token);
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    // Find a fall candidate; if none, skip.
    const candResp = await page.request.get(
      `${API}/careplans/${cp}/revisions/trigger-candidates?kind=fall&limit=1`,
      auth,
    );
    const candidates = await candResp.json();
    if (!candidates.length) test.skip(true, 'No fall declarations in DB');
    const fallSourceId = candidates[0].source_id;

    // Create a revision.
    const revResp = await page.request.post(
      `${API}/careplans/${cp}/revisions`,
      { ...auth, data: { comment: 'E2E API test' } },
    );
    expect(revResp.ok()).toBeTruthy();
    const revision = await revResp.json();

    // Attach.
    const attachResp = await page.request.post(
      `${API}/careplans/${cp}/revisions/${revision.id}/triggers`,
      { ...auth, data: { kind: 'fall', source_id: fallSourceId } },
    );
    expect(attachResp.status()).toBe(201);
    const trigger = await attachResp.json();
    expect(trigger.kind).toBe('fall');
    expect(trigger.source_id).toBe(fallSourceId);
    expect(trigger.summary).toBeTruthy();

    // Attaching the same pair again is idempotent (returns existing).
    const dup = await page.request.post(
      `${API}/careplans/${cp}/revisions/${revision.id}/triggers`,
      { ...auth, data: { kind: 'fall', source_id: fallSourceId } },
    );
    expect(dup.status()).toBe(201);
    const dupBody = await dup.json();
    expect(dupBody.id).toBe(trigger.id);

    // Detach.
    const detachResp = await page.request.delete(
      `${API}/careplans/${cp}/revisions/${revision.id}/triggers/${trigger.id}`,
      auth,
    );
    expect(detachResp.status()).toBe(204);

    // Cleanup: delete the revision.
    await page.request.delete(
      `${API}/careplans/${cp}/revisions/${revision.id}`,
      auth,
    );
  });

  test('attach with unknown source returns 404', async ({ page }) => {
    const token = await getApiToken(page);
    const cp = await firstCarePlanId(page, token);
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const revResp = await page.request.post(
      `${API}/careplans/${cp}/revisions`,
      { ...auth, data: { comment: 'E2E 404 test' } },
    );
    const revision = await revResp.json();

    const bad = await page.request.post(
      `${API}/careplans/${cp}/revisions/${revision.id}/triggers`,
      { ...auth, data: { kind: 'fall', source_id: 999_999_999 } },
    );
    expect(bad.status()).toBe(404);

    await page.request.delete(
      `${API}/careplans/${cp}/revisions/${revision.id}`,
      auth,
    );
  });
});

test.describe('Care plan revision triggers — UI', () => {
  test('create revision with a trigger via the dialog', async ({ page }) => {
    await login(page);
    const token = await getApiToken(page);
    const cp = await firstCarePlanId(page, token);

    // Make sure the chosen care plan has at least one fall to pick.
    const fall = await page.request
      .get(
        `${API}/careplans/${cp}/revisions/trigger-candidates?kind=fall&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .then((r) => r.json());
    if (!fall.length) test.skip(true, 'No fall declarations for this patient');

    await page.goto(`/#/careplans/${cp}/show`);
    await page.waitForLoadState('networkidle');

    // Click the "Mark as revised" / "Marquer..." button. Translation key
    // is care_plan_revision.mark_button — match by either the contained
    // CheckCircle icon's button label.
    const markBtn = page.getByRole('button').filter({ hasText: /marquer/i }).first();
    await expect(markBtn).toBeVisible({ timeout: 10000 });
    await markBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill the comment.
    const comment = `E2E ${Date.now()}`;
    await dialog.getByLabel(/commentaire|comment/i).first().fill(comment);

    // Pick a fall via the autocomplete.
    const search = dialog.getByPlaceholder('Rechercher…').first();
    await search.click();
    const option = page.locator('.MuiAutocomplete-option').first();
    await option.waitFor({ state: 'visible', timeout: 8000 });
    const optionText = (await option.textContent()) || '';
    await option.click();

    // The picked item should appear as a pending chip in the dialog.
    await expect(
      dialog.locator('.MuiChip-root', { hasText: optionText.slice(0, 8) }),
    ).toBeVisible();

    // Submit.
    const confirmBtn = dialog
      .getByRole('button')
      .filter({ hasText: /confirmer|valider|enregistrer|^OK$/i })
      .last();
    // Fallback: use the last button in the dialog (the submit).
    const lastBtn = dialog.getByRole('button').last();
    await (await confirmBtn.count() ? confirmBtn : lastBtn).click();

    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // After refresh, a new revision row exists with our comment + a chip.
    await expect(page.getByText(comment).first()).toBeVisible({
      timeout: 10000,
    });
    // The trigger's first ~10 chars of summary should be on the page now.
    await expect(
      page.getByText(optionText.slice(0, 10)).first(),
    ).toBeVisible();
  });
});
