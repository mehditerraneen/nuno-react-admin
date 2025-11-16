// Medication Plan Types

/**
 * Schedule kinds enum matching Django model choices
 */
export type ScheduleKind = "parts" | "times" | "weekly" | "monthly" | "specific" | "prn";

/**
 * Part of day choices
 */
export type PartOfDay = "morning" | "noon" | "evening" | "night";

/**
 * Medication Schedule Rule - Complex scheduling system supporting multiple patterns:
 * - parts: Fixed parts of day (morning/noon/evening/night)
 * - times: Exact clock times (e.g., 07:30, 18:00)
 * - weekly: Weekly patterns (e.g., Mon/Wed/Fri at 09:00)
 * - monthly: Monthly patterns (e.g., 1st & 16th of month at 08:00)
 * - specific: Specific dates (e.g., 2025-10-22T20:00:00)
 * - prn: As needed (PRN)
 */
export interface ScheduleRule {
  // Core fields
  id?: number;
  medication_id?: number;
  rule_order?: number;
  is_active?: boolean;
  schedule_kind: ScheduleKind;

  // Dose information
  dose: number;
  dose_unit?: string; // e.g., "comprimé(s)", "ml", "goutte(s)"

  // Date range validity
  valid_from?: string | null;
  valid_until?: string | null;

  // PARTS_OF_DAY specific fields
  parts_of_day?: PartOfDay[] | null; // e.g., ["morning", "noon"]

  // EXACT_TIMES specific fields
  exact_times?: string[] | null; // e.g., ["07:30", "13:00", "18:00"]

  // WEEKLY specific fields
  weekdays?: number[] | null; // 0=Monday, 6=Sunday, e.g., [0, 2, 4]
  weekly_time?: string | null; // HH:MM format

  // MONTHLY specific fields
  days_of_month?: number[] | null; // 1-31, e.g., [1, 16]
  monthly_time?: string | null; // HH:MM format

  // SPECIFIC_DATES specific fields
  specific_datetimes?: string[] | null; // ISO format, e.g., ["2025-10-22T20:00:00"]

  // PRN specific fields
  prn_max_doses_per_day?: number | null;
  prn_min_interval_hours?: number | null;
  prn_condition?: string | null; // e.g., "en cas de douleur"

  // Additional notes
  notes?: string | null;

  // Technical fields
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
}

export interface Medication {
  id: number;
  medicine_id: number;
  medicine_name: string;
  medicine_abbreviated_name: string;
  dosage: string;
  date_started: string;
  date_ended: string | null;
  remarks: string | null;
  morning: boolean;
  morning_dose: string | null;
  noon: boolean;
  noon_dose: string | null;
  evening: boolean;
  evening_dose: string | null;
  night: boolean;
  night_dose: string | null;
  schedule_rules?: ScheduleRule[];
  // Optional link to prescription (legal authorization)
  prescription_id?: number | null;
  medication_plan_id?: number;
  patient_id?: number;
  patient_name?: string;
}

export interface MedicationPlan {
  id: number;
  patient_id: number;
  patient_name: string;
  description: string;
  plan_start_date: string;
  plan_end_date: string | null;
  status: "in_progress" | "archived";
  medication_count?: number;
  last_updated?: string;
  created_at?: string;
  updated_at?: string;
  medications?: Medication[];
}

export interface MedicationPlanListItem {
  id: number;
  patient_id: number;
  patient_name: string;
  description: string;
  plan_start_date: string;
  plan_end_date: string | null;
  status: "in_progress" | "archived";
  medication_count: number;
  last_updated: string;
}

export interface MedicationPlanCreate {
  patient_id: number;
  description: string;
  plan_start_date: string;
  plan_end_date: string | null;
  status: "in_progress" | "archived";
}

export interface MedicationCreate {
  medicine_id: number;
  dosage: string;
  date_started: string;
  date_ended: string | null;
  remarks: string | null;
  morning: boolean;
  morning_dose: string | null;
  noon: boolean;
  noon_dose: string | null;
  evening: boolean;
  evening_dose: string | null;
  night: boolean;
  night_dose: string | null;
  schedule_rules?: Omit<ScheduleRule, "id">[];
}

export interface Medicine {
  id: number;
  name: string;
  abbreviated_name: string;
  active_substance: string;
  dosage_form: string;
  strength: string;
}

export interface MedicationDistribution {
  id: number;
  medication_id: number;
  medication_name: string;
  event_id: number;
  event_date: string;
  event_time_start: string;
  administration_time: "morning" | "noon" | "evening" | "night";
  dose: string;
  administered: boolean;
  administered_at: string | null;
  administered_by: string | null;
  notes: string | null;
}
