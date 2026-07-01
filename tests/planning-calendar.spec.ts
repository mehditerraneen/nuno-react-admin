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
  timing: { acts_min: 0, current_min: 60, suggested_end: null, delta_min: 0 },
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
    // AEV panel from GET /events/{id}/aev-plan
    await expect(dialog.getByText(/Codes AEV/i)).toBeVisible();
    await expect(dialog.getByText("AEVH01")).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /Ajouter/i }),
    ).toBeVisible();
  });

  test("adding a suggestion calls aev-mutate", async ({ page }) => {
    await page.goto("/#/planning/calendar");
    await page.locator(".fc-event").first().click({ timeout: 15000 });
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("AEVH01")).toBeVisible();

    const mutateCall = page.waitForRequest(/\/events\/\d+\/aev-mutate/);
    await dialog.getByRole("button", { name: /Ajouter/i }).click();
    const req = await mutateCall;
    expect(req.method()).toBe("POST");
    expect(req.postDataJSON()).toMatchObject({ action: "add", detail_id: 500 });
  });
});
