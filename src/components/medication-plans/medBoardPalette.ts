/**
 * Deterministic color palette to visually group cards by prescription.
 * Same prescription_id → same color across all lanes.
 */

// 10 distinct, Material-flavored hues that work on light backgrounds
const PALETTE = [
  "#1565c0", // blue
  "#2e7d32", // green
  "#ef6c00", // orange
  "#6a1b9a", // purple
  "#00838f", // teal
  "#c62828", // red
  "#558b2f", // olive
  "#00695c", // dark teal
  "#4527a0", // indigo
  "#ad1457", // pink
];

export interface PrescriptionStyle {
  main: string;
  soft: string; // same hue at ~14% alpha, good for backgrounds
  text: string; // same as main but guaranteed legible on white
}

const NEUTRAL: PrescriptionStyle = {
  main: "#9e9e9e",
  soft: "#eeeeee",
  text: "#616161",
};

const hexToRgba = (hex: string, alpha: number): string => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const prescriptionStyle = (
  prescriptionId?: number | null,
): PrescriptionStyle => {
  if (prescriptionId == null) return NEUTRAL;
  const main = PALETTE[prescriptionId % PALETTE.length];
  return {
    main,
    soft: hexToRgba(main, 0.12),
    text: main,
  };
};
