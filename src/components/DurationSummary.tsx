import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Chip,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from "@mui/material";
import {
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  ListAlt as ListIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { useDataProvider, useTranslate, Identifier } from "react-admin";
import {
  calculateSessionDuration,
  calculateCareItemsDailyDuration,
  calculateActualDaysPerWeek,
  formatDurationDisplay,
} from "../utils/timeUtils";
import { CarePlanDetail } from "../dataProvider";

interface DurationSummaryProps {
  detail: CarePlanDetail;
}

export const DurationSummary: React.FC<DurationSummaryProps> = ({ detail }) => {
  const translate = useTranslate();
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
        maxWidth: 800,
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
        {translate("care_plan_summary.duration_summary")}
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
            {translate("care_plan_summary.session_duration")}
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
            {translate("care_plan_summary.days_per_week")}
          </Typography>
          <Chip
            label={
              actualDaysPerWeek === 7
                ? translate("care_plan_summary.every_day")
                : translate("care_plan_summary.times_per_week", {
                    count: actualDaysPerWeek,
                  })
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
              {translate("care_plan_summary.care_items_per_session")}
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
              {translate("care_plan_summary.care_package_per_week")}
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
            {translate("care_plan_summary.weekly_session_time")}
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
            {translate("care_plan_summary.breakdown_session_weekly")}
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
              {translate("care_plan_summary.session_mismatch", {
                session: formatDurationDisplay(actualWeeklySessionTime),
                pkg: formatDurationDisplay(careItemsWeeklyTotal),
              })}
            </Typography>
          </Box>
        )}

    </Paper>
  );
};

interface CarePlanDetailsSummaryProps {
  details: CarePlanDetail[];
  cnsCarePlanId?: Identifier;
}

