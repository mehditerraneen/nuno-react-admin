import { classifyShift, computeTotalHours, type ShiftLike } from "./planningHours";

// ---------------------------------------------------------------------------
// Live planning "efficiency score" (0-100).
//
// This is a faithful CLIENT-SIDE replica of the backend
// `calculate_efficiency_score()` (fastapi_app/routers/planning.py). It is cheap
// enough to recompute on every edit, so the header badge can update
// "au fur et a mesure" without hitting the server.
//
// Methodology (same weights as the backend):
//   start at 100, then subtract three penalties
//   1. Underutilized employees : -5 each, capped at -30
//   2. Low-coverage days       : -2 each (days with < 3 soignants), capped at -20
//   3. Workload imbalance       : -(stdDev - 20) of utilization, capped at -15
//
// Known approximations vs the backend (it has data we don't ship to the client):
//   - the backend skips inactive / non-healthcare employees via DB flags; here
//     we only skip rows flagged `is_inactive` and rows with no shifts at all.
//   - "coverage" here counts staff actually WORKING that day (a more meaningful
//     reading) rather than every assignment incl. OFF.
// The dialog surfaces this so the number is never presented as authoritative.
// ---------------------------------------------------------------------------

const MIN_DAILY_COVERAGE = 3; // backend threshold: a day with < 3 staff is "low coverage"

export interface ScoreEmployee {
  employee_id: number;
  name?: string;
  abbreviation?: string;
  shifts?: Record<string, ShiftLike> | null;
  max_monthly_hours?: number | string | null;
  consecutive_days_violation?: boolean;
  is_inactive?: boolean;
}

export interface UnderutilizedDetail {
  employee_id: number;
  abbreviation: string;
  name: string;
  utilization: number;
  available_hours: number;
  reason: string;
}

export interface LowCoverageDetail {
  day: number;
  staff: number;
}

export interface EfficiencyBreakdown {
  score: number; // 0-100, rounded to 1 decimal
  base: number; // always 100
  evaluatedEmployees: number;
  underutilization: {
    count: number;
    penalty: number;
    cap: number;
    employees: UnderutilizedDetail[];
  };
  lowCoverage: {
    count: number;
    penalty: number;
    cap: number;
    days: LowCoverageDetail[];
  };
  imbalance: {
    avg: number;
    stdDev: number;
    penalty: number;
    cap: number;
  };
}

function resolveMaxMonthly(emp: ScoreEmployee): number {
  const raw =
    typeof emp.max_monthly_hours === "number"
      ? emp.max_monthly_hours
      : parseFloat(String(emp.max_monthly_hours ?? ""));
  return Number.isFinite(raw) && raw > 0 ? raw : 168;
}

function hasAnyShift(emp: ScoreEmployee): boolean {
  return !!emp.shifts && Object.keys(emp.shifts).length > 0;
}

export function computeEfficiencyScore(
  employees: ScoreEmployee[] | null | undefined,
  daysInMonth: number,
): EfficiencyBreakdown {
  const base = 100;
  const evaluated = (employees || []).filter(
    (e) => !e.is_inactive && hasAnyShift(e),
  );

  // --- 1. Underutilized employees -----------------------------------------
  const underutilized: UnderutilizedDetail[] = [];
  const utilizationValues: number[] = [];
  for (const emp of evaluated) {
    const maxMonthly = resolveMaxMonthly(emp);
    const currentHours = computeTotalHours(emp.shifts).total;
    const utilization = maxMonthly > 0 ? (currentHours / maxMonthly) * 100 : 0;
    const availableHours = maxMonthly - currentHours;

    if (utilization > 0) utilizationValues.push(utilization);

    const lowUtil = utilization < 90 && availableHours >= 8;
    const consecutive = !!emp.consecutive_days_violation;
    if (lowUtil || consecutive) {
      const reasons: string[] = [];
      if (lowUtil)
        reasons.push(
          `Utilisation ${utilization.toFixed(0)} % — ${availableHours.toFixed(1)} h disponibles`,
        );
      if (consecutive) reasons.push("Jours consécutifs — repos nécessaire");
      underutilized.push({
        employee_id: emp.employee_id,
        abbreviation: emp.abbreviation || "?",
        name: emp.name || "",
        utilization,
        available_hours: availableHours,
        reason: reasons.join(" · "),
      });
    }
  }
  underutilized.sort((a, b) => b.available_hours - a.available_hours);
  const underutilCap = 30;
  const underutilPenalty = Math.min(underutilCap, underutilized.length * 5);

  // --- 2. Low-coverage days -----------------------------------------------
  const lowCoverageDays: LowCoverageDetail[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    let staff = 0;
    for (const emp of evaluated) {
      const shift = emp.shifts?.[String(day)];
      if (shift && classifyShift(shift).included) staff++;
    }
    if (staff < MIN_DAILY_COVERAGE) lowCoverageDays.push({ day, staff });
  }
  const lowCoverageCap = 20;
  const lowCoveragePenalty = Math.min(lowCoverageCap, lowCoverageDays.length * 2);

  // --- 3. Workload imbalance ----------------------------------------------
  const imbalanceCap = 15;
  let avg = 0;
  let stdDev = 0;
  let imbalancePenalty = 0;
  if (utilizationValues.length > 0) {
    avg =
      utilizationValues.reduce((s, x) => s + x, 0) / utilizationValues.length;
    const variance =
      utilizationValues.reduce((s, x) => s + (x - avg) ** 2, 0) /
      utilizationValues.length;
    stdDev = Math.sqrt(variance);
    if (stdDev > 20) imbalancePenalty = Math.min(imbalanceCap, stdDev - 20);
  }

  const rawScore =
    base - underutilPenalty - lowCoveragePenalty - imbalancePenalty;
  const score = Math.max(0, Math.min(100, rawScore));

  return {
    score: Math.round(score * 10) / 10,
    base,
    evaluatedEmployees: evaluated.length,
    underutilization: {
      count: underutilized.length,
      penalty: underutilPenalty,
      cap: underutilCap,
      employees: underutilized,
    },
    lowCoverage: {
      count: lowCoverageDays.length,
      penalty: lowCoveragePenalty,
      cap: lowCoverageCap,
      days: lowCoverageDays,
    },
    imbalance: {
      avg,
      stdDev,
      penalty: imbalancePenalty,
      cap: imbalanceCap,
    },
  };
}

export function scoreColor(
  score: number,
): "success" | "warning" | "error" {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "error";
}
