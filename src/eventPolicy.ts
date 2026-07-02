/**
 * Single source of truth for event UI/validation rules — mirrors the Django
 * `Event.validate()` mandatory validators (invoices/events.py) and the
 * calendar section-visibility rules.
 *
 * The goal is to keep the rules declarative and in ONE place instead of
 * scattering `if (eventType === …)` across the dialog. The dialog + AEV panel
 * consume the returned policy: disabled sections show a reason, mandatory
 * fields get an asterisk + a pre-submit check. The server (validate=1) stays
 * authoritative; this only mirrors it for UX.
 */

// Event type enum values (mirror invoices/enums/event.py).
export const ET = {
  CARE: "CARE",
  ASS_DEP: "ASS_DEP",
  GENERIC: "GENERIC",
  GNRC_EMPL: "GNRC_EMPL",
  SUB_CARE: "SUB_CARE",
  FIRST_VISIT: "FIRST_VISIT",
  BIRTHDAY: "BIRTHDAY",
} as const;

// Event states (STATES in events.py). 3 = Fait, 5 = Non fait.
export const STATE_DONE = 3;
export const STATE_NOT_DONE = 5;

// Event types where "soins" (care codes) are relevant. AD is included on
// purpose: for an Assurance Dépendance event, care codes can also be required.
export const CARE_TYPES = new Set<string>([
  ET.CARE,
  ET.ASS_DEP,
  ET.SUB_CARE,
  ET.FIRST_VISIT,
  "OVERNIGHT",
  "MEDS",
]);

export interface EventPolicyContext {
  eventType: string;
  state: number;
  hasPatient: boolean;
  hasEmployee: boolean;
  hasSubContractor?: boolean;
  atOffice?: boolean;
  employeeEncodesClinical: boolean;
}

/** One UI section: whether it is usable, and why not when disabled. */
export interface Aspect {
  enabled: boolean;
  reason?: string;
}

export interface EventSectionPolicy {
  aevPlan: Aspect;
  careCodes: Aspect;
  prescriptions: Aspect;
  vitalParams: Aspect;
}

/** Which fields are mandatory in the current context (mirror of the backend). */
export interface EventFieldRequirements {
  employee: boolean;
  patient: boolean;
  report: boolean;
  notes: boolean;
  timeStart: boolean;
  timeEnd: boolean;
}

const REASONS = {
  adOnly: "Disponible uniquement pour les événements Assurance Dépendance.",
  careFamily: "Disponible pour les soins et l'Assurance Dépendance.",
  clinical: "Réservé au personnel clinique (soignant).",
  patient: "Sélectionnez d'abord un patient.",
};

/** Section visibility/enablement — hide nothing, disable + explain instead. */
export function getSectionPolicy(
  ctx: EventPolicyContext,
): EventSectionPolicy {
  const isAD = ctx.eventType === ET.ASS_DEP;
  const isCareFamily = CARE_TYPES.has(ctx.eventType);
  return {
    aevPlan: {
      enabled: isAD,
      reason: isAD ? undefined : REASONS.adOnly,
    },
    careCodes: {
      enabled: isCareFamily,
      reason: isCareFamily ? undefined : REASONS.careFamily,
    },
    prescriptions: {
      enabled: ctx.hasPatient,
      reason: ctx.hasPatient ? undefined : REASONS.patient,
    },
    vitalParams: {
      enabled: ctx.employeeEncodesClinical,
      reason: ctx.employeeEncodesClinical ? undefined : REASONS.clinical,
    },
  };
}

/** Conditional mandatory fields — mirror of events.py validators. */
export function getFieldRequirements(
  ctx: EventPolicyContext,
): EventFieldRequirements {
  const t = ctx.eventType;
  const notBirthday = t !== ET.BIRTHDAY;
  return {
    // employee_maybe_mandatory
    employee: [ET.GNRC_EMPL, ET.ASS_DEP, ET.CARE].includes(t as never),
    // patient_maybe_mandatory (+ patient_mandatory_if_subcontractor_set)
    patient:
      [ET.GENERIC, ET.ASS_DEP, ET.CARE].includes(t as never) ||
      !!ctx.hasSubContractor,
    // event_report_mandatory_validated_events
    report: ctx.state === STATE_DONE || ctx.state === STATE_NOT_DONE,
    // event_notes_are_mandatory
    notes: !!(ctx.hasEmployee || ctx.hasPatient || ctx.hasSubContractor),
    // event_end/start_time_is_sometimes_mandatory
    timeStart: notBirthday,
    timeEnd: notBirthday,
  };
}

export interface EventFieldValues {
  employee_id: number | "";
  patient_id: number | "";
  event_report: string;
  notes: string;
  time_start: string;
  time_end: string;
}

/** Client-side pre-submit check: which required fields are still empty. */
export function missingRequiredFields(
  req: EventFieldRequirements,
  v: EventFieldValues,
): string[] {
  const missing: string[] = [];
  if (req.employee && v.employee_id === "") missing.push("Employé");
  if (req.patient && v.patient_id === "") missing.push("Patient");
  if (req.report && !v.event_report.trim()) missing.push("Rapport de soin");
  if (req.notes && !v.notes.trim()) missing.push("Notes");
  if (req.timeStart && !v.time_start) missing.push("Heure de début");
  if (req.timeEnd && !v.time_end) missing.push("Heure de fin");
  return missing;
}
