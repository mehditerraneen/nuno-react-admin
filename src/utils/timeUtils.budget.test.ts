import { describe, it, expect } from "vitest";
import {
  calculateItemWeeklyBudgets,
  weekMultiplier,
  formatElsewhereByDay,
} from "./timeUtils";

const MENAGE = { code: "AMD-M", weekly_package: 180, description: "Ménage" };

describe("weekMultiplier", () => {
  it("counts specific days additively", () => {
    expect(
      weekMultiplier([{ str_name: "Mercredi" }, { str_name: "Jeudi" }]),
    ).toBe(2);
  });

  it("treats an every-day occurrence as 7", () => {
    expect(weekMultiplier([{ str_name: "Tous les jours" }])).toBe(7);
    expect(weekMultiplier([{ value: "*" }])).toBe(7);
  });

  it("is 0 for no occurrences", () => {
    expect(weekMultiplier([])).toBe(0);
  });
});

describe("calculateItemWeeklyBudgets — forfait ménage 180 min/week", () => {
  it("a single 180-min session once a week is within budget (no ÷7)", () => {
    const [b] = calculateItemWeeklyBudgets({
      currentItems: [MENAGE],
      currentSessionMinutes: 180,
      currentOccurrences: [{ str_name: "Mercredi" }],
      siblingSessions: [],
    });
    expect(b.weeklyPackage).toBe(180);
    expect(b.minutesHere).toBe(180);
    expect(b.minutesElsewhere).toBe(0);
    expect(b.totalMinutes).toBe(180);
    expect(b.over).toBe(false);
    expect(b.remaining).toBe(0);
  });

  it("split within budget (90 + 90) is OK", () => {
    const [b] = calculateItemWeeklyBudgets({
      currentItems: [MENAGE],
      currentSessionMinutes: 90,
      currentOccurrences: [{ str_name: "Mercredi" }],
      siblingSessions: [
        {
          minutes: 90,
          occurrences: [{ str_name: "Jeudi" }],
          itemCodes: ["AMD-M"],
        },
      ],
    });
    expect(b.totalMinutes).toBe(180);
    expect(b.over).toBe(false);
    expect(b.remaining).toBe(0);
  });

  it("split over budget (120 + 120) flags overflow and reports the other day", () => {
    const [b] = calculateItemWeeklyBudgets({
      currentItems: [MENAGE],
      currentSessionMinutes: 120,
      currentOccurrences: [{ str_name: "Mercredi" }],
      siblingSessions: [
        {
          minutes: 120,
          occurrences: [{ str_name: "Jeudi" }],
          itemCodes: ["AMD-M"],
        },
      ],
    });
    expect(b.minutesHere).toBe(120);
    expect(b.minutesElsewhere).toBe(120);
    expect(b.totalMinutes).toBe(240);
    expect(b.over).toBe(true);
    expect(b.remaining).toBe(-60);
    expect(b.elsewhereByDay).toEqual([{ dayName: "Jeudi", minutes: 120 }]);
    expect(formatElsewhereByDay(b.elsewhereByDay)).toBe("120 min (2h) le Jeudi");
  });

  it("ignores sibling sessions that do not contain the item", () => {
    const [b] = calculateItemWeeklyBudgets({
      currentItems: [MENAGE],
      currentSessionMinutes: 120,
      currentOccurrences: [{ str_name: "Mercredi" }],
      siblingSessions: [
        {
          minutes: 300,
          occurrences: [{ str_name: "Jeudi" }],
          itemCodes: ["OTHER"],
        },
      ],
    });
    expect(b.minutesElsewhere).toBe(0);
    expect(b.over).toBe(false);
  });

  it("counts a multi-day sibling once per day", () => {
    const [b] = calculateItemWeeklyBudgets({
      currentItems: [MENAGE],
      currentSessionMinutes: 60,
      currentOccurrences: [{ str_name: "Mercredi" }],
      siblingSessions: [
        {
          minutes: 60,
          occurrences: [{ str_name: "Jeudi" }, { str_name: "Vendredi" }],
          itemCodes: ["AMD-M"],
        },
      ],
    });
    // here 60 + elsewhere (60 Jeudi + 60 Vendredi) = 180
    expect(b.minutesElsewhere).toBe(120);
    expect(b.totalMinutes).toBe(180);
    expect(b.over).toBe(false);
  });

  it("reports no budget when weekly_package is missing", () => {
    const [b] = calculateItemWeeklyBudgets({
      currentItems: [{ code: "X" }],
      currentSessionMinutes: 60,
      currentOccurrences: [{ str_name: "Mercredi" }],
      siblingSessions: [],
    });
    expect(b.hasBudget).toBe(false);
    expect(b.over).toBe(false);
  });
});
