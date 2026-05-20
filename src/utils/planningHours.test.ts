import { describe, it, expect } from "vitest";
import {
  classifyShift,
  computeTotalHours,
  isNonWorkCode,
  parseHours,
} from "./planningHours";

describe("isNonWorkCode", () => {
  it("returns true for OFF / DES / REPOS", () => {
    expect(isNonWorkCode("OFF")).toBe(true);
    expect(isNonWorkCode("DES")).toBe(true);
    expect(isNonWorkCode("REPOS")).toBe(true);
  });

  it("treats DES-prefixed codes (DES1, DES*) as non-work", () => {
    expect(isNonWorkCode("DES1")).toBe(true);
    expect(isNonWorkCode("DES*")).toBe(true);
    expect(isNonWorkCode("des")).toBe(true); // case-insensitive
  });

  it("returns false for work codes and leave/training", () => {
    expect(isNonWorkCode("M6.5-15")).toBe(false);
    expect(isNonWorkCode("CP8")).toBe(false);
    expect(isNonWorkCode("CONG")).toBe(false);
    expect(isNonWorkCode("FORM")).toBe(false);
    expect(isNonWorkCode("")).toBe(false);
    expect(isNonWorkCode(null)).toBe(false);
    expect(isNonWorkCode(undefined)).toBe(false);
  });
});

describe("parseHours", () => {
  it("accepts numbers", () => {
    expect(parseHours(8)).toBe(8);
    expect(parseHours(0)).toBe(0);
    expect(parseHours(6.4)).toBe(6.4);
  });
  it("accepts numeric strings", () => {
    expect(parseHours("8")).toBe(8);
    expect(parseHours("6.4")).toBe(6.4);
  });
  it("returns 0 for nullish / non-numeric", () => {
    expect(parseHours(null)).toBe(0);
    expect(parseHours(undefined)).toBe(0);
    expect(parseHours("abc")).toBe(0);
    expect(parseHours({})).toBe(0);
    expect(parseHours(NaN)).toBe(0);
  });
});

describe("classifyShift", () => {
  it("excludes DES with category OFF and 0h (seed config)", () => {
    const r = classifyShift({
      shift_code: "DES",
      shift_category: "OFF",
      hours: 0,
    });
    expect(r.included).toBe(false);
    expect(r.reason).toBe("category OFF");
  });

  it("excludes DES even when category was misresolved to OTHER and hours > 0 (PROD bug case)", () => {
    const r = classifyShift({
      shift_code: "DES",
      shift_category: "OTHER",
      hours: 8,
    });
    expect(r.included).toBe(false);
    expect(r.hours).toBe(8);
    expect(r.reason).toBe("code DES excluded");
  });

  it("excludes DES variants like DES1, DES*", () => {
    expect(
      classifyShift({ shift_code: "DES1", shift_category: "OTHER", hours: 8 })
        .included,
    ).toBe(false);
    expect(
      classifyShift({ shift_code: "DES*", shift_category: "OTHER", hours: 8 })
        .included,
    ).toBe(false);
  });

  it("counts standard work shifts (M, S, N codes with category MORNING/EVENING/NIGHT)", () => {
    expect(
      classifyShift({
        shift_code: "M6.5-15",
        shift_category: "MORNING",
        hours: 8,
      }).included,
    ).toBe(true);
    expect(
      classifyShift({
        shift_code: "S13.5-22",
        shift_category: "EVENING",
        hours: 8.5,
      }).included,
    ).toBe(true);
    expect(
      classifyShift({ shift_code: "N22-7", shift_category: "NIGHT", hours: 9 })
        .included,
    ).toBe(true);
  });

  it("counts LEAVE (CP/CONG) as paid hours", () => {
    expect(
      classifyShift({ shift_code: "CP8", shift_category: "LEAVE", hours: 8 })
        .included,
    ).toBe(true);
    expect(
      classifyShift({
        shift_code: "CP6.4",
        shift_category: "LEAVE",
        hours: 6.4,
      }).included,
    ).toBe(true);
    expect(
      classifyShift({ shift_code: "CONG", shift_category: "LEAVE", hours: 8 })
        .included,
    ).toBe(true);
  });

  it("counts TRAINING as paid hours", () => {
    expect(
      classifyShift({
        shift_code: "cours",
        shift_category: "TRAINING",
        hours: 8,
      }).included,
    ).toBe(true);
  });

  it("excludes shifts with 0 hours even if category is not OFF", () => {
    const r = classifyShift({
      shift_code: "X",
      shift_category: "OTHER",
      hours: 0,
    });
    expect(r.included).toBe(false);
    expect(r.reason).toBe("zero hours");
  });

  it("returns no-shift sentinel for null/undefined input", () => {
    expect(classifyShift(null).included).toBe(false);
    expect(classifyShift(undefined).included).toBe(false);
    expect(classifyShift(null).reason).toBe("no shift");
  });

  it("handles string-typed hours from the API", () => {
    const r = classifyShift({
      shift_code: "M",
      shift_category: "MORNING",
      hours: "8.5" as any,
    });
    expect(r.included).toBe(true);
    expect(r.hours).toBe(8.5);
  });
});

describe("computeTotalHours", () => {
  it("sums only working shifts, ignoring DES and OFF", () => {
    const { total, breakdown } = computeTotalHours({
      "1": { shift_code: "M", shift_category: "MORNING", hours: 8 },
      "2": { shift_code: "DES", shift_category: "OFF", hours: 0 },
      "3": { shift_code: "S", shift_category: "EVENING", hours: 8 },
      "4": { shift_code: "OFF", shift_category: "OFF", hours: 0 },
      "5": { shift_code: "CP8", shift_category: "LEAVE", hours: 8 },
    });
    expect(total).toBe(24); // 8 + 8 + 8 (CP counts)
    expect(breakdown.length).toBe(5);
    expect(breakdown[0]).toEqual(
      expect.objectContaining({ day: 1, included: true }),
    );
    expect(breakdown[1].included).toBe(false);
    expect(breakdown[3].included).toBe(false);
  });

  it("excludes a DES shift even if backend serialized hours > 0 (regression test)", () => {
    const { total } = computeTotalHours({
      "10": { shift_code: "M", shift_category: "MORNING", hours: 8 },
      "11": { shift_code: "DES", shift_category: "OTHER", hours: 8 }, // bug case
    });
    expect(total).toBe(8);
  });

  it("returns 0 for empty input", () => {
    expect(computeTotalHours({}).total).toBe(0);
    expect(computeTotalHours(null).total).toBe(0);
    expect(computeTotalHours(undefined).total).toBe(0);
  });

  it("sorts breakdown by day", () => {
    const { breakdown } = computeTotalHours({
      "10": { shift_code: "M", shift_category: "MORNING", hours: 8 },
      "2": { shift_code: "M", shift_category: "MORNING", hours: 8 },
      "5": { shift_code: "M", shift_category: "MORNING", hours: 8 },
    });
    expect(breakdown.map((b) => b.day)).toEqual([2, 5, 10]);
  });

  it("rounds to 2 decimals to avoid float noise", () => {
    const { total } = computeTotalHours({
      "1": { shift_code: "M", shift_category: "MORNING", hours: 0.1 },
      "2": { shift_code: "M", shift_category: "MORNING", hours: 0.2 },
    });
    expect(total).toBe(0.3);
  });
});
