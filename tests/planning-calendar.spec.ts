import { test, expect, Page } from "@playwright/test";

// The planning calendar (#/planning/calendar) reads from FastAPI /fast/events.
// These tests seed an auth token (so requireAuth passes) and mock every /fast
// call, so they are deterministic and don't need a live backend.

const today = new Date().toISOString().slice(0, 10);

const listEvent = {
  id: 42,
  day: today,
  time_start_event: "10:00:00",
  time_end_event: "11:00:00",
  real_time_start_event: null,
  real_time_end_event: null,
  state: 2,
  notes: "Note de test",
  patient_id: 7,
  patient_name: "MARTIN Alice",
  employees: "Dupont Jean",
  employee_id: 1,
  employee_name: "Dupont Jean",
  employee_avatar: null,
  event_type_enum: "CARE",
  tour_id: null,
  created_on: `${today}T09:00:00`,
  updated_on: `${today}T09:00:00`,
  color: "#4a90d9",
  textColor: "#ffffff",
  has_aev_or_care_codes: false,
};

const singleEvent = {
  ...listEvent,
  event_report: "",
  event_address: "12 rue du Test",
};

const aevPlan = {
  event_id: 42,
  day: today,
  patient_id: 7,
  has_active_plan: true,
  is_done: false,
  suggestions: [
    {
      item_id: 100,
      code: "AEVH01",
      label: "Toilette",
      description: "Aide à la toilette",
      type: "Hygiène",
      planned: "10:00–11:00",
      on_event: false,
      cns_detail_id: 500,
      allocated: 7,
      consumed: 2,
      remaining: 5,
      status: "available",
    },
  ],
  attached: [],
  generic: [],
  minutes: {
    nature_package: 5,
    forfait_code: "AEVF05",
    budget: 600,
    consumed: 120,
    planned: 200,
    over: false,
    plan_over_cap: false,
    period: [today, today],
  },
  timing: { acts_min: 90, current_min: 60, suggested_end: "11:30", delta_min: 30 },
};

async function seedAuth(page: Page) {
  await page.addInitScript(() => {
    const inHour = Date.now() + 60 * 60 * 1000;
    localStorage.setItem("auth_access_token", "Bearer test-token");
    localStorage.setItem("auth_refresh_token", "refresh-token");
    localStorage.setItem("auth_token_expiry", String(inHour));
    localStorage.setItem(
      "auth_user",
      JSON.stringify({
        id: 1,
        username: "test",
        role: "admin",
        roles: ["admin"],
        isStaff: true,
        fullName: "Test User",
      }),
    );
  });
}

async function mockApi(page: Page) {
  // Fallback: any other /fast call returns an empty list (keeps the app quiet).
  await page.route(/\/fast\//, (route) =>
    route.fulfill({ json: { data: [], total: 0, items: [], pages: 1 } }),
  );
  await page.route(/\/employees(\?|$|\/)/, (route) =>
    route.fulfill({
      json: { data: [{ id: 1, name: "Dupont Jean" }], total: 1 },
    }),
  );
  await page.route(/\/events\?/, (route) =>
    route.fulfill({
      json: { items: [listEvent], total: 1, page: 1, page_size: 100, pages: 1 },
    }),
  );
  await page.route(/\/events\/\d+\/aev-plan/, (route) =>
    route.fulfill({ json: aevPlan }),
  );
  await page.route(/\/events\/\d+\/aev-mutate/, (route) =>
    route.fulfill({
      json: { ok: true, attached: [], generic: [], minutes: aevPlan.minutes, timing: aevPlan.timing },
    }),
  );
  await page.route(/\/events\/\d+(\?|$)/, (route) =>
    route.fulfill({ json: singleEvent }),
  );
}