export const CarePlanDetailsSummary: React.FC<CarePlanDetailsSummaryProps> = ({
  details,
  cnsCarePlanId,
}) => {
  const translate = useTranslate();
  const dataProvider = useDataProvider<any>();
  const [missingCodes, setMissingCodes] = useState<
    Array<{ code: string; description?: string; number_of_care: number; periodicity: string; weekly_package?: number }>
  >([]);

  useEffect(() => {
    if (!cnsCarePlanId) return;

    // Collect codes used in care plan details
    const usedCodes = new Set<string>();
    details.forEach((detail) => {
      detail.longtermcareitemquantity_set.forEach((item) => {
        usedCodes.add(item.long_term_care_item.code);
      });
    });

    // Fetch CNS care plan details and find missing codes
    dataProvider
      .getCnsCarePlanDetails(cnsCarePlanId)
      .then((cnsDetails: any[]) => {
        const missing = cnsDetails
          .filter((d: any) => d.item?.code && !usedCodes.has(d.item.code))
          .map((d: any) => ({
            code: d.item.code,
            description: d.custom_description || d.item.description || "",
            number_of_care: d.number_of_care,
            periodicity: d.periodicity,
            weekly_package: d.item.weekly_package,
          }));
        setMissingCodes(missing);
      })
      .catch((err: any) => {
        console.error("Failed to fetch CNS details for missing codes:", err);
      });
  }, [cnsCarePlanId, details, dataProvider]);
  // Calculate total weekly durations across all details
  const totalSessionTime = details.reduce((total, detail) => {
    const sessionDuration = calculateSessionDuration(
      detail.time_start,
      detail.time_end,
    );
    const actualDays = calculateActualDaysPerWeek(detail.params_occurrence) || 1;
    return total + sessionDuration * actualDays;
  }, 0);

  // Per-code stats: weekly_package (counted once), session_duration, total weekly occurrences
  const codeStats = new Map<string, { weeklyPkg: number; sessionDur: number; totalOccurrences: number }>();
  details.forEach((detail) => {
    const daysPerWeek = calculateActualDaysPerWeek(detail.params_occurrence) || 1;
    detail.longtermcareitemquantity_set.forEach((item) => {
      const code = item.long_term_care_item.code;
      const wp = item.long_term_care_item.weekly_package || 0;
      const sd =
        (item.long_term_care_item as any).session_duration ||
        (wp / 7);
      const existing = codeStats.get(code);
      if (existing) {
        existing.totalOccurrences += item.quantity * daysPerWeek;
      } else {
        codeStats.set(code, {
          weeklyPkg: wp,
          sessionDur: sd,
          totalOccurrences: item.quantity * daysPerWeek,
        });
      }
    });
  });
  const totalCareItemsDuration = Array.from(codeStats.values()).reduce(
    (sum, v) => sum + v.weeklyPkg,
    0,
  );
  const totalConsumed = Array.from(codeStats.values()).reduce(
    (sum, v) => sum + Math.round(v.sessionDur * v.totalOccurrences * 100) / 100,
    0,
  );

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
        maxWidth: 800,
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
        {translate("care_plan_summary.total_title")}
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
            {translate("care_plan_summary.total_weekly_session_time")}
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
              {translate("care_plan_summary.sum_weekly_packages")}
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
            {translate("care_plan_summary.care_details_count")}
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
        {translate("care_plan_summary.monthly_estimates")}
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
              {translate("care_plan_summary.days", { n: days })}
            </Typography>
            <Typography variant="h6" color="primary" fontWeight="bold">
              {formatDurationDisplay(session)}
            </Typography>
            {totalCareItemsDuration > 0 && (
              <Typography variant="caption" color="info.main">
                {translate("care_plan_summary.pkg_prefix", {
                  value: formatDurationDisplay(care),
                })}
              </Typography>
            )}
          </Paper>
        ))}
      </Box>

      {/* Detailed breakdown table */}
      <Divider sx={{ my: 2 }} />
      <Typography
        variant="h6"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <ListIcon color="primary" />
        {translate("care_plan_summary.breakdown_title")}
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: 600 }}>
                {translate("care_plan_summary.col_detail")}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                {translate("care_plan_summary.col_code")}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                {translate("care_plan_summary.col_qty")}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {translate("care_plan_summary.col_session_min")}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {translate("care_plan_summary.col_weekly_pkg_min")}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {translate("care_plan_summary.col_qty_times_session")}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {translate("care_plan_summary.col_consumed_per_week")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(() => {
              const seenCodes = new Set<string>();
              let totalSession = 0;
              return (
                <>
                  {details.flatMap((detail, detailIndex) => {
                    const daysPerWeek = calculateActualDaysPerWeek(detail.params_occurrence) || 1;
                    return detail.longtermcareitemquantity_set.map((item, itemIndex) => {
                      const code = item.long_term_care_item.code;
                      const sessionDur =
                        (item.long_term_care_item as any).session_duration ||
                        (item.long_term_care_item.weekly_package || 0) / 7;
                      const weeklyPkg = item.long_term_care_item.weekly_package || 0;
                      const isDuplicate = seenCodes.has(code);
                      seenCodes.add(code);
                      totalSession += sessionDur * item.quantity;
                      const stats = codeStats.get(code);
                      const consumed = stats
                        ? Math.round(stats.sessionDur * stats.totalOccurrences * 100) / 100
                        : 0;
                      return (
                        <TableRow
                          key={`${detailIndex}-${itemIndex}`}
                          sx={{ "&:nth-of-type(odd)": { backgroundColor: "#fafafa" } }}
                        >
                          <TableCell>
                            <Typography variant="caption">
                              {detail.name} ({daysPerWeek}x/wk)
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={code} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell align="right">{Math.round(sessionDur * 100) / 100}</TableCell>
                          <TableCell align="right">{weeklyPkg}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {Math.round(sessionDur * item.quantity * 100) / 100}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {isDuplicate ? (
                              <Typography variant="caption" color="text.disabled">
                                {translate("care_plan_summary.incl_above")}
                              </Typography>
                            ) : (
                              consumed
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })}
                  <TableRow sx={{ backgroundColor: "#e3f2fd" }}>
                    <TableCell colSpan={5} sx={{ fontWeight: 700 }}>
                      {translate("care_plan_summary.total")}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {Math.round(totalSession * 100) / 100}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {Math.round(totalConsumed * 100) / 100}
                    </TableCell>
                  </TableRow>
                </>
              );
            })()}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Missing CNS Codes */}
      {missingCodes.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <WarningIcon color="warning" />
            {translate("care_plan_summary.missing_cns_codes", {
              count: missingCodes.length,
            })}
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {translate("care_plan_summary.missing_cns_warning")}
          </Alert>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#fff3e0" }}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {translate("care_plan_summary.col_code")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {translate("care_plan_summary.col_description_cns")}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    {translate("care_plan_summary.col_frequency")}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {translate("care_plan_summary.col_weekly_pkg_min")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {missingCodes.map((mc, index) => (
                  <TableRow key={index} sx={{ "&:nth-of-type(odd)": { backgroundColor: "#fff8e1" } }}>
                    <TableCell>
                      <Chip label={mc.code} size="small" color="warning" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{mc.description || "—"}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      {mc.number_of_care}/
                      {mc.periodicity === "W"
                        ? translate("care_plan_summary.freq_wk")
                        : mc.periodicity === "D"
                          ? translate("care_plan_summary.freq_day")
                          : mc.periodicity}
                    </TableCell>
                    <TableCell align="right">{mc.weekly_package || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Paper>
  );
};
