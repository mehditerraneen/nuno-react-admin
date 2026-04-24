import React from "react";
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import type { Medication } from "../../types/medicationPlans";
import {
  endsSoonLabel,
  isLegacyOnly,
  summarizeSchedule,
} from "./medBoardUtils";
import { prescriptionStyle } from "./medBoardPalette";

interface MedicationBoardCardProps {
  medication: Medication;
  accent: string;
  onClick?: () => void;
  isPending?: boolean;
  canArchive?: boolean;
  onArchive?: () => void;
  /** Short prescription label shown in the Rx chip — e.g. "16/04/2026". */
  prescriptionLabel?: string;
  /** Hide the Rx chip (useful when the group header already identifies it). */
  hideRxChip?: boolean;
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
};

export const MedicationBoardCard: React.FC<MedicationBoardCardProps> = ({
  medication,
  accent,
  onClick,
  isPending,
  canArchive,
  onArchive,
  prescriptionLabel,
  hideRxChip,
}) => {
  const schedule = summarizeSchedule(medication);
  const legacy = isLegacyOnly(medication);
  const endingLabel = endsSoonLabel(medication);
  const rx = prescriptionStyle(medication.prescription_id);
  const hasRx = medication.prescription_id != null;
  const leftStripe = hasRx ? rx.main : accent;

  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 1,
        mb: 1,
        cursor: onClick ? "pointer" : "default",
        borderLeft: `4px solid ${leftStripe}`,
        backgroundColor: isPending ? "#fff9c4" : "white",
        transition: "box-shadow .15s ease, transform .15s ease",
        "&:hover": onClick
          ? { boxShadow: 2, transform: "translateY(-1px)" }
          : undefined,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            flexGrow: 1,
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: "text.primary",
          }}
          title={medication.medicine_name}
        >
          {medication.medicine_abbreviated_name || medication.medicine_name}
        </Typography>
        {canArchive && onArchive && (
          <Tooltip title="Archiver">
            <IconButton
              size="small"
              sx={{ p: 0.25 }}
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
            >
              <Inventory2OutlinedIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {/* Dosage pill */}
      {medication.dosage && (
        <Box
          sx={{
            display: "inline-block",
            px: 1,
            py: 0.25,
            mb: 0.75,
            borderRadius: 1,
            backgroundColor: hasRx ? rx.soft : "#eef2f7",
            color: hasRx ? rx.text : "#37474f",
            fontSize: "0.78rem",
            fontWeight: 600,
          }}
        >
          {medication.dosage}
        </Box>
      )}

      {/* Schedule summary */}
      <Typography
        variant="body2"
        sx={{
          color: "text.primary",
          lineHeight: 1.3,
          fontSize: "0.8rem",
          mb: 0.75,
        }}
      >
        {schedule}
      </Typography>

      <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
        {hasRx && !hideRxChip && (
          <Tooltip title={`Prescription #${medication.prescription_id}`}>
            <Chip
              size="small"
              icon={<AssignmentOutlinedIcon sx={{ fontSize: "0.9rem" }} />}
              label={
                prescriptionLabel
                  ? `Rx ${prescriptionLabel}`
                  : `Rx #${medication.prescription_id}`
              }
              component="a"
              clickable
              href={`#/prescriptions/${medication.prescription_id}/show`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              sx={{
                fontSize: "0.7rem",
                height: 22,
                backgroundColor: rx.soft,
                color: rx.text,
                border: `1px solid ${rx.main}`,
                "& .MuiChip-icon": { color: rx.text },
              }}
            />
          </Tooltip>
        )}
        {medication.date_started && (
          <Chip
            size="small"
            variant="outlined"
            label={
              medication.date_ended
                ? `${formatDate(medication.date_started)} → ${formatDate(medication.date_ended)}`
                : `depuis ${formatDate(medication.date_started)}`
            }
            sx={{ fontSize: "0.7rem", height: 22 }}
          />
        )}
        {endingLabel && (
          <Chip
            size="small"
            color="warning"
            variant="filled"
            icon={<WarningAmberIcon sx={{ fontSize: "0.9rem" }} />}
            label={endingLabel}
            sx={{ fontSize: "0.7rem", height: 22, color: "white" }}
          />
        )}
        {legacy && (
          <Chip
            size="small"
            variant="outlined"
            label="legacy"
            sx={{
              fontSize: "0.7rem",
              height: 22,
              color: "warning.dark",
              borderColor: "warning.main",
            }}
          />
        )}
      </Stack>
    </Paper>
  );
};

export default MedicationBoardCard;
