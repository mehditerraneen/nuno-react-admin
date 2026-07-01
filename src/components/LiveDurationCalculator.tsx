import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, Chip, Paper, Alert, Stack } from "@mui/material";
import { AccessTime as TimeIcon } from "@mui/icons-material";
import { useWatch } from "react-hook-form";
import { useGetList } from "react-admin";
import {
  calculateSessionDuration,
  formatDurationDisplay,
  calculateActualDaysPerWeek,
  calculateActionsDuration,
  calculateItemWeeklyBudgets,
  formatElsewhereByDay,
  type WeeklyItemBudget,
} from "../utils/timeUtils";
import { LongTermCareItem, CareOccurrence } from "../dataProvider";
import { useSiblingSessions } from "./WeeklyBudgetContext";

interface LiveDurationCalculatorProps {
  className?: string;
}

export const LiveDurationCalculator: React.FC<LiveDurationCalculatorProps> = ({
  className,
}) => {
  // Watch form values for real-time calculation
  const timeStart = useWatch({ name: "time_start" });
  const timeEnd = useWatch({ name: "time_end" });
  const occurrenceIdsRaw = useWatch({ name: "params_occurrence_ids" });
  const occurrenceIds = useMemo(
    () => occurrenceIdsRaw || [],
    [occurrenceIdsRaw],
  );
  const careItemsRaw = useWatch({ name: "long_term_care_items" });
  const careItems = useMemo(() => careItemsRaw || [], [careItemsRaw]);
  const actions = useWatch({ name: "actions" }) || [];
  const actionsDailyDuration = calculateActionsDuration(actions);

  // Other sessions of the same care plan (for the weekly-budget cumulative)
  const siblingSessions = useSiblingSessions();

  // Fetch occurrence data to get names
  const { data: occurrences } = useGetList<CareOccurrence>("careoccurrences");

  // Fetch care items data to get weekly_package values
  const { data: allCareItems } = useGetList<LongTermCareItem>(
    "longtermcareitems",
    {
      pagination: { page: 1, perPage: 500 },
      sort: { field: "code", order: "ASC" },
    },
  );

  // Calculate session duration
  const [sessionDuration, setSessionDuration] = useState(0);
  const [weeklySessionTime, setWeeklySessionTime] = useState(0);

  useEffect(() => {
    // Calculate session duration
    let duration = 0;
    if (timeStart && timeEnd) {
      // Handle both string times and Date objects from React Admin TimeInput
      let startTime = "";
      let endTime = "";

      if (timeStart instanceof Date) {
        startTime = `${timeStart.getHours().toString().padStart(2, "0")}:${timeStart.getMinutes().toString().padStart(2, "0")}`;
      } else if (typeof timeStart === "string") {
        startTime = timeStart;
      }

      if (timeEnd instanceof Date) {
        endTime = `${timeEnd.getHours().toString().padStart(2, "0")}:${timeEnd.getMinutes().toString().padStart(2, "0")}`;
      } else if (typeof timeEnd === "string") {
        endTime = timeEnd;
      }

      if (startTime && endTime) {
        duration = calculateSessionDuration(startTime, endTime);
      }
    }
    setSessionDuration(duration);

    // Calculate actual days per week (check for "tous les jours")
    const selectedOccurrences = occurrences
      ? occurrenceIds
          .map((id) => occurrences.find((o) => o.id === id))
          .filter(Boolean)
      : [];

    const actualDaysPerWeek = calculateActualDaysPerWeek(selectedOccurrences);
    setWeeklySessionTime(duration * actualDaysPerWeek);
  }, [timeStart, timeEnd, occurrenceIds, occurrences]);

  // Selected occurrence objects (used for both display and budget)
  const selectedOccurrences = useMemo(
    () =>
      occurrences
        ? (occurrenceIds
            .map((id: number) => occurrences.find((o) => o.id === id))
            .filter(Boolean) as CareOccurrence[])
        : [],
    [occurrences, occurrenceIds],
  );

  const selectedOccurrenceNames = selectedOccurrences.map(
    (occ) => occ.str_name || `ID:${occ.id}`,
  );

  // Weekly-budget status per care item in this session
  const itemBudgets: WeeklyItemBudget[] = useMemo(() => {
    if (!allCareItems || careItems.length === 0) return [];
    const currentItems = careItems
      .map((item: any) => {
        const ci = allCareItems.find(
          (c) => c.id === item.long_term_care_item_id,
        );
        return ci
          ? {
              code: ci.code,
              weekly_package: ci.weekly_package,
              description: ci.description,
            }
          : null;
      })
      .filter(Boolean) as Array<{
      code: string;
      weekly_package?: number;
      description?: string;
    }>;

    return calculateItemWeeklyBudgets({
      currentItems,
      currentSessionMinutes: sessionDuration,
      currentOccurrences: selectedOccurrences,
      siblingSessions,
    });
  }, [
    allCareItems,
    careItems,
    sessionDuration,
    selectedOccurrences,
    siblingSessions,
  ]);

  const multipleItems = itemBudgets.length > 1;

  // Show warning if no time is selected
  if (!timeStart || !timeEnd) {
    return (
      <Paper
        variant="outlined"
        sx={{ p: 2, mt: 2, backgroundColor: "warning.light" }}
        className={className}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TimeIcon color="action" />
          <Typography variant="body2" color="text.secondary">
            Select start and end times to see duration calculations
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Show error if invalid time range
  if (sessionDuration === 0) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }} className={className}>
        Invalid time range. End time must be after start time.
      </Alert>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mt: 2,
        backgroundColor: "info.light",
        border: "1px solid #2196f3",
      }}
      className={className}
    >
      <Typography
        variant="subtitle2"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <TimeIcon color="primary" />
        Live Duration Calculator
      </Typography>

      <Box
        sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}
      >
        {/* Session Duration */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Durée de la séance
          </Typography>
          <Chip
            label={formatDurationDisplay(sessionDuration)}
            color="primary"
            size="small"
          />
        </Box>

        {/* Occurrences */}
        {occurrenceIds.length > 0 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Occurrences ({occurrenceIds.length}x/semaine)
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selectedOccurrenceNames.slice(0, 3).map((name, index) => (
                <Chip
                  key={index}
                  label={name}
                  size="small"
                  variant="outlined"
                  color="secondary"
                />
              ))}
              {selectedOccurrenceNames.length > 3 && (
                <Chip
                  label={`+${selectedOccurrenceNames.length - 3} more`}
                  size="small"
                  variant="outlined"
                  color="secondary"
                />
              )}
            </Box>
          </Box>
        )}

        {/* Weekly Session Time */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Temps hebdo (séance)
          </Typography>
          <Chip
            label={formatDurationDisplay(weeklySessionTime)}
            color="success"
            size="small"
          />
        </Box>

        {/* Actions Daily Duration */}
        {actionsDailyDuration > 0 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Actions (séance)
            </Typography>
            <Chip
              label={formatDurationDisplay(actionsDailyDuration)}
              color="warning"
              variant="outlined"
              size="small"
            />
          </Box>
        )}
      </Box>

      {/* Weekly budget per care item (forfait) */}
      {itemBudgets.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600 }}
          >
            Forfaits (budget hebdomadaire)
          </Typography>

          {multipleItems && (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ fontStyle: "italic", mb: 0.5 }}
            >
              ℹ️ Séance à plusieurs prestations : le cumul est approximatif —
              chaque forfait compte la durée entière de la séance.
            </Typography>
          )}

          <Stack spacing={0.75} sx={{ mt: 0.5 }}>
            {itemBudgets.map((b) => (
              <BudgetRow key={b.code} budget={b} />
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

const BudgetRow: React.FC<{ budget: WeeklyItemBudget }> = ({ budget }) => {
  const label = budget.description
    ? `${budget.code} — ${budget.description}`
    : budget.code;

  if (!budget.hasBudget) {
    return (
      <Typography variant="caption" color="text.secondary">
        {label} : forfait hebdomadaire non défini.
      </Typography>
    );
  }

  const usage = `${formatDurationDisplay(budget.totalMinutes)} / ${formatDurationDisplay(budget.weeklyPackage)} utilisées cette semaine`;

  if (budget.over) {
    const overBy = budget.totalMinutes - budget.weeklyPackage;
    const elsewhere =
      budget.minutesElsewhere > 0
        ? ` Déjà ${formatElsewhereByDay(budget.elsewhereByDay)} ; cette séance ajoute ${formatDurationDisplay(budget.minutesHere)}.`
        : "";
    return (
      <Alert severity="warning" sx={{ py: 0, px: 1 }}>
        <Typography variant="caption" component="div">
          <strong>{label}</strong> — dépasse le forfait de{" "}
          {formatDurationDisplay(overBy)} ({usage}).{elsewhere}
        </Typography>
      </Alert>
    );
  }

  const remainingText =
    budget.remaining > 0
      ? ` — reste ${formatDurationDisplay(budget.remaining)} cette semaine`
      : " — forfait entièrement utilisé";

  return (
    <Typography variant="caption" color="success.main">
      ✓ <strong>{label}</strong> : {usage}
      {remainingText}
    </Typography>
  );
};
