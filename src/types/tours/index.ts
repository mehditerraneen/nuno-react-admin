export interface Event {
  id: number;
  patient_id: number;
  employee_id?: number;
  date: string;
  time_start: string;
  time_end: string;
  real_start?: string;
  real_end?: string;
  state: EventState;
  notes: string;
  event_address?: string;
  event_type: string;
  created_at?: string;
  updated_at?: string;
}

export interface Tour {
  id: number;
  name?: string;
  employee_id: number;
  employee_name?: string;
  date: string;
  time_start?: string;
  time_end?: string;
  break_duration?: number; // minutes
  events: Event[];
  total_distance: number;
  estimated_duration: number;
  optimization_status: "pending" | "optimized" | "manual";
}

export interface Employee {
  id: number;
  name: string;
  abbreviation: string;
  color: string;
  active: boolean;
  daily_events_count?: number;
  estimated_duration?: number;
}

export interface Patient {
  id: number;
  name: string;
  first_name: string;
  code_sn: string;
  address?: string;
}

export type EventState = 1 | 2 | 3 | 4 | 5 | 6;

export interface EventStateDetail {
  id: number;
  name: string;
  description?: string;
  color?: string;
  is_final?: boolean;
}

export interface EventTypeDetail {
  id: number;
  name: string;
  description?: string;
  color?: string;
  duration?: number; // estimated duration in minutes
}

// Legacy constants for backward compatibility
export const EVENT_STATES: { id: EventState; name: string }[] = [
  { id: 1, name: "Waiting" },
  { id: 2, name: "Valid" },
  { id: 3, name: "Done" },
  { id: 4, name: "Ignored" },
  { id: 5, name: "Not Done" },
  { id: 6, name: "Cancelled" },
];

export const EVENT_TYPES = [
  "wound_care",
  "vital_signs",
  "medication",
  "hygiene",
  "mobility",
  "nutrition",
  "assessment",
  "other",
];

export interface EventTimes {
  real_start?: string;
  real_end?: string;
}

export interface OptimizationRequest {
  employee_id: number;
  date: string;
}

export interface EventFilters {
  date?: string;
  employee_id?: number;
  patient_id?: number;
  state?: EventState;
  event_type?: string;
}

export interface TourRealTimeUpdate {
  type: "event_updated" | "tour_optimized" | "event_assigned";
  data: Event | Tour;
  timestamp: string;
}
