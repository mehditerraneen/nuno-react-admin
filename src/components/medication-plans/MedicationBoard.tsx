import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MedicationIcon from "@mui/icons-material/Medication";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import BoltIcon from "@mui/icons-material/Bolt";
import OpacityIcon from "@mui/icons-material/Opacity";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { useGetOne, useNotify, useTranslate } from "react-admin";
import type {
  Medication,
  MedicationPlan,
} from "../../types/medicationPlans";
import { bucketize, type LaneKey } from "./medBoardUtils";
import { MedicationBoardCard } from "./MedicationBoardCard";
import {
  projectMedications,
  useStagedChanges,
  changesForMedication,
} from "./medBoardStagedChanges";
import { MedBoardPendingTray } from "./MedBoardPendingTray";
import { MedBoardDrawer } from "./MedBoardDrawer";

interface LaneDescriptor {
  key: LaneKey;
  labelKey: string;
  icon: React.ReactElement;
  accent: string;
}

const LANES: LaneDescriptor[] = [
  { key: "active", labelKey: "med_board.lane_active", icon: <MedicationIcon />, accent: "#2e7d32" },
  { key: "prn", labelKey: "med_board.lane_prn", icon: <BoltIcon />, accent: "#6a1b9a" },
  { key: "insulin", labelKey: "med_board.lane_insulin", icon: <OpacityIcon />, accent: "#1565c0" },
  { key: "ending", labelKey: "med_board.lane_ending", icon: <HourglassBottomIcon />, accent: "#ef6c00" },
  { key: "archived", labelKey: "med_board.lane_archived", icon: <Inventory2OutlinedIcon />, accent: "#546e7a" },
];

const LaneColumn: React.FC<{
  lane: LaneDescriptor;
  medications: Medication[];
  pendingIds: Set<number>;
  onCardClick?: (med: Medication) => void;
  onArchive?: (med: Medication) => void;
}> = ({ lane, medications, pendingIds, onCardClick, onArchive }) => {
  const translate = useTranslate();
  return (
    <Paper
      variant="outlined"
      sx={{
        flex: "1 1 220px",
        minWidth: 220,
        display: "flex",
        flexDirection: "column",
        borderTop: `4px solid ${lane.accent}`,
        backgroundColor: "#fafafa",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 1,
          borderBottom: "1px solid",
          borderBottomColor: "divider",
        }}
      >
        {React.cloneElement(lane.icon, { sx: { color: lane.accent } })}
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: lane.accent, flexGrow: 1 }}
        >
          {translate(lane.labelKey)}
        </Typography>
        <Chip label={medications.length} size="small" variant="outlined" />
      </Box>
      <Box sx={{ p: 1, flex: 1, minHeight: 240 }}>
        {medications.length === 0 ? (
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ display: "block", textAlign: "center", mt: 2 }}
          >
            —
          </Typography>
        ) : (
          medications.map((med) => (
            <MedicationBoardCard
              key={med.id}
              medication={med}
              accent={lane.accent}
              onClick={onCardClick ? () => onCardClick(med) : undefined}
              isPending={pendingIds.has(med.id)}
              canArchive={lane.key !== "archived"}
              onArchive={onArchive ? () => onArchive(med) : undefined}
            />
          ))
        )}
      </Box>
    </Paper>
  );
};

export const MedicationBoard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const translate = useTranslate();
  const notify = useNotify();
  const staged = useStagedChanges();
  const [selectedMedId, setSelectedMedId] = React.useState<number | null>(null);

  const {
    data: plan,
    isPending,
    error,
  } = useGetOne<MedicationPlan>(
    "medication-plans",
    { id: id ?? "" },
    { enabled: !!id },
  );

  if (!id) {
    return <Alert severity="error">Missing plan id</Alert>;
  }

  if (isPending) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 3 }}>
        <CircularProgress size={22} />
        <Typography>{translate("med_board.loading")}</Typography>
      </Box>
    );
  }

  if (error || !plan) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {translate("med_board.error")}
      </Alert>
    );
  }

  const rawMedications: Medication[] = plan.medications ?? [];
  const medications = projectMedications(rawMedications, staged.changes);
  const pendingIds = new Set(
    medications
      .filter((m) => changesForMedication(staged.changes, m.id).length > 0)
      .map((m) => m.id),
  );

  const medicationsByLane: Record<LaneKey, Medication[]> = {
    active: [],
    prn: [],
    insulin: [],
    ending: [],
    archived: [],
  };
  for (const med of medications) {
    medicationsByLane[bucketize(med)].push(med);
  }

  const handleArchive = (med: Medication) => {
    staged.archiveMedication(med.id);
  };

  const handleCardClick = (med: Medication) => {
    setSelectedMedId(med.id);
  };

  const handleApplyAll = () => {
    notify(translate("med_board.apply_not_wired"), { type: "info" });
  };

  const selectedMed =
    selectedMedId != null
      ? medications.find((m) => m.id === selectedMedId) ?? null
      : null;

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          flexWrap="wrap"
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Button
              component={Link}
              to={`/medication-plans/${plan.id}/show`}
              startIcon={<ArrowBackIcon />}
              size="small"
            >
              {translate("med_board.back")}
            </Button>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {translate("med_board.title")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {plan.patient_name} · {plan.description}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Chip
              label={
                plan.status === "in_progress"
                  ? translate("med_board.status_active")
                  : translate("med_board.status_archived")
              }
              color={plan.status === "in_progress" ? "success" : "default"}
              size="small"
            />
            <Typography variant="caption" color="text.secondary">
              {medications.length} {translate("med_board.meds_short")}
            </Typography>
            <MedBoardPendingTray
              changes={staged.changes}
              medications={rawMedications}
              onDiscard={staged.discard}
              onDiscardAll={staged.discardAll}
              onApplyAll={handleApplyAll}
              disableApply
              applyDisabledReason={translate("med_board.apply_not_wired")}
            />
          </Stack>
        </Stack>
      </Paper>

      {/* Lanes */}
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={2}
        sx={{ alignItems: "stretch" }}
      >
        {LANES.map((lane) => (
          <LaneColumn
            key={lane.key}
            lane={lane}
            medications={medicationsByLane[lane.key]}
            pendingIds={pendingIds}
            onArchive={handleArchive}
            onCardClick={handleCardClick}
          />
        ))}
      </Stack>

      <MedBoardDrawer
        medication={selectedMed}
        onClose={() => setSelectedMedId(null)}
        staged={staged}
      />
    </Box>
  );
};

export default MedicationBoard;
