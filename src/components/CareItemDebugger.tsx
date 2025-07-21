import React from "react";
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  BugReport as BugIcon,
} from "@mui/icons-material";
import { CarePlanDetail } from "../dataProvider";
import {
  calculateActualDaysPerWeek,
  formatDurationDisplay,
} from "../utils/timeUtils";

interface CareItemDebuggerProps {
  detail: CarePlanDetail;
}

export const CareItemDebugger: React.FC<CareItemDebuggerProps> = ({
  detail,
}) => {
  const actualDaysPerWeek = calculateActualDaysPerWeek(
    detail.params_occurrence,
  );

  return (
    <Accordion sx={{ mt: 2, backgroundColor: "#fff3e0" }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <BugIcon color="warning" />
          <Typography variant="subtitle2">Debug: Care Items Data</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="caption" gutterBottom>
          Raw longtermcareitemquantity_set data:
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, backgroundColor: "#f5f5f5" }}>
          <pre style={{ fontSize: "12px", margin: 0, overflow: "auto" }}>
            {JSON.stringify(detail.longtermcareitemquantity_set, null, 2)}
          </pre>
        </Paper>

        <Typography
          variant="caption"
          gutterBottom
          sx={{ mt: 2, display: "block" }}
        >
          Care Items Analysis:
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {detail.longtermcareitemquantity_set.map((item, index) => (
            <Paper
              key={index}
              variant="outlined"
              sx={{ p: 1, fontSize: "12px" }}
            >
              <Typography variant="caption" component="div">
                <strong>Item {index + 1}:</strong>
              </Typography>
              <Typography variant="caption" component="div">
                • ID: {item.long_term_care_item.id}
              </Typography>
              <Typography variant="caption" component="div">
                • Code: {item.long_term_care_item.code}
              </Typography>
              <Typography variant="caption" component="div">
                • Description: {item.long_term_care_item.description || "N/A"}
              </Typography>
              <Typography
                variant="caption"
                component="div"
                color={
                  item.long_term_care_item.weekly_package
                    ? "success.main"
                    : "error.main"
                }
              >
                • Weekly Package:{" "}
                {item.long_term_care_item.weekly_package ?? "UNDEFINED"}
                {item.long_term_care_item.weekly_package && " minutes"}
              </Typography>
              <Typography variant="caption" component="div">
                • Quantity: {item.quantity}
              </Typography>
              <Typography variant="caption" component="div">
                • Daily Duration:{" "}
                {formatDurationDisplay(
                  ((item.long_term_care_item.weekly_package || 0) / 7) *
                    item.quantity,
                )}
              </Typography>
              <Typography variant="caption" component="div">
                • Weekly Package:{" "}
                {formatDurationDisplay(
                  (item.long_term_care_item.weekly_package || 0) *
                    item.quantity,
                )}
              </Typography>

              {item.long_term_care_item.code === "AEVM-C-ES" && (
                <Typography
                  variant="caption"
                  component="div"
                  color="warning.main"
                >
                  ⚠️ THIS IS THE AEVM-C-ES ITEM
                </Typography>
              )}
            </Paper>
          ))}
        </Box>

        <Typography
          variant="caption"
          gutterBottom
          sx={{ mt: 2, display: "block" }}
        >
          Total Calculation:
        </Typography>
        <Typography variant="caption" component="div">
          <strong>Daily Sum:</strong>{" "}
          {formatDurationDisplay(
            detail.longtermcareitemquantity_set.reduce(
              (total, item) =>
                total +
                ((item.long_term_care_item.weekly_package || 0) / 7) *
                  item.quantity,
              0,
            ),
          )}
        </Typography>
        <Typography variant="caption" component="div">
          <strong>Weekly Package Total:</strong>{" "}
          {formatDurationDisplay(
            detail.longtermcareitemquantity_set.reduce(
              (total, item) =>
                total +
                (item.long_term_care_item.weekly_package || 0) * item.quantity,
              0,
            ),
          )}
        </Typography>
        <Typography variant="caption" component="div">
          <strong>
            Actual Weekly (×{actualDaysPerWeek} days
            {actualDaysPerWeek === 7 ? " - tous les jours" : ""}):
          </strong>{" "}
          {formatDurationDisplay(
            detail.longtermcareitemquantity_set.reduce(
              (total, item) =>
                total +
                ((item.long_term_care_item.weekly_package || 0) / 7) *
                  item.quantity,
              0,
            ) * actualDaysPerWeek,
          )}
        </Typography>
        <Typography variant="caption" component="div" sx={{ mt: 1 }}>
          <strong>Occurrence Analysis:</strong> Found{" "}
          {detail.params_occurrence.length} occurrence(s):{" "}
          {detail.params_occurrence
            .map((occ) => `"${occ.str_name}"`)
            .join(", ")}
          {actualDaysPerWeek === 7 && (
            <span style={{ color: "orange" }}>
              {" "}
              → Detected "tous les jours" = 7 days
            </span>
          )}
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
};
