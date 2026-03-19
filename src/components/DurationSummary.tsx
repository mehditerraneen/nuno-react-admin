import React from "react";
import { Box, Typography, Chip, Paper, Divider } from "@mui/material";
import {
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import {
  calculateSessionDuration,
  calculateCareItemsDailyDuration,
  calculateActualDaysPerWeek,
  formatDurationDisplay,
} from "../utils/timeUtils";
import { CarePlanDetail } from "../dataProvider";
import { CareItemDebugger } from "./CareItemDebugger";

interface DurationSummaryProps {
  detail: CarePlanDetail;
}

export const DurationSummary: React.FC<DurationSummaryProps> = ({ detail }) => {
  // Calculate session duration from time_start to time_end
  const sessionDuration = calculateSessionDuration(
    detail.time_start,
    detail.time_end,
  );

  // Calculate actual days per week (handles "tous les jours" = 7 days)
  const actualDaysPerWeek = calculateActualDaysPerWeek(
    detail.params_occurrence,
  );

  // Per-session duration from care items (uses session_duration field)
  const careItemsSessionDuration = calculateCareItemsDailyDuration(
    detail.longtermcareitemquantity_set,
  );

  // Weekly total from weekly_package (the actual weekly budget)
  const careItemsWeeklyTotal = detail.longtermcareitemquantity_set.reduce(
    (total, item) => total + (item.long_term_care_item.weekly_package || 0) * item.quantity,
    0,
  );

  // Weekly session time = session duration * days per week
  const actualWeeklySessionTime = sessionDuration * (actualDaysPerWeek || 1);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mt: 2,
        backgroundColor: "#f5f5f5",
        border: "1px solid #e0e0e0",
      }}
    >
      <Typography
        variant="h6"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <TimeIcon color="primary" />
        Duration Summary
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
            Session Duration
          </Typography>
          <Chip
            label={formatDurationDisplay(sessionDuration)}
            color="primary"
            variant="outlined"
            size="small"
          />
        </Box>

        {/* Weekly Occurrences */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Days/Week
          </Typography>
          <Chip
            label={
              actualDaysPerWeek === 7
                ? "7 (tous les jours)"
                : `${actualDaysPerWeek}x`
            }
            color="secondary"
            variant="outlined"
            size="small"
            icon={<CalendarIcon />}
          />
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* Care Items Per-Session Duration */}
        {careItemsSessionDuration > 0 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Care Items/Session
            </Typography>
            <Chip
              label={formatDurationDisplay(careItemsSessionDuration)}
              color="info"
              variant="outlined"
              size="small"
            />
          </Box>
        )}

        {/* Care Items Weekly Package Total */}
        {careItemsWeeklyTotal > 0 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Care Package/Week
            </Typography>
            <Chip
              label={formatDurationDisplay(careItemsWeeklyTotal)}
              color="info"
              variant="filled"
              size="small"
            />
          </Box>
        )}

        {/* Actual Weekly Session Time */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Weekly Session Time
          </Typography>
          <Chip
            label={formatDurationDisplay(actualWeeklySessionTime)}
            color="success"
            variant="filled"
            size="small"
          />
        </Box>
      </Box>

      {/* Show breakdown if care items have data */}
      {careItemsSessionDuration > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Care Items Breakdown (Session → Weekly Package):
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
            {detail.longtermcareitemquantity_set.map((item, index) => {
              const sessionDur =
                (item.long_term_care_item as any).session_duration ||
                (item.long_term_care_item.weekly_package || 0) / 7;
              const weeklyPkg = (item.long_term_care_item.weekly_package || 0) * item.quantity;

              if (sessionDur === 0 && weeklyPkg === 0) return null;

              return (
                <Chip
                  key={index}
                  label={`${item.long_term_care_item.code}: ${formatDurationDisplay(sessionDur)}/session — ${formatDurationDisplay(weeklyPkg)}/week (${item.quantity}x)`}
                  size="small"
                  variant="outlined"
                  color="default"
                />
              );
            })}
          </Box>
        </Box>
      )}

      {/* Warning if session time doesn't match care package time */}
      {careItemsWeeklyTotal > 0 &&
        Math.abs(actualWeeklySessionTime - careItemsWeeklyTotal) > 5 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="warning.main">
              Session time ({formatDurationDisplay(actualWeeklySessionTime)}
              /week) differs from care package ({formatDurationDisplay(careItemsWeeklyTotal)}/week)
            </Typography>
          </Box>
        )}

      {/* Debug Information */}
      <CareItemDebugger detail={detail} />
    </Paper>
  );
};

