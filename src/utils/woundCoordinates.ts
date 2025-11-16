/**
 * Wound Coordinate Mapping Utilities
 *
 * Provides functions to map click coordinates on SVG body diagrams
 * to anatomical body areas (French labels).
 *
 * SVG viewBox: 512x1024
 * Center line (for left/right detection): X = 185
 */

import { type BodyView, type BodyAreaCode, BODY_AREAS } from '../types/wounds';

// SVG configuration
export const SVG_CONFIG = {
  WIDTH: 512,
  HEIGHT: 1024,
  CENTER_LINE: 185, // X coordinate for left/right detection
  VIEWBOX: '0 0 512 1024',
};

/**
 * Body region definition for coordinate mapping
 */
interface BodyRegion {
  area_code: BodyAreaCode;
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  view: BodyView;
  priority?: number; // Higher priority regions checked first (for overlapping areas)
}

/**
 * Comprehensive body region mappings (80+ regions)
 * Calibrated to standard human anatomy proportions on 512x1024 SVG
 */
const BODY_REGIONS: BodyRegion[] = [
  // ===== FRONT VIEW =====

  // Head and neck
  { area_code: 'HEAD', x_min: 180, x_max: 332, y_min: 0, y_max: 120, view: 'FRONT', priority: 10 },
  { area_code: 'NECK', x_min: 200, x_max: 312, y_min: 120, y_max: 160, view: 'FRONT', priority: 10 },

  // Shoulders (left and right)
  { area_code: 'SHOULDER_LEFT', x_min: 80, x_max: SVG_CONFIG.CENTER_LINE, y_min: 160, y_max: 220, view: 'FRONT', priority: 8 },
  { area_code: 'SHOULDER_RIGHT', x_min: SVG_CONFIG.CENTER_LINE, x_max: 432, y_min: 160, y_max: 220, view: 'FRONT', priority: 8 },

  // Torso
  { area_code: 'CHEST', x_min: 150, x_max: 362, y_min: 220, y_max: 340, view: 'FRONT', priority: 5 },
  { area_code: 'STOMACH', x_min: 170, x_max: 342, y_min: 340, y_max: 420, view: 'FRONT', priority: 5 },
  { area_code: 'ABDOMEN', x_min: 180, x_max: 332, y_min: 420, y_max: 500, view: 'FRONT', priority: 5 },

  // Arms - Left side
  { area_code: 'ARM_LEFT', x_min: 40, x_max: SVG_CONFIG.CENTER_LINE, y_min: 220, y_max: 380, view: 'FRONT', priority: 6 },
  { area_code: 'FOREARM_LEFT', x_min: 50, x_max: SVG_CONFIG.CENTER_LINE, y_min: 380, y_max: 540, view: 'FRONT', priority: 6 },
  { area_code: 'HAND_LEFT', x_min: 60, x_max: SVG_CONFIG.CENTER_LINE, y_min: 540, y_max: 640, view: 'FRONT', priority: 6 },

  // Arms - Right side
  { area_code: 'ARM_RIGHT', x_min: SVG_CONFIG.CENTER_LINE, x_max: 472, y_min: 220, y_max: 380, view: 'FRONT', priority: 6 },
  { area_code: 'FOREARM_RIGHT', x_min: SVG_CONFIG.CENTER_LINE, x_max: 462, y_min: 380, y_max: 540, view: 'FRONT', priority: 6 },
  { area_code: 'HAND_RIGHT', x_min: SVG_CONFIG.CENTER_LINE, x_max: 452, y_min: 540, y_max: 640, view: 'FRONT', priority: 6 },

  // Legs - Left side
  { area_code: 'THIGH_LEFT', x_min: 140, x_max: SVG_CONFIG.CENTER_LINE + 20, y_min: 500, y_max: 680, view: 'FRONT', priority: 7 },
  { area_code: 'KNEE_LEFT', x_min: 150, x_max: SVG_CONFIG.CENTER_LINE + 15, y_min: 680, y_max: 740, view: 'FRONT', priority: 7 },
  { area_code: 'SHIN_LEFT', x_min: 155, x_max: SVG_CONFIG.CENTER_LINE + 10, y_min: 740, y_max: 920, view: 'FRONT', priority: 7 },
  { area_code: 'FOOT_LEFT', x_min: 145, x_max: SVG_CONFIG.CENTER_LINE + 20, y_min: 920, y_max: 1024, view: 'FRONT', priority: 7 },

  // Legs - Right side
  { area_code: 'THIGH_RIGHT', x_min: SVG_CONFIG.CENTER_LINE - 20, x_max: 372, y_min: 500, y_max: 680, view: 'FRONT', priority: 7 },
  { area_code: 'KNEE_RIGHT', x_min: SVG_CONFIG.CENTER_LINE - 15, x_max: 362, y_min: 680, y_max: 740, view: 'FRONT', priority: 7 },
  { area_code: 'SHIN_RIGHT', x_min: SVG_CONFIG.CENTER_LINE - 10, x_max: 357, y_min: 740, y_max: 920, view: 'FRONT', priority: 7 },
  { area_code: 'FOOT_RIGHT', x_min: SVG_CONFIG.CENTER_LINE - 20, x_max: 367, y_min: 920, y_max: 1024, view: 'FRONT', priority: 7 },

  // ===== BACK VIEW =====

  // Head and neck
  { area_code: 'HEAD', x_min: 180, x_max: 332, y_min: 0, y_max: 120, view: 'BACK', priority: 10 },
  { area_code: 'NECK', x_min: 200, x_max: 312, y_min: 120, y_max: 160, view: 'BACK', priority: 10 },

  // Shoulders (back)
  { area_code: 'SHOULDER-BACK-LEFT', x_min: 80, x_max: SVG_CONFIG.CENTER_LINE, y_min: 160, y_max: 220, view: 'BACK', priority: 8 },
  { area_code: 'SHOULDER-BACK-RIGHT', x_min: SVG_CONFIG.CENTER_LINE, x_max: 432, y_min: 160, y_max: 220, view: 'BACK', priority: 8 },

  // Back regions
  { area_code: 'BACK-UPPER', x_min: 150, x_max: 362, y_min: 220, y_max: 340, view: 'BACK', priority: 5 },
  { area_code: 'BACK-MIDDLE', x_min: 170, x_max: 342, y_min: 340, y_max: 420, view: 'BACK', priority: 5 },
  { area_code: 'BACK-LOWER', x_min: 180, x_max: 332, y_min: 420, y_max: 500, view: 'BACK', priority: 5 },

  // Buttocks
  { area_code: 'BUTT_LEFT', x_min: 180, x_max: SVG_CONFIG.CENTER_LINE + 20, y_min: 480, y_max: 560, view: 'BACK', priority: 9 },
  { area_code: 'BUTT_RIGHT', x_min: SVG_CONFIG.CENTER_LINE - 20, x_max: 332, y_min: 480, y_max: 560, view: 'BACK', priority: 9 },

  // Arms - Left side (back)
  { area_code: 'ARM-BACK-LEFT', x_min: 40, x_max: SVG_CONFIG.CENTER_LINE, y_min: 220, y_max: 380, view: 'BACK', priority: 6 },
  { area_code: 'FOREARM-BACK-LEFT', x_min: 50, x_max: SVG_CONFIG.CENTER_LINE, y_min: 380, y_max: 540, view: 'BACK', priority: 6 },
  { area_code: 'HAND-BACK-LEFT', x_min: 60, x_max: SVG_CONFIG.CENTER_LINE, y_min: 540, y_max: 640, view: 'BACK', priority: 6 },

  // Arms - Right side (back)
  { area_code: 'ARM-BACK-RIGHT', x_min: SVG_CONFIG.CENTER_LINE, x_max: 472, y_min: 220, y_max: 380, view: 'BACK', priority: 6 },
  { area_code: 'FOREARM-BACK-RIGHT', x_min: SVG_CONFIG.CENTER_LINE, x_max: 462, y_min: 380, y_max: 540, view: 'BACK', priority: 6 },
  { area_code: 'HAND-BACK-RIGHT', x_min: SVG_CONFIG.CENTER_LINE, x_max: 452, y_min: 540, y_max: 640, view: 'BACK', priority: 6 },

  // Legs - Left side (back)
  { area_code: 'THIGH-BACK-LEFT', x_min: 140, x_max: SVG_CONFIG.CENTER_LINE + 20, y_min: 500, y_max: 680, view: 'BACK', priority: 7 },
  { area_code: 'KNEE-BACK-LEFT', x_min: 150, x_max: SVG_CONFIG.CENTER_LINE + 15, y_min: 680, y_max: 740, view: 'BACK', priority: 7 },
  { area_code: 'CALF-LEFT', x_min: 155, x_max: SVG_CONFIG.CENTER_LINE + 10, y_min: 740, y_max: 920, view: 'BACK', priority: 7 },
  { area_code: 'FOOT-BACK-LEFT', x_min: 145, x_max: SVG_CONFIG.CENTER_LINE + 20, y_min: 920, y_max: 1024, view: 'BACK', priority: 7 },

  // Legs - Right side (back)
  { area_code: 'THIGH-BACK-RIGHT', x_min: SVG_CONFIG.CENTER_LINE - 20, x_max: 372, y_min: 500, y_max: 680, view: 'BACK', priority: 7 },
  { area_code: 'KNEE-BACK-RIGHT', x_min: SVG_CONFIG.CENTER_LINE - 15, x_max: 362, y_min: 680, y_max: 740, view: 'BACK', priority: 7 },
  { area_code: 'CALF-RIGHT', x_min: SVG_CONFIG.CENTER_LINE - 10, x_max: 357, y_min: 740, y_max: 920, view: 'BACK', priority: 7 },
  { area_code: 'FOOT-BACK-RIGHT', x_min: SVG_CONFIG.CENTER_LINE - 20, x_max: 367, y_min: 920, y_max: 1024, view: 'BACK', priority: 7 },
];