test.describe("Planning calendar", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockApi(page);
  });

  test("loads and renders the mocked event", async ({ page }) => {
    await page.goto("/#/planning/calendar");
    await expect(
      page.getByRole("heading", { name: /Planning — calendrier/i }),
    ).toBeVisible({ timeout: 15000 });
    // FullCalendar renders the event (title = patient name)
    await expect(page.locator(".fc-event").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("MARTIN Alice").first()).toBeVisible();
  });

  test("opens the edit dialog with the AEV panel and a plan suggestion", async ({
    page,
  }) => {
    await page.goto("/#/planning/calendar");
    await page.locator(".fc-event").first().click({ timeout: 15000 });

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Modifier l'événement/i)).toBeVisible();
    // rich edit fields loaded from GET /events/{id}
    await expect(dialog.getByLabel("Adresse")).toHaveValue("12 rue du Test");
    // AEV panel from GET /events/{id}/aev-plan — collapsed by default, expand it
    await dialog.getByText(/Codes AEV/i).click();
    await expect(dialog.getByText("AEVH01")).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /^Ajouter$/i }),
    ).toBeVisible();
  });

  test("adding a suggestion calls aev-mutate", async ({ page }) => {
    await page.goto("/#/planning/calendar");
    await page.locator(".fc-event").first().click({ timeout: 15000 });
    const dialog = page.getByRole("dialog");
    await dialog.getByText(/Codes AEV/i).click();
    await expect(dialog.getByText("AEVH01")).toBeVisible();

    const mutateCall = page.waitForRequest(/\/events\/\d+\/aev-mutate/);
    await dialog.getByRole("button", { name: /^Ajouter$/i }).click();
    const req = await mutateCall;
    expect(req.method()).toBe("POST");
    expect(req.postDataJSON()).toMatchObject({ action: "add", detail_id: 500 });
  });

  test("adapts the end time to the acts total", async ({ page }) => {
    await page.goto("/#/planning/calendar");
    await page.locator(".fc-event").first().click({ timeout: 15000 });
    const dialog = page.getByRole("dialog");
    // end starts at 11:00
    await expect(dialog.getByLabel("Fin")).toHaveValue("11:00");
    await dialog.getByText(/Codes AEV/i).click();
    // acts_min=90 from 10:00 -> suggests 11:30
    await dialog.getByRole("button", { name: /Adapter la fin à 11:30/i }).click();
    await expect(dialog.getByLabel("Fin")).toHaveValue("11:30");
  });

  test("hides the AEV panel when the event has no patient", async ({ page }) => {
    // Override the single-event fetch to return an event without a patient.
    await page.route(/\/events\/\d+(\?|$)/, (route) =>
      route.fulfill({
        json: { ...singleEvent, patient_id: null, patient_name: null },
      }),
    );
    await page.goto("/#/planning/calendar");
    await page.locator(".fc-event").first().click({ timeout: 15000 });
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/Modifier l'événement/i)).toBeVisible();
    await expect(dialog.getByText(/Codes AEV/i)).toHaveCount(0);
  });

  test("adds a free-duration task (add_generic)", async ({ page }) => {
    await page.goto("/#/planning/calendar");
    await page.locator(".fc-event").first().click({ timeout: 15000 });
    const dialog = page.getByRole("dialog");
    await dialog.getByText(/Codes AEV/i).click();
    await dialog.getByLabel("Tâche").fill("Transmission");
    await dialog.getByLabel("min").fill("15");

    const call = page.waitForRequest(/\/events\/\d+\/aev-mutate/);
    await dialog.getByRole("button", { name: /Ajouter tâche/i }).click();
    const req = await call;
    expect(req.postDataJSON()).toMatchObject({
      action: "add_generic",
      label: "Transmission",
      minutes: 15,
    });
  });

  test("series event: scope selector propagates via series_action", async ({
    page,
  }) => {
    // The event belongs to a recurring series.
    await page.route(/\/events\/\d+(\?|$)/, (route) =>
      route.fulfill({ json: { ...singleEvent, series_id: "series-abc" } }),
    );
    await page.goto("/#/planning/calendar");
    await page.locator(".fc-event").first().click({ timeout: 15000 });
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel(/Appliquer à/i)).toBeVisible();

    await dialog.getByLabel(/Appliquer à/i).click();
    await page
      .getByRole("option", { name: /Celle-ci et les suivantes/i })
      .click();

    const putReq = page.waitForRequest(
      (r) => /\/events\/\d+\?/.test(r.url()) && r.method() === "PUT",
    );
    await dialog.getByRole("button", { name: /Enregistrer/i }).click();
    const req = await putReq;
    expect(req.url()).toContain("series_action=following");
  });

  test("deletes the event (DELETE series_action=single)", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await page.goto("/#/planning/calendar");
    await page.locator(".fc-event").first().click({ timeout: 15000 });
    const dialog = page.getByRole("dialog");
    const delReq = page.waitForRequest(
      (r) => /\/events\/\d+\?/.test(r.url()) && r.method() === "DELETE",
    );
    await dialog.getByRole("button", { name: /Supprimer/i }).click();
    const req = await delReq;
    expect(req.url()).toContain("series_action=single");
  });

  test("series delete sends series_action=all", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await page.route(/\/events\/\d+(\?|$)/, (route) => {
      if (route.request().method() === "DELETE") {
        return route.fulfill({ status: 204, body: "" });
      }
      return route.fulfill({ json: { ...singleEvent, series_id: "series-abc" } });
    });
    await page.goto("/#/planning/calendar");
    await page.locator(".fc-event").first().click({ timeout: 15000 });
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Appliquer à/i).click();
    await page.getByRole("option", { name: /Toute la série/i }).click();

    const delReq = page.waitForRequest(
      (r) => /\/events\/\d+\?/.test(r.url()) && r.method() === "DELETE",
    );
    await dialog.getByRole("button", { name: /Supprimer/i }).click();
    const req = await delReq;
    expect(req.url()).toContain("series_action=all");
  });

  test("'Voir la série' activates the series filter", async ({ page }) => {
    await page.route(/\/events\/\d+(\?|$)/, (route) =>
      route.fulfill({ json: { ...singleEvent, series_id: "series-abc" } }),
    );
    await page.goto("/#/planning/calendar");
    await page.locator(".fc-event").first().click({ timeout: 15000 });
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /Voir la série/i }).click();
    await expect(dialog).toBeHidden();
    // the toolbar shows the active series-filter chip
    await expect(page.getByText(/Série series-a/i)).toBeVisible();
  });

  test("multi-select + bulk assign sends employee_id per event", async ({
    page,
  }) => {
    await page.goto("/#/planning/calendar");
    await page.getByRole("button", { name: /Sélection multiple/i }).click();
    await page.locator(".fc-event").first().click({ timeout: 15000 });
    await expect(page.getByText(/1 sélectionné/i)).toBeVisible();

    await page.getByLabel("Employé").last().click();
    await page.getByRole("option", { name: "Dupont Jean" }).click();

    const putReq = page.waitForRequest(
      (r) => /\/events\/\d+\?/.test(r.url()) && r.method() === "PUT",
    );
    await page.getByRole("button", { name: /^Assigner$/i }).click();
    const req = await putReq;
    expect(req.postDataJSON()).toMatchObject({ employee_id: 1 });
  });

  test("multi-select + bulk duplicate posts to bulk-duplicate", async ({
    page,
  }) => {
    await page.route(/\/events\/bulk-duplicate/, (route) =>
      route.fulfill({
        json: {
          requested: 1,
          created_count: 1,
          created_ids: [99],
          skipped_count: 0,
          skipped: [],
          errors: [],
          target_date: "2026-07-20",
        },
      }),
    );
    await page.goto("/#/planning/calendar");
    await page.getByRole("button", { name: /Sélection multiple/i }).click();
    await page.locator(".fc-event").first().click({ timeout: 15000 });
    await page.getByLabel("Dupliquer vers").fill("2026-07-20");

    const postReq = page.waitForRequest(
      (r) =>
        /\/events\/bulk-duplicate/.test(r.url()) && r.method() === "POST",
    );
    await page.getByRole("button", { name: /^Dupliquer$/i }).click();
    const req = await postReq;
    expect(req.postDataJSON()).toMatchObject({
      event_ids: [42],
      target_date: "2026-07-20",
    });
  });
});
