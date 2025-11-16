/**
 * Wound Management Type Definitions
 * Based on inur.django medical.models.Wound, WoundEvolution, and WoundImage
 */

import { RaRecord } from 'react-admin';

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type BodyView = 'FRONT' | 'BACK' | 'SIDE';
export type WoundStatus = 'ACTIVE' | 'HEALED' | 'INFECTED' | 'ARCHIVED';
export type EvolutionType = 'ASSESSMENT' | 'TREATMENT' | 'PROGRESS' | 'COMPLICATION' | 'HEALING';
export type SeverityLevel = 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
export type TrendIndicator = 'improving' | 'stable' | 'worsening' | 'unknown';
export type ImageType = 'INDIVIDUAL' | 'PATIENT_DIAGRAM';

// Body area constants matching Django model
export const BODY_AREAS = {
  // Front view
  HEAD: 'Tête',
  NECK: 'Cou',
  SHOULDER_LEFT: 'Épaule G',
  SHOULDER_RIGHT: 'Épaule D',
  CHEST: 'Poitrine',
  STOMACH: 'Estomac',
  ABDOMEN: 'Abdomen',
  ARM_LEFT: 'Bras G',
  ARM_RIGHT: 'Bras D',
  FOREARM_LEFT: 'Avant-bras G',
  FOREARM_RIGHT: 'Avant-bras D',
  HAND_LEFT: 'Main G',
  HAND_RIGHT: 'Main D',
  THIGH_LEFT: 'Cuisse G',
  THIGH_RIGHT: 'Cuisse D',
  KNEE_LEFT: 'Genou G',
  KNEE_RIGHT: 'Genou D',
  SHIN_LEFT: 'Tibia G',
  SHIN_RIGHT: 'Tibia D',
  FOOT_LEFT: 'Pied G',
  FOOT_RIGHT: 'Pied D',

  // Back view
  'SHOULDER-BACK-LEFT': 'Épaule G (Dos)',
  'SHOULDER-BACK-RIGHT': 'Épaule D (Dos)',
  'BACK-UPPER': 'Dos supérieur',
  'BACK-MIDDLE': 'Dos moyen',
  'BACK-LOWER': 'Dos inférieur',
  BUTT_LEFT: 'Fesse G',
  BUTT_RIGHT: 'Fesse D',
  'ARM-BACK-LEFT': 'Bras G (Dos)',
  'ARM-BACK-RIGHT': 'Bras D (Dos)',
  'FOREARM-BACK-LEFT': 'Avant-bras G (Dos)',
  'FOREARM-BACK-RIGHT': 'Avant-bras D (Dos)',
  'HAND-BACK-LEFT': 'Main G (Dos)',
  'HAND-BACK-RIGHT': 'Main D (Dos)',
  'THIGH-BACK-LEFT': 'Cuisse G (Dos)',
  'THIGH-BACK-RIGHT': 'Cuisse D (Dos)',
  'KNEE-BACK-LEFT': 'Genou G (Dos)',
  'KNEE-BACK-RIGHT': 'Genou D (Dos)',
  'CALF-LEFT': 'Mollet G',
  'CALF-RIGHT': 'Mollet D',
  'FOOT-BACK-LEFT': 'Pied G (Dos)',
  'FOOT-BACK-RIGHT': 'Pied D (Dos)',
} as const;

export type BodyAreaCode = keyof typeof BODY_AREAS;

export const EVOLUTION_TYPE_LABELS: Record<EvolutionType, string> = {
  ASSESSMENT: 'Évaluation',
  TREATMENT: 'Traitement',
  PROGRESS: 'Évolution',
  COMPLICATION: 'Complication',
  HEALING: 'Guérison',
};

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  MILD: 'Légère',
  MODERATE: 'Modérée',
  SEVERE: 'Sévère',
  CRITICAL: 'Critique',
};

export const STATUS_LABELS: Record<WoundStatus, string> = {
  ACTIVE: 'Actif',
  HEALED: 'Guéri',
  INFECTED: 'Infecté',
  ARCHIVED: 'Archivé',
};

// ============================================================================
// MAIN INTERFACES
// ============================================================================

/**
 * Wound model - represents a wound with precise location on body map
 */
export interface Wound extends RaRecord {
  id: number;
  patient: number; // Patient ID
  patient_name?: string; // Populated from backend
  description: string;
  status: WoundStatus;
  body_view: BodyView;
  body_area: string;
  x_position: number; // X coordinate on SVG (0-512)
  y_position: number; // Y coordinate on SVG (0-1024)
  date_created: string; // ISO date string
  evolution_count?: number; // Populated from backend
  latest_evolution?: WoundEvolution; // Populated from backend
}

/**
 * Wound evolution - tracks progress over time
 */