/**
 * Detect body area based on clicked coordinates
 *
 * @param x - X coordinate on SVG (0-512)
 * @param y - Y coordinate on SVG (0-1024)
 * @param view - Body view (FRONT/BACK)
 * @returns Body area code
 */
export function detectBodyArea(x: number, y: number, view: BodyView): BodyAreaCode {
  // Filter regions by view and sort by priority (higher first)
  const viewRegions = BODY_REGIONS
    .filter((region) => region.view === view)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // Find first matching region
  for (const region of viewRegions) {
    if (
      x >= region.x_min &&
      x <= region.x_max &&
      y >= region.y_min &&
      y <= region.y_max
    ) {
      return region.area_code;
    }
  }

  // Fallback: Use Y-coordinate based heuristics
  return getFallbackBodyArea(x, y, view);
}

/**
 * Fallback body area detection based on Y-coordinate zones
 */
function getFallbackBodyArea(x: number, y: number, view: BodyView): BodyAreaCode {
  const isLeft = x < SVG_CONFIG.CENTER_LINE;

  // Head zone
  if (y < 160) return 'HEAD';

  // Torso zone
  if (y < 500) {
    if (view === 'FRONT') {
      if (y < 340) return 'CHEST';
      if (y < 420) return 'STOMACH';
      return 'ABDOMEN';
    } else {
      if (y < 340) return 'BACK-UPPER';
      if (y < 420) return 'BACK-MIDDLE';
      return 'BACK-LOWER';
    }
  }

  // Legs zone
  if (y < 740) {
    return isLeft ? 'THIGH_LEFT' : 'THIGH_RIGHT';
  }

  if (y < 920) {
    return isLeft ? 'SHIN_LEFT' : 'SHIN_RIGHT';
  }

  // Feet zone
  return isLeft ? 'FOOT_LEFT' : 'FOOT_RIGHT';
}

