import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Fade,
  Zoom,
} from "@mui/material";
import "./SmartTimeInput.css";
import {
  AutoFixHigh as AutoIcon,
  Schedule as ClockIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { useFormContext, useWatch } from "react-hook-form";
import { useGetList } from "react-admin";
import { EnhancedTimeInput } from "./ReactAdminTimeInput";
import {
  calculateSessionDuration,
  calculateActionsDuration,
  calculateItemWeeklyBudgets,
  weekMultiplier,
  formatElsewhereByDay,
  formatDurationDisplay,
  parseTimeString,
  createTimeString,
} from "../utils/timeUtils";
import { LongTermCareItem, CareOccurrence } from "../dataProvider";
import { useSiblingSessions } from "./WeeklyBudgetContext";

interface SmartTimeInputProps {
  source: string;
  label: string;
  required?: boolean;
  helperText?: string;
  error?: boolean;
  disabled?: boolean;
  autoSuggest?: boolean; // Enable auto-suggestion for end time
  dependsOnCareItems?: boolean; // Whether this field should respond to care items
  sx?: any;
}

export const SmartTimeInput: React.FC<SmartTimeInputProps> = ({
  source,
  label,
  required = false,
  helperText,
  error,
  disabled = false,
  autoSuggest = false,
  dependsOnCareItems = false,
  sx,
}) => {
  const { setValue, watch } = useFormContext();
  const { data: allCareItems } = useGetList<LongTermCareItem>(
    "longtermcareitems",
    {
      pagination: { page: 1, perPage: 500 },
      sort: { field: "code", order: "ASC" },
    },
  );

  // Watch form values
  const timeStart = useWatch({ name: "time_start" });
  const timeEnd = useWatch({ name: "time_end" });
  const careItems = useWatch({ name: "long_term_care_items" }) || [];
  const actions = useWatch({ name: "actions" }) || [];
  const occurrenceIds = useWatch({ name: "params_occurrence_ids" }) || [];

  // Occurrence records + sibling sessions feed the weekly-budget check
  const { data: occurrenceList } =
    useGetList<CareOccurrence>("careoccurrences");
  const siblingSessions = useSiblingSessions();

  const [suggestedTime, setSuggestedTime] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [isAutoUpdated, setIsAutoUpdated] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [matchStatus, setMatchStatus] = useState<any>(null);

  // Create a stable key for care items to detect changes
  const careItemsKey = JSON.stringify(
    careItems?.map((item: any) => ({
      id: item.long_term_care_item_id,
      quantity: item.quantity,
    })) || [],
  );
  const actionsKey = JSON.stringify(
    (actions || []).map((a: any) => Number(a?.duration_minutes) || 0),
  );
  const occurrenceKey = JSON.stringify(occurrenceIds || []);
  const actionsDurationTotal = (actions || []).reduce(
    (sum: number, a: any) => sum + (Number(a?.duration_minutes) || 0),
    0,
  );

  console.log("🔍 SmartTimeInput render:", {
    source,
    autoSuggest,
    timeStart,
    timeEnd,
    careItemsCount: careItems?.length || 0,
    careItemsKey,
  });

  useEffect(() => {
    console.log("🔄 SmartTimeInput useEffect triggered for:", source);

    if (autoSuggest && source === "time_end") {
      // Reset state first
      setIsCalculating(true);
      setSuggestedTime(null);
      setShowSuggestion(false);
      setMatchStatus(null);

      if (
        timeStart &&
        (careItems.length > 0 || actionsDurationTotal > 0) &&
        allCareItems
      ) {
        console.log("🔄 Processing suggestion calculation...", {
          timeStart,
          careItemsCount: careItems.length,
        });

        // Resolve current care items (code + weekly budget) and occurrences
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

        const currentOccurrences = (occurrenceIds as number[])
          .map((id) => occurrenceList?.find((o) => o.id === id))
          .filter(Boolean) as CareOccurrence[];
        const currentDays = Math.max(1, weekMultiplier(currentOccurrences));

        // Convert start/end to "HH:MM" strings (end may be empty)
        let startTimeStr = "";
        if (timeStart instanceof Date) {
          startTimeStr = `${timeStart.getHours().toString().padStart(2, "0")}:${timeStart.getMinutes().toString().padStart(2, "0")}`;
        } else if (typeof timeStart === "string") {
          startTimeStr = timeStart;
        }
        let endTimeStr = "";
        if (timeEnd instanceof Date) {
          endTimeStr = `${timeEnd.getHours().toString().padStart(2, "0")}:${timeEnd.getMinutes().toString().padStart(2, "0")}`;
        } else if (typeof timeEnd === "string") {
          endTimeStr = timeEnd;
        }

        const actualDuration =
          startTimeStr && endTimeStr
            ? calculateSessionDuration(startTimeStr, endTimeStr)
            : 0;

        const budgets = calculateItemWeeklyBudgets({
          currentItems,
          currentSessionMinutes: actualDuration,
          currentOccurrences,
          siblingSessions,
        });
        const budgetedItems = budgets.filter((b) => b.hasBudget);
        const actionsDuration = calculateActionsDuration(actions);

        // The whole session counts against EACH forfait, so the binding limit
        // is the smallest remaining weekly budget, spread over the days this
        // session runs. Free-text actions add on top of the forfait time.
        const minRemaining = budgetedItems.length
          ? Math.max(
              0,
              Math.min(
                ...budgetedItems.map(
                  (b) => b.weeklyPackage - b.minutesElsewhere,
                ),
              ),
            )
          : 0;
        const suggestedLength =
          Math.floor(minRemaining / currentDays) + actionsDuration;

        const hasValidCareItems = budgetedItems.length > 0;
        const hasValidActions = actionsDuration > 0;

        if (startTimeStr && (hasValidCareItems || hasValidActions)) {
          // Build the suggested end time from the recommended session length
          let suggested: string | null = null;
          const startParsed = parseTimeString(startTimeStr);
          if (startParsed && suggestedLength > 0) {
            const endMinutes =
              startParsed.hours * 60 + startParsed.minutes + suggestedLength;
            if (endMinutes < 24 * 60) {
              suggested = createTimeString(
                Math.floor(endMinutes / 60),
                endMinutes % 60,
              );
            }
          }

          setSuggestedTime(suggested);
          setShowSuggestion(!!suggested);
          setIsCalculating(false);

          // Weekly-budget check against the current end time
          if (endTimeStr) {
            const overItem = budgets.find((b) => b.over) || null;
            setMatchStatus({
              matches: !overItem,
              over: !!overItem,
              actualDuration,
              expectedDuration: suggestedLength,
              difference: actualDuration - suggestedLength,
              overItem: overItem
                ? {
                    code: overItem.code,
                    overBy: overItem.totalMinutes - overItem.weeklyPackage,
                    minutesHere: overItem.minutesHere,
                    elsewhere: formatElsewhereByDay(overItem.elsewhereByDay),
                  }
                : null,
            });
          }
        } else {
          console.log("🔄 No suggestion: missing requirements");
          setIsCalculating(false);
        }
      } else {
        console.log("🔄 No suggestion: missing dependencies", {
          timeStart: !!timeStart,
          careItemsLength: careItems.length,
          allCareItems: !!allCareItems,
        });
        setIsCalculating(false);
      }
    } else if (autoSuggest && source === "time_end") {
      // Reset suggestions when not applicable
      console.log("🔄 Resetting suggestions (not applicable)");
      setIsCalculating(false);
      setSuggestedTime(null);
      setShowSuggestion(false);
      setMatchStatus(null);
    }
    // Dépendances volontaires sur les clés sérialisées (careItemsKey/actionsKey/
    // occurrenceKey = JSON de careItems/actions/occurrences) pour éviter de
    // relancer à chaque rendu sur une nouvelle identité d'array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    timeStart,
    careItemsKey,
    actionsKey,
    occurrenceKey,
    allCareItems,
    occurrenceList,
    siblingSessions,
    autoSuggest,
    source,
    timeEnd,
  ]);

  const handleApplySuggestion = () => {
    if (suggestedTime) {
      // Convert suggested time to Date object for React Admin
      const [hours, minutes] = suggestedTime.split(":");
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      setValue(source, date);
      setIsAutoUpdated(true);
      setShowSuggestion(false);

      // Show auto-update effect for 3 seconds
      setTimeout(() => setIsAutoUpdated(false), 3000);
    }
  };

  const getStatusIcon = () => {
    if (isAutoUpdated) {
      return (
        <CheckIcon
          sx={{ color: "success.main", animation: "pulse 1s infinite" }}
        />
      );
    }

    if (matchStatus?.matches) {
      return <CheckIcon sx={{ color: "success.main" }} />;
    }

    if (matchStatus && !matchStatus.matches) {
      return <WarningIcon sx={{ color: "warning.main" }} />;
    }

    return null;
  };

  const getHelperText = () => {
    if (isAutoUpdated) {
      return "✨ Heure ajustée sur le budget du forfait";
    }

    // Over one or more weekly forfait budgets
    if (matchStatus?.over && matchStatus.overItem) {
      const oi = matchStatus.overItem;
      const elsewhere = oi.elsewhere ? ` — déjà ${oi.elsewhere}` : "";
      return `⚠️ ${oi.code} dépasse le forfait hebdo de ${formatDurationDisplay(oi.overBy)}${elsewhere}`;
    }

    if (matchStatus?.matches && matchStatus.expectedDuration > 0) {
      const diff = matchStatus.difference; // actual - recommended
      if (diff <= -5) {
        return `✓ Sous le forfait — reste ${formatDurationDisplay(-diff)} cette semaine`;
      }
      return `✅ Dans le forfait hebdo (séance recommandée : ${formatDurationDisplay(matchStatus.expectedDuration)})`;
    }

    return helperText;
  };

  const getStatusColor = () => {
    if (isAutoUpdated) return "success";
    if (matchStatus?.matches) return "success";
    if (matchStatus && !matchStatus.matches) return "warning";
    return "primary";
  };

  return (
    <Box sx={{ position: "relative", ...sx }}>
      <EnhancedTimeInput
        source={source}
        label={label}
        required={required}
        helperText={getHelperText()}
        error={error}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderColor: isAutoUpdated ? "success.main" : undefined,
            boxShadow: isAutoUpdated
              ? "0 0 10px rgba(76, 175, 80, 0.3)"
              : undefined,
            transition: "all 0.3s ease-in-out",
          },
        }}
      />

      {/* Status Icon */}
      <Box
        sx={{
          position: "absolute",
          right: 45,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 1,
        }}
      >
        <Zoom in={!!getStatusIcon()}>
          <Box>{getStatusIcon()}</Box>
        </Zoom>
      </Box>

      {/* Calculating Indicator */}
      {isCalculating && autoSuggest && (
        <Fade in={isCalculating}>
          <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              icon={<AutoIcon sx={{ animation: "spin 1s linear infinite" }} />}
              label="Calculating suggestion..."
              size="small"
              variant="outlined"
              color="primary"
              sx={{
                "@keyframes spin": {
                  "0%": { transform: "rotate(0deg)" },
                  "100%": { transform: "rotate(360deg)" },
                },
              }}
            />
          </Box>
        </Fade>
      )}

      {/* Auto-suggestion Button */}
      {showSuggestion && suggestedTime && !isCalculating && (
        <Fade in={showSuggestion}>
          <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip
              title={`Based on care package duration: ${formatDurationDisplay(matchStatus?.expectedDuration || 0)}`}
            >
              <Button
                size="small"
                variant="outlined"
                startIcon={<AutoIcon />}
                onClick={handleApplySuggestion}
                sx={{
                  borderColor: "primary.main",
                  color: "primary.main",
                  animation: "glow 2s ease-in-out infinite alternate",
                  "@keyframes glow": {
                    from: { boxShadow: "0 0 5px rgba(25, 118, 210, 0.5)" },
                    to: { boxShadow: "0 0 15px rgba(25, 118, 210, 0.8)" },
                  },
                }}
              >
                Suggest: {suggestedTime}
              </Button>
            </Tooltip>

            <Chip
              icon={<ClockIcon />}
              label={`${formatDurationDisplay(matchStatus?.expectedDuration || 0)} session`}
              size="small"
              variant="outlined"
              color="info"
            />
          </Box>
        </Fade>
      )}

      {/* Auto-update notification */}
      {isAutoUpdated && (
        <Fade in={isAutoUpdated}>
          <Box sx={{ mt: 1 }}>
            <Chip
              icon={<AutoIcon />}
              label="Time automatically calculated from care items"
              size="small"
              color="success"
              variant="filled"
              sx={{
                animation: "slideIn 0.5s ease-out",
                "@keyframes slideIn": {
                  from: { transform: "translateX(-20px)", opacity: 0 },
                  to: { transform: "translateX(0)", opacity: 1 },
                },
              }}
            />
          </Box>
        </Fade>
      )}
    </Box>
  );
};
