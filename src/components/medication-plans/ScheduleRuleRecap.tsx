import React from "react";
import { Box, Chip, Typography } from "@mui/material";
import { useTranslate } from "react-admin";
import type { ScheduleRule, ScheduleKind } from "../../types/medicationPlans";

const KIND_ICON: Record<ScheduleKind, string> = {
  parts: "🌅",
  times: "🕐",
  weekly: "📅",
  monthly: "📆",
  specific: "📌",
  prn: "💊",
  glycemia_scale: "🩸",
};

/**
 * Render a single schedule rule in the same visual style as the
 * Schedule Rules dialog:
 *   <icon> <valid_from> — <valid_until | Ongoing>        [Inactive]
 *   <dose> <unit> · <kind-specific summary>
 *   [optional notes]
 */
export const ScheduleRuleRecap: React.FC<{ rule: ScheduleRule }> = ({
  rule,
}) => {
  const translate = useTranslate();
  const kind = rule.schedule_kind;
  const icon = KIND_ICON[kind] ?? "•";
  const tAt = translate("med_schedule_rules.summary.at");
  const tDay = translate("med_schedule_rules.summary.day");

  const validFrom = rule.valid_from
    ? new Date(rule.valid_from).toLocaleDateString()
    : null;
  const validUntil = rule.valid_until
    ? new Date(rule.valid_until).toLocaleDateString()
    : null;

  const validityLine = [
    validFrom ?? "—",
    validUntil ?? translate("med_schedule_rules.ongoing"),
  ].join(" — ");

  const doseStr =
    kind === "glycemia_scale"
      ? ""
      : `${rule.dose} ${rule.dose_unit ?? ""}`.trim();

  let detail = "";
  switch (kind) {
    case "parts": {
      const parts = (rule.parts_of_day ?? [])
        .map((p) => translate(`med_schedule_rules.part.${p}`))
        .join(", ");
      detail = parts;
      break;
    }
    case "times":
      detail = `${tAt} ${(rule.exact_times ?? []).join(", ")}`;
      break;
    case "weekly": {
      const days =
        rule.weekdays
          ?.map((d) => {
            const keys = [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ];
            return translate(`med_schedule_rules.weekday.${keys[d]}`).slice(0, 3);
          })
          .join(", ") || "";
      detail = `${days} ${tAt} ${rule.weekly_time ?? ""}`.trim();
      break;
    }
    case "monthly":
      detail = `${tDay} ${(rule.days_of_month ?? []).join(", ")} ${tAt} ${rule.monthly_time ?? ""}`.trim();
      break;
    case "specific": {
      const n = (rule.specific_datetimes ?? []).length;
      detail = translate("med_schedule_rules.summary.n_specific", { count: n });
      break;
    }
    case "prn":
      detail = `${translate("med_schedule_rules.summary.prn")}${rule.prn_condition ? ` — ${rule.prn_condition}` : ""}`;
      break;
    case "glycemia_scale": {
      const n = (rule.glycemia_dosing_schema ?? []).length;
      detail = `${n} palier${n > 1 ? "s" : ""}`;
      break;
    }
  }

  const summary = [doseStr, detail].filter(Boolean).join(" · ");

  return (
    <Box
      sx={{
        py: 0.75,
        px: 1,
        mb: 0.75,
        borderRadius: 1,
        backgroundColor: "#fafafa",
        borderLeft: "3px solid #1976d2",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, flexGrow: 1 }}
        >
          <span style={{ marginRight: 6 }}>{icon}</span>
          {validityLine}
        </Typography>
        {rule.is_active === false && (
          <Chip
            size="small"
            label={translate("med_schedule_rules.inactive")}
            sx={{ fontSize: "0.7rem", height: 20 }}
          />
        )}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {summary || "—"}
      </Typography>
      {rule.notes && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.25, whiteSpace: "pre-wrap" }}
        >
          📝 {rule.notes}
        </Typography>
      )}
    </Box>
  );
};

export default ScheduleRuleRecap;
