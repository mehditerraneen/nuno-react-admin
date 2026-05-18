export interface ShiftLike {
  shift_code?: string | null;
  shift_category?: string | null;
  hours?: number | string | null;
}

export interface ShiftBreakdownEntry {
  day: number;
  shift_code: string;
  shift_category: string;
  hours: number;
  included: boolean;
  reason: string;
}

export const NON_WORK_SHIFT_CODES: ReadonlyArray<string> = [
  "OFF",
  "DES",
  "REPOS",
];

export function isNonWorkCode(code: string | null | undefined): boolean {
  if (!code) return false;
  const upper = code.toUpperCase();
  if (NON_WORK_SHIFT_CODES.includes(upper)) return true;
  if (upper.startsWith("DES")) return true;
  return false;
}

export function parseHours(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function classifyShift(shift: ShiftLike | null | undefined): {
  hours: number;
  included: boolean;
  reason: string;
} {
  if (!shift) {
    return { hours: 0, included: false, reason: "no shift" };
  }
  const hours = parseHours(shift.hours);
  if (shift.shift_category === "OFF") {
    return { hours, included: false, reason: "category OFF" };
  }
  if (isNonWorkCode(shift.shift_code)) {
    return {
      hours,
      included: false,
      reason: `code ${shift.shift_code} excluded`,
    };
  }
  if (hours <= 0) {
    return { hours, included: false, reason: "zero hours" };
  }
  return { hours, included: true, reason: "counted" };
}

export function computeTotalHours(
  shifts: Record<string, ShiftLike> | null | undefined,
): { total: number; breakdown: ShiftBreakdownEntry[] } {
  const breakdown: ShiftBreakdownEntry[] = [];
  let total = 0;
  if (!shifts) return { total, breakdown };
  Object.entries(shifts).forEach(([dayStr, shift]) => {
    const day = parseInt(dayStr, 10);
    const { hours, included, reason } = classifyShift(shift);
    if (included) total += hours;
    breakdown.push({
      day: Number.isFinite(day) ? day : 0,
      shift_code: shift?.shift_code ?? "",
      shift_category: shift?.shift_category ?? "",
      hours,
      included,
      reason,
    });
  });
  breakdown.sort((a, b) => a.day - b.day);
  return { total: Math.round(total * 100) / 100, breakdown };
}
