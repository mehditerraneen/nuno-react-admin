import React from "react";
import { Alert, Slide, Zoom, Box, Typography, Chip } from "@mui/material";
import {
  AutoFixHigh as AutoIcon,
  Schedule as ClockIcon,
} from "@mui/icons-material";
import { formatDurationDisplay } from "../utils/timeUtils";

interface AutoCalculationNotificationProps {
  show: boolean;
  expectedDuration: number;
  suggestedTime: string;
  onClose?: () => void;
}

export const AutoCalculationNotification: React.FC<
  AutoCalculationNotificationProps
> = ({ show, expectedDuration, suggestedTime, onClose }) => {
  return (
    <Zoom in={show}>
      <Alert
        severity="info"
        sx={{
          mt: 2,
          background: "linear-gradient(45deg, #e3f2fd 30%, #bbdefb 90%)",
          border: "1px solid #2196f3",
          "& .MuiAlert-icon": {
            color: "#1976d2",
          },
        }}
        icon={<AutoIcon />}
        onClose={onClose}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="body2" component="span">
            🤖 Auto-calculated end time:
          </Typography>
          <Chip
            icon={<ClockIcon />}
            label={`${suggestedTime} (${formatDurationDisplay(expectedDuration)} session)`}
            size="small"
            color="primary"
            variant="filled"
          />
          <Typography variant="caption" color="text.secondary">
            Based on care package duration
          </Typography>
        </Box>
      </Alert>
    </Zoom>
  );
};
