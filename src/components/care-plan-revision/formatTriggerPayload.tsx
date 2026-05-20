import { Box, Typography } from "@mui/material";

const KEY_LABELS: Record<string, string> = {
  // fall
  datetime_of_fall: "Date/heure",
  place_of_fall: "Lieu",
  physician_informed: "Médecin informé",
  // prescription
  date: "Date",
  end_date: "Fin",
  prescriptor_name: "Prescripteur",
  prescriptor_id: "ID prescripteur",
  // cns_plan
  plan_number: "N° plan",
  date_of_notification: "Notification",
  date_of_decision: "Décision",
  level_of_needs: "Niveau",
  start_of_support: "Début soutien",
  end_of_support: "Fin soutien",
  // hospitalization
  start_date: "Début",
  reason_for_absence: "Motif",
  description: "Description",
  // wound
  date_created: "Créée le",
  body_view: "Vue",
  body_area: "Zone (code)",
  body_area_display: "Zone",
  status: "Statut",
};

const SKIP_KEYS = new Set(["prescriptor_id", "body_area", "body_view"]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "string" && ISO_DATE_RE.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      const hasTime = value.includes("T");
      return hasTime
        ? d.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : d.toLocaleDateString("fr-FR");
    }
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

interface FormatTriggerPayloadProps {
  payload: Record<string, unknown> | undefined | null;
}

/**
 * Renders the trigger payload as a small key/value list inside a
 * tooltip body. Each kind has its own keys (defined backend-side in
 * TRIGGER_KINDS); we just iterate, prettify dates/booleans, and skip
 * empty values.
 */
export const FormatTriggerPayload = ({ payload }: FormatTriggerPayloadProps) => {
  if (!payload || typeof payload !== "object") return null;
  const rows = Object.entries(payload)
    .filter(([k, v]) => !SKIP_KEYS.has(k) && v !== null && v !== undefined && v !== "")
    .map(([k, v]) => [KEY_LABELS[k] || k, formatValue(v)] as const)
    .filter(([, v]) => v !== "");

  if (rows.length === 0) return null;

  return (
    <Box sx={{ minWidth: 220, maxWidth: 360 }}>
      {rows.map(([label, value]) => (
        <Typography
          key={label}
          variant="caption"
          component="div"
          sx={{ display: "flex", gap: 1, lineHeight: 1.5 }}
        >
          <Box sx={{ fontWeight: 600, flexShrink: 0 }}>{label} :</Box>
          <Box sx={{ wordBreak: "break-word" }}>{value}</Box>
        </Typography>
      ))}
    </Box>
  );
};