interface CarePlanDetailsSummaryProps {
  details: CarePlanDetail[];
}

export const CarePlanDetailsSummary: React.FC<CarePlanDetailsSummaryProps> = ({
  details,
}) => {
  // Calculate total weekly durations across all details
  const totalSessionTime = details.reduce((total, detail) => {
    const sessionDuration = calculateSessionDuration(
      detail.time_start,
      detail.time_end,
    );
    const actualDays = calculateActualDaysPerWeek(detail.params_occurrence) || 1;
    return total + sessionDuration * actualDays;
  }, 0);

  // Sum weekly_package directly (already the weekly total)
  const totalCareItemsDuration = details.reduce((total, detail) => {
    return (
      total +
      detail.longtermcareitemquantity_set.reduce(
        (subtotal, item) =>
          subtotal + (item.long_term_care_item.weekly_package || 0) * item.quantity,
        0,
      )
    );
  }, 0);

  if (details.length === 0) {
    return null;
  }

  // Monthly estimates (28–31 days)
  const dailyFromWeekly = totalSessionTime / 7;
  const monthly28 = Math.round(dailyFromWeekly * 28);
  const monthly30 = Math.round(dailyFromWeekly * 30);
  const monthly31 = Math.round(dailyFromWeekly * 31);

  const dailyCareFromWeekly = totalCareItemsDuration / 7;
  const monthlyCare28 = Math.round(dailyCareFromWeekly * 28);
  const monthlyCare30 = Math.round(dailyCareFromWeekly * 30);
  const monthlyCare31 = Math.round(dailyCareFromWeekly * 31);

  return (
    <Paper
      sx={{
        p: 3,
        mt: 2,
        backgroundColor: "#e3f2fd",
        border: "2px solid #2196f3",
      }}
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <TimeIcon color="primary" />
        Total Care Plan Summary
      </Typography>

      <Box
        sx={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography variant="subtitle1" color="text.secondary">
            Total Weekly Session Time
          </Typography>
          <Typography variant="h4" color="primary" fontWeight="bold">
            {formatDurationDisplay(totalSessionTime)}
          </Typography>
        </Box>

        {totalCareItemsDuration > 0 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Typography variant="subtitle1" color="text.secondary">
              Total Care Package Time
            </Typography>
            <Typography variant="h4" color="info.main" fontWeight="bold">
              {formatDurationDisplay(totalCareItemsDuration)}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography variant="subtitle1" color="text.secondary">
            Care Details Count
          </Typography>
          <Typography variant="h4" color="secondary.main" fontWeight="bold">
            {details.length}
          </Typography>
        </Box>
      </Box>

      {/* Monthly Estimates */}
      <Divider sx={{ my: 2 }} />
      <Typography
        variant="h6"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <CalendarIcon color="primary" />
        Monthly Estimates
      </Typography>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        {[
          { days: 28, session: monthly28, care: monthlyCare28 },
          { days: 30, session: monthly30, care: monthlyCare30 },
          { days: 31, session: monthly31, care: monthlyCare31 },
        ].map(({ days, session, care }) => (
          <Paper
            key={days}
            variant="outlined"
            sx={{ p: 1.5, minWidth: 140, textAlign: "center" }}
          >
            <Typography variant="caption" color="text.secondary">
              {days} days
            </Typography>
            <Typography variant="h6" color="primary" fontWeight="bold">
              {formatDurationDisplay(session)}
            </Typography>
            {totalCareItemsDuration > 0 && (
              <Typography variant="caption" color="info.main">
                pkg: {formatDurationDisplay(care)}
              </Typography>
            )}
          </Paper>
        ))}
      </Box>
    </Paper>
  );
};
