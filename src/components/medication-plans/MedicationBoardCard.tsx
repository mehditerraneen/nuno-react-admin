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
import DescriptionIcon from "@mui/icons-material/Description";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import type { Medication } from "../../types/medicationPlans";
import {
  endsSoonLabel,
  isLegacyOnly,
  summarizeSchedule,
} from "./medBoardUtils";

interface MedicationBoardCardProps {
  medication: Medication;
  accent: string;
  onClick?: () => void;
  isPending?: boolean;
  canArchive?: boolean;
  onArchive?: () => void;
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
}) => {
  const schedule = summarizeSchedule(medication);
  const legacy = isLegacyOnly(medication);
  const endingLabel = endsSoonLabel(medication);

  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 1,
        mb: 1,
        cursor: onClick ? "pointer" : "default",
        borderLeft: `3px solid ${accent}`,
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
            fontWeight: 600,
            flexGrow: 1,
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={medication.medicine_name}
        >
          {medication.medicine_abbreviated_name || medication.medicine_name}
        </Typography>
        {medication.prescription_id && (
          <Tooltip title={`Prescription #${medication.prescription_id}`}>
            <IconButton
              size="small"
              sx={{ p: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              component="a"
              href={`#/prescriptions/${medication.prescription_id}/show`}
            >
              <DescriptionIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        )}
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

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 0.5 }}
      >
        {medication.dosage}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: "text.primary",
          lineHeight: 1.3,
          fontSize: "0.8rem",
          mb: 0.5,
        }}
      >
        {schedule}
      </Typography>

      <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
        {medication.date_started && (
          <Chip
            size="small"
            variant="outlined"
            label={
              medication.date_ended
                ? `${formatDate(medication.date_started)} → ${formatDate(medication.date_ended)}`
                : `depuis ${formatDate(medication.date_started)}`
            }
            sx={{ fontSize: "0.7rem", height: 20 }}
          />
        )}
        {endingLabel && (
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            icon={<WarningAmberIcon sx={{ fontSize: "0.9rem" }} />}
            label={endingLabel}
            sx={{ fontSize: "0.7rem", height: 20 }}
          />
        )}
        {legacy && (
          <Chip
            size="small"
            variant="outlined"
            label="legacy"
            sx={{
              fontSize: "0.7rem",
              height: 20,
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
