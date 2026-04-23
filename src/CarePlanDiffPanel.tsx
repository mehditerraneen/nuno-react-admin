import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import EditIcon from "@mui/icons-material/Edit";
import {
  Identifier,
  useDataProvider,
  useGetList,
  useTranslate,
} from "react-admin";
import type {
  CarePlanDiff,
  CarePlanDiffChanges,
  CarePlanDetailSummary,
  MyDataProvider,
} from "./dataProvider";

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
};

const DetailSummaryCard: React.FC<{
  detail: CarePlanDetailSummary;
  tone: "added" | "removed";
}> = ({ detail, tone }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 1.5,
      mb: 1,
      borderLeft: "4px solid",
      borderLeftColor: tone === "added" ? "success.main" : "error.main",
      backgroundColor: tone === "added" ? "#e8f5e9" : "#ffebee",
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {detail.name}
      </Typography>
      {(detail.time_start || detail.time_end) && (
        <Chip
          size="small"
          variant="outlined"
          label={`${detail.time_start ?? "--"} – ${detail.time_end ?? "--"}`}
        />
      )}
      {Object.keys(detail.care_items).length > 0 && (
        <Chip
          size="small"
          variant="outlined"
          label={Object.keys(detail.care_items).join(", ")}
        />
      )}
    </Box>
  </Paper>
);

