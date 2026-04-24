import type {
  Medication,
  PartOfDay,
  ScheduleKind,
  ScheduleRule,
} from "../../types/medicationPlans";

export type LaneKey = "active" | "prn" | "insulin" | "ending" | "archived";

const ENDING_WINDOW_DAYS = 14;

const parseDate = (s: string | null | undefined): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysBetween = (a: Date, b: Date): number => {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / 86400000);
};

export const bucketize = (med: Medication): LaneKey => {
  const today = startOfToday();
  const end = parseDate(med.date_ended);
  if (end && end < today) return "archived";

  const rules = (med.schedule_rules ?? []).filter((r) => r.is_active !== false);
  if (rules.some((r) => r.schedule_kind === "glycemia_scale")) return "insulin";
  if (rules.some((r) => r.schedule_kind === "prn")) return "prn";

  if (end && daysBetween(end, today) <= ENDING_WINDOW_DAYS) return "ending";
  return "active";
};

const PART_LABELS: Record<PartOfDay, string> = {
  morning: "Matin",
  noon: "Midi",
  evening: "Soir",
  night: "Nuit",
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const ordinal = (n: number): string => {
  if (n === 1) return "1er";
  return `${n}e`;
};

const formatDoseSuffix = (r: ScheduleRule): string => {
  if (!r.dose && r.dose !== 0) return "";
  const unit = r.dose_unit?.trim() || "";
  return unit ? ` (${r.dose} ${unit})` : ` (${r.dose})`;
};

const KIND_ORDER: ScheduleKind[] = [
  "parts",
  "times",
  "weekly",
  "monthly",
  "specific",
  "prn",
  "glycemia_scale",
];

const summarizeOne = (r: ScheduleRule): string => {
  switch (r.schedule_kind) {
    case "parts": {
      const parts = (r.parts_of_day ?? [])
        .map((p) => PART_LABELS[p as PartOfDay] ?? p)
        .join(", ");
      return `${parts || "—"}${formatDoseSuffix(r)}`;
    }
    case "times": {
      const times = (r.exact_times ?? []).join(", ");
      return `${times || "—"}${formatDoseSuffix(r)}`;
    }
    case "weekly": {
      const days = (r.weekdays ?? [])
        .map((d) => WEEKDAY_LABELS[d])
        .filter(Boolean)
        .join(", ");
      return `${days || "—"} ${r.weekly_time ?? ""}${formatDoseSuffix(r)}`.trim();
    }
    case "monthly": {
      const days = (r.days_of_month ?? []).map(ordinal).join(", ");
      return `${days || "—"} ${r.monthly_time ?? ""}${formatDoseSuffix(r)}`.trim();
    }
    case "specific": {
      const n = (r.specific_datetimes ?? []).length;
      return `${n} date${n > 1 ? "s" : ""}${formatDoseSuffix(r)}`;
    }
    case "prn": {
      const cond = r.prn_condition?.trim();
      return `Si besoin${cond ? ` — ${cond}` : ""}${formatDoseSuffix(r)}`;
    }
    case "glycemia_scale": {
      const n = (r.glycemia_dosing_schema ?? []).length;
      return `Selon glycémie (${n} palier${n > 1 ? "s" : ""})`;
    }
    default:
      return r.schedule_kind;
  }
};

const legacySummary = (med: Medication): string | null => {
  const parts: string[] = [];
  if (med.morning) parts.push(med.morning_dose ? `Matin ${med.morning_dose}` : "Matin");
  if (med.noon) parts.push(med.noon_dose ? `Midi ${med.noon_dose}` : "Midi");
  if (med.evening) parts.push(med.evening_dose ? `Soir ${med.evening_dose}` : "Soir");
  if (med.night) parts.push(med.night_dose ? `Nuit ${med.night_dose}` : "Nuit");
  return parts.length ? parts.join(", ") : null;
};

export const summarizeSchedule = (med: Medication): string => {
  const rules = (med.schedule_rules ?? [])
    .filter((r) => r.is_active !== false)
    .slice()
    .sort((a, b) => {
      const ao = a.rule_order ?? 0;
      const bo = b.rule_order ?? 0;
      if (ao !== bo) return ao - bo;
      return (
        KIND_ORDER.indexOf(a.schedule_kind) -
        KIND_ORDER.indexOf(b.schedule_kind)
      );
    });

  if (rules.length === 0) {
    return legacySummary(med) ?? "—";
  }

  const first = summarizeOne(rules[0]);
  if (rules.length === 1) return first;
  return `${first} · +${rules.length - 1}`;
};

export const isLegacyOnly = (med: Medication): boolean =>
  (med.schedule_rules ?? []).length === 0 && legacySummary(med) !== null;

export const endsSoonLabel = (med: Medication): string | null => {
  const end = parseDate(med.date_ended);
  if (!end) return null;
  const today = startOfToday();
  const d = daysBetween(end, today);
  if (d < 0) return null;
  if (d === 0) return "aujourd'hui";
  if (d === 1) return "demain";
  return `J+${d}`;
};
