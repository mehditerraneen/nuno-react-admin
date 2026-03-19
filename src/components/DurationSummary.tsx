import React from "react";
import { Box, Typography, Chip, Paper, Divider } from "@mui/material";
import {
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import {
  calculateSessionDuration,
  calculateCareItemsDailyDuration,
  calculateCareItemsActualWeeklyDuration,
  calculateActualDaysPerWeek,
  formatDurationDisplay,
} from "../utils/timeUtils";
import { CarePlanDetail } from "../dataProvider";
import { CareItemDebugger } from "./CareItemDebugger";

interface DurationSummaryProps {
  detail: CarePlanDetail;
}

export const DurationSummary: React.FC<DurationSummaryProps> = ({ detail }) => {
  console.log("📋 DurationSummary - detail:", detail);
  console.log(
    "📋 DurationSummary - longtermcareitemquantity_set:",
    detail.longtermcareitemquantity_set,
  );

  // Calculate session duration from time_start to time_end
  const sessionDuration = calculateSessionDuration(
    detail.time_start,
    detail.time_end,
  );

  // Calculate actual days per week (handles "tous les jours" = 7 days)
  const actualDaysPerWeek = calculateActualDaysPerWeek(
    detail.params_occurrence,
  );
  const occurrencesPerWeek = detail.params_occurrence.length; // For display only

  // Calculate daily duration from care items' weekly_package
  const careItemsDailyDuration = calculateCareItemsDailyDuration(
    detail.longtermcareitemquantity_set,
  );

  // Calculate actual weekly duration based on occurrences
  const careItemsActualWeeklyDuration = calculateCareItemsActualWeeklyDuration(
    detail.longtermcareitemquantity_set,
    detail.params_occurrence,
  );

  console.log("📋 DurationSummary - calculations:", {
    careItemsDailyDuration,
    careItemsActualWeeklyDuration,
    occurrencesPerWeek,
    actualDaysPerWeek,
  });

  // Calculate actual weekly time based on session duration and actual days
  const actualWeeklySessionTime = sessionDuration * actualDaysPerWeek;

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

        {/* Care Items Daily Duration */}
        {careItemsDailyDuration > 0 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Care Items Daily
            </Typography>
            <Chip
              label={formatDurationDisplay(careItemsDailyDuration)}
              color="info"
              variant="outlined"
              size="small"
            />
          </Box>
        )}

        {/* Care Items Actual Weekly Duration */}
        {careItemsActualWeeklyDuration > 0 && (
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
              label={formatDurationDisplay(careItemsActualWeeklyDuration)}
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

      {/* Show breakdown if care items have weekly packages */}
      {careItemsDailyDuration > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Care Items Breakdown (Daily → Actual Weekly):
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
            {detail.longtermcareitemquantity_set.map((item, index) => {
              const itemWeeklyPackage =
                item.long_term_care_item.weekly_package || 0;
              const itemDailyDuration = (itemWeeklyPackage / 7) * item.quantity;
              const itemActualWeeklyDuration =
                itemDailyDuration * actualDaysPerWeek;

              if (itemWeeklyPackage === 0) return null;

              return (
                <Chip
                  key={index}
                  label={`${item.long_term_care_item.code}: ${formatDurationDisplay(itemDailyDuration)}/day → ${formatDurationDisplay(itemActualWeeklyDuration)}/week (${item.quantity}x)`}
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
      {careItemsActualWeeklyDuration > 0 &&
        actualWeeklySessionTime !== careItemsActualWeeklyDuration && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="warning.main">
              ⚠️ Session time ({formatDurationDisplay(actualWeeklySessionTime)}
              /week) differs from care package time (
              {formatDurationDisplay(careItemsActualWeeklyDuration)}/week)
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
    const actualDays = calculateActualDaysPerWeek(detail.params_occurrence);
    return total + sessionDuration * actualDays;
  }, 0);

  const totalCareItemsDuration = details.reduce((total, detail) => {
    return (
      total +
      calculateCareItemsActualWeeklyDuration(
        detail.longtermcareitemquantity_set,
        detail.params_occurrence,
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