const ChangesBlock: React.FC<{ changes: CarePlanDiffChanges }> = ({
  changes,
}) => {
  const translate = useTranslate();
  const rows: React.ReactNode[] = [];

  const scalar = (
    field: keyof CarePlanDiffChanges,
    labelKey: string,
  ): void => {
    const entry = changes[field] as { before: unknown; after: unknown } | undefined;
    if (!entry) return;
    rows.push(
      <Box key={labelKey} sx={{ display: "flex", gap: 2, flexWrap: "wrap", py: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 160 }}>
          {translate(labelKey)}
        </Typography>
        <Typography variant="body2" sx={{ color: "error.main" }}>
          {translate("care_plan_diff.before")}: {String(entry.before ?? "—")}
        </Typography>
        <Typography variant="body2" sx={{ color: "success.main" }}>
          {translate("care_plan_diff.after")}: {String(entry.after ?? "—")}
        </Typography>
      </Box>,
    );
  };

  scalar("time_start", "care_plan_diff.field_time_start");
  scalar("time_end", "care_plan_diff.field_time_end");
  scalar("care_actions", "care_plan_diff.field_care_actions");

  if (changes.occurrences) {
    const { added, removed } = changes.occurrences;
    rows.push(
      <Box key="occ" sx={{ py: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {translate("care_plan_diff.field_occurrences")}
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
          {added.map((o) => (
            <Chip key={`+${o}`} icon={<AddIcon />} size="small" color="success" label={o} />
          ))}
          {removed.map((o) => (
            <Chip key={`-${o}`} icon={<RemoveIcon />} size="small" color="error" label={o} />
          ))}
        </Box>
      </Box>,
    );
  }

  if (changes.care_items) {
    const { added, removed, quantity_changed } = changes.care_items;
    rows.push(
      <Box key="items" sx={{ py: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {translate("care_plan_diff.field_care_items")}
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
          {added.map((i) => (
            <Chip
              key={`+${i.code}`}
              icon={<AddIcon />}
              size="small"
              color="success"
              label={`${i.code} ×${i.quantity}`}
            />
          ))}
          {removed.map((i) => (
            <Chip
              key={`-${i.code}`}
              icon={<RemoveIcon />}
              size="small"
              color="error"
              label={`${i.code} ×${i.quantity}`}
            />
          ))}
          {quantity_changed.map((q) => (
            <Chip
              key={`~${q.code}`}
              icon={<EditIcon />}
              size="small"
              color="warning"
              label={`${q.code}: ${q.before} → ${q.after}`}
            />
          ))}
        </Box>
      </Box>,
    );
  }

  if (changes.actions) {
    const { added, removed } = changes.actions;
    rows.push(
      <Box key="actions" sx={{ py: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {translate("care_plan_diff.field_actions")}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 0.5 }}>
          {added.map((a, i) => (
            <Chip
              key={`+a${i}`}
              icon={<AddIcon />}
              size="small"
              color="success"
              sx={{ alignSelf: "flex-start", maxWidth: "100%" }}
              label={`${a.action_text} (${a.duration_minutes} min)`}
            />
          ))}
          {removed.map((a, i) => (
            <Chip
              key={`-a${i}`}
              icon={<RemoveIcon />}
              size="small"
              color="error"
              sx={{ alignSelf: "flex-start", maxWidth: "100%" }}
              label={`${a.action_text} (${a.duration_minutes} min)`}
            />
          ))}
        </Box>
      </Box>,
    );
  }

  return <Box>{rows}</Box>;
};

interface CarePlanDiffPanelProps {
  carePlanId: Identifier;
  patientId: Identifier;
  currentPlanNumber: number;
}

export const CarePlanDiffPanel: React.FC<CarePlanDiffPanelProps> = ({
  carePlanId,
  patientId,
  currentPlanNumber,
}) => {
  const translate = useTranslate();
  const dataProvider = useDataProvider<MyDataProvider>();
  const [diff, setDiff] = useState<CarePlanDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgainst, setSelectedAgainst] = useState<number | "auto">(
    "auto",
  );

  // List sibling plans for the dropdown
  const { data: siblingPlans } = useGetList("careplans", {
    filter: { patient_id: patientId },
    pagination: { page: 1, perPage: 50 },
    sort: { field: "plan_number", order: "DESC" },
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const against = selectedAgainst === "auto" ? undefined : selectedAgainst;
    dataProvider
      .getCarePlanDiff(carePlanId, against)
      .then((result) => {
        if (!cancelled) setDiff(result);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [carePlanId, selectedAgainst, dataProvider]);

  const hasAnyChange =
    diff && (diff.added.length || diff.removed.length || diff.changed.length);

  return (
    <Accordion defaultExpanded={false} sx={{ my: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CompareArrowsIcon color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {translate("care_plan_diff.title")}
          </Typography>
          {diff?.against && (
            <Chip
              size="small"
              variant="outlined"
              color="primary"
              label={translate("care_plan_diff.auto_hint", {
                n: diff.against.plan_number,
                start: formatDate(diff.against.plan_start_date),
              })}
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>{translate("care_plan_diff.compare_with")}</InputLabel>
            <Select
              label={translate("care_plan_diff.compare_with")}
              value={selectedAgainst}
              onChange={(e) =>
                setSelectedAgainst(
                  e.target.value === "auto" ? "auto" : Number(e.target.value),
                )
              }
            >
              <MenuItem value="auto">
                {translate("care_plan_diff.title")} (auto)
              </MenuItem>
              {(siblingPlans || [])
                .filter((p) => p.id !== carePlanId && p.plan_number !== currentPlanNumber)
                .map((p) => (
                  <MenuItem key={p.id} value={Number(p.id)}>
                    Plan n°{p.plan_number} — {formatDate(p.plan_start_date)}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Box>

        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">
              {translate("care_plan_diff.loading")}
            </Typography>
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && diff && !diff.against && (
          <Alert severity="info">
            {translate("care_plan_diff.no_previous")}
          </Alert>
        )}

        {!loading && !error && diff && diff.against && !hasAnyChange && (
          <Alert severity="success">
            {translate("care_plan_diff.no_changes")}
          </Alert>
        )}

        {!loading && !error && diff && hasAnyChange && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {diff.added.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  {translate("care_plan_diff.added_header", {
                    count: diff.added.length,
                  })}
                </Typography>
                {diff.added.map((d) => (
                  <DetailSummaryCard key={`add-${d.name}`} detail={d} tone="added" />
                ))}
              </Box>
            )}

            {diff.removed.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="error.main" gutterBottom>
                  {translate("care_plan_diff.removed_header", {
                    count: diff.removed.length,
                  })}
                </Typography>
                {diff.removed.map((d) => (
                  <DetailSummaryCard key={`rm-${d.name}`} detail={d} tone="removed" />
                ))}
              </Box>
            )}

            {diff.changed.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="warning.main" gutterBottom>
                  {translate("care_plan_diff.changed_header", {
                    count: diff.changed.length,
                  })}
                </Typography>
                {diff.changed.map((c) => (
                  <Paper
                    key={`chg-${c.name}`}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      mb: 1,
                      borderLeft: "4px solid",
                      borderLeftColor: "warning.main",
                      backgroundColor: "#fff8e1",
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      {c.name}
                    </Typography>
                    <ChangesBlock changes={c.changes} />
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