export interface WoundEvolution extends RaRecord {
  id: number;
  wound: number; // Wound ID
  evolution_type: EvolutionType;
  date_recorded: string; // ISO datetime string
  observations: string;
  severity?: SeverityLevel;
  size_length_mm?: number;
  size_width_mm?: number;
  size_depth_mm?: number;
  treatment_applied?: string;
  next_assessment_date?: string; // ISO datetime string
  recorded_by: string;

  // Calculated fields (from backend)
  previous_evolution?: WoundEvolution;
  size_changes?: SizeChanges;
  trend_indicator?: TrendIndicator;
  trend_icon?: string;
  trend_class?: string;
  images?: WoundImage[];
}

/**
 * Size change calculations for wound evolution
 */
export interface SizeChanges {
  length_delta?: number;
  length_percent?: number;
  width_delta?: number;
  width_percent?: number;
  depth_delta?: number;
  depth_percent?: number;
  average_delta?: number;
  overall_trend?: TrendIndicator;
}

/**
 * Wound image - stores photos or patient diagrams
 */
export interface WoundImage extends RaRecord {
  id: number;
  patient?: number; // For PATIENT_DIAGRAM type
  wound?: number; // For INDIVIDUAL type
  evolution?: number; // Optional link to evolution
  image_type: ImageType;
  wounds_count?: number; // For PATIENT_DIAGRAM
  image: string; // URL or file path
  comment?: string;
  last_updated_by_ios: boolean;
  date_uploaded: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

// ============================================================================
// CREATE/UPDATE PAYLOADS
// ============================================================================

export interface WoundCreatePayload {
  patient: number;
  description: string;
  status?: WoundStatus;
  body_view: BodyView;
  body_area: string;
  x_position: number;
  y_position: number;
}

export interface WoundUpdatePayload {
  description?: string;
  status?: WoundStatus;
  body_view?: BodyView;
  body_area?: string;
  x_position?: number;
  y_position?: number;
}

export interface WoundEvolutionCreatePayload {
  evolution_type: EvolutionType;
  observations: string;
  severity?: SeverityLevel;
  size_length_mm?: number;
  size_width_mm?: number;
  size_depth_mm?: number;
  treatment_applied?: string;
  next_assessment_date?: string;
  recorded_by: string;
}

export interface WoundEvolutionUpdatePayload {
  evolution_type?: EvolutionType;
  observations?: string;
  severity?: SeverityLevel;
  size_length_mm?: number;
  size_width_mm?: number;
  size_depth_mm?: number;
  treatment_applied?: string;
  next_assessment_date?: string;
  recorded_by?: string;
}

export interface WoundImageUploadPayload {
  image: File;
  evolution_id?: number;
  comment?: string;
}

// ============================================================================
// UI-SPECIFIC TYPES
// ============================================================================

/**
 * Interactive body map configuration
 */
export interface BodyMapConfig {
  width: number; // SVG viewBox width
  height: number; // SVG viewBox height
  centerLine: number; // X coordinate for left/right detection
  gender: 'male' | 'female';
  view: BodyView;
}

/**
 * Wound marker for display on body map
 */
export interface WoundMarker {
  id: number;
  x: number;
  y: number;
  label: string; // Display number (e.g., "1", "2", "3")
  status: WoundStatus;
  body_area: string;
  onClick?: () => void;
}

/**
 * Anatomical label for click-based wound creation
 */
export interface AnatomicalLabel {
  id: string;
  area_code: string;
  label: string;
  x: number; // Position on SVG
  y: number;
  view: BodyView;
}

/**
 * Navigation mode for body map
 */
export type NavigationMode = 'click' | 'drag';

/**
 * Zoom configuration
 */
export interface ZoomConfig {
  min: number;
  max: number;
  step: number;
  initial: number;
}

/**
 * Wound statistics for analytics
 */
export interface WoundStatistics {
  total_wounds: number;
  active_wounds: number;
  healed_wounds: number;
  infected_wounds: number;
  archived_wounds: number;
  by_body_area: Record<string, number>;
  average_healing_time_days?: number;
}

/**
 * Wound filter options
 */
export interface WoundFilters {
  patient_id?: number;
  status?: WoundStatus;
  body_view?: BodyView;
  body_area?: string;
  date_from?: string;
  date_to?: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Coordinate point on body map
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Bounding box for viewport/minimap
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Keyboard shortcut mapping
 */
export interface KeyboardShortcuts {
  zoomIn: string;
  zoomOut: string;
  resetZoom: string;
  toggleDrag: string;
  toggleClick: string;
  toggleMinimap: string;
  toggleLabels: string;
}

export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcuts = {
  zoomIn: '+',
  zoomOut: '-',
  resetZoom: '0',
  toggleDrag: 'd',
  toggleClick: 'c',
  toggleMinimap: 'm',
  toggleLabels: 'l',
};