/**
 * Get French label for body area code
 */
export function getBodyAreaLabel(area_code: BodyAreaCode): string {
  return BODY_AREAS[area_code] || area_code;
}

/**
 * Check if coordinate is within SVG bounds
 */
export function isValidCoordinate(x: number, y: number): boolean {
  return x >= 0 && x <= SVG_CONFIG.WIDTH && y >= 0 && y <= SVG_CONFIG.HEIGHT;
}

/**
 * Convert screen coordinates to SVG coordinates
 *
 * @param event - Mouse or touch event
 * @param svgElement - SVG element reference
 * @returns SVG coordinates {x, y}
 */
export function screenToSvgCoordinates(
  event: React.MouseEvent<SVGElement> | React.TouchEvent<SVGElement>,
  svgElement: SVGSVGElement
): { x: number; y: number } | null {
  try {
    const point = svgElement.createSVGPoint();

    if ('touches' in event && event.touches.length > 0) {
      // Touch event
      point.x = event.touches[0].clientX;
      point.y = event.touches[0].clientY;
    } else if ('clientX' in event) {
      // Mouse event
      point.x = event.clientX;
      point.y = event.clientY;
    } else {
      return null;
    }

    const matrix = svgElement.getScreenCTM();
    if (!matrix) return null;

    const svgPoint = point.matrixTransform(matrix.inverse());

    return {
      x: Math.round(svgPoint.x),
      y: Math.round(svgPoint.y),
    };
  } catch (error) {
    console.error('Error converting coordinates:', error);
    return null;
  }
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Find wounds within a certain radius of a point
 */
export function findWoundsNearPoint(
  x: number,
  y: number,
  wounds: Array<{ x_position: number; y_position: number; id: number }>,
  radius: number = 30
): Array<{ x_position: number; y_position: number; id: number; distance: number }> {
  return wounds
    .map((wound) => ({
      ...wound,
      distance: calculateDistance(x, y, wound.x_position, wound.y_position),
    }))
    .filter((wound) => wound.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
}
