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
import {
  useDataProvider,
  useGetList,
  useGetOne,
  useNotify,
  useTranslate,
} from "react-admin";
import type { MyDataProvider } from "../../dataProvider";
import { prescriptionStyle } from "./medBoardPalette";
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
  prescriptionLabels: Map<number, string>;
  onCardClick?: (med: Medication) => void;
  onArchive?: (med: Medication) => void;
}> = ({
  lane,
  medications,
  pendingIds,
  prescriptionLabels,
  onCardClick,
  onArchive,
}) => {
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
          // Soft tint of the lane accent
          backgroundColor: `${lane.accent}14`,
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
              prescriptionLabel={
                med.prescription_id != null
                  ? prescriptionLabels.get(med.prescription_id)
                  : undefined
              }
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
  const dataProvider = useDataProvider<MyDataProvider>();
  const staged = useStagedChanges();
  const [selectedMedId, setSelectedMedId] = React.useState<number | null>(null);
  const [isApplying, setIsApplying] = React.useState(false);

  const {
    data: plan,
    isPending,
    error,
    refetch,
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

  // Fetch this patient's prescriptions so we can label Rx chips + build a legend
  const { data: prescriptionsList } = useGetList(
    "prescriptions",
    {
      filter: { patient_id: plan.patient_id },
      pagination: { page: 1, perPage: 100 },
      sort: { field: "date", order: "DESC" },
    },
    { enabled: plan.patient_id != null },
  );

  const prescriptionLabels = new Map<number, string>();
  const prescriptionLegend: {
    id: number;
    label: string;
    doctor?: string;
  }[] = [];
  const usedRxIds = new Set<number>(
    medications
      .map((m) => m.prescription_id)
      .filter((v): v is number => v != null),
  );
  for (const p of prescriptionsList ?? []) {
    if (!usedRxIds.has(p.id as number)) continue;
    const date = p.date
      ? new Date(p.date as string).toLocaleDateString()
      : `#${p.id}`;
    const doctorName: string | undefined =
      (p as { prescriptor_name?: string }).prescriptor_name ||
      (p as { prescriptor?: { name?: string } }).prescriptor?.name;
    prescriptionLabels.set(p.id as number, date);
    prescriptionLegend.push({
      id: p.id as number,
      label: date,
      doctor: doctorName,
    });
  }
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

  const handleApplyAll = async () => {
    if (!plan) return;
    const planId = plan.id;
    setIsApplying(true);

    const affectedMedIds = Array.from(
      new Set(staged.changes.map((c) => c.medicationId)),
    );
    const removalIds = new Set(
      staged.changes
        .filter((c) => c.kind === "remove_medication")
        .map((c) => c.medicationId),
    );

    try {
      for (const medId of affectedMedIds) {
        // 1) Removal wins
        if (removalIds.has(medId)) {
          await dataProvider.deleteMedication(planId, medId);
          continue;
        }

        const server = rawMedications.find((m) => m.id === medId);
        const projected = medications.find((m) => m.id === medId);
        if (!server || !projected) continue;

        // 2) Medicine-level patch
        const medPatch: Record<string, unknown> = {};
        (["dosage", "date_started", "date_ended", "remarks"] as const).forEach(
          (k) => {
            if ((server[k] ?? null) !== (projected[k] ?? null)) {
              medPatch[k] = projected[k];
            }
          },
        );
        if (Object.keys(medPatch).length > 0) {
          await dataProvider.updateMedication(planId, medId, medPatch);
        }

        // 3) Rules: reconcile by id
        const serverRules = server.schedule_rules ?? [];
        const projectedRules = projected.schedule_rules ?? [];
        const projectedIds = new Set(
          projectedRules.map((r) => r.id).filter((x): x is number => x != null),
        );

        // 3a) Create new rules (no id)
        for (const r of projectedRules.filter((r) => r.id == null)) {
          await dataProvider.createScheduleRule(planId, medId, r);
        }
        // 3b) Delete removed rules
        for (const r of serverRules.filter((r) => r.id != null && !projectedIds.has(r.id!))) {
          if (r.id != null) {
            await dataProvider.deleteScheduleRule(planId, medId, r.id);
          }
        }
        // 3c) Update changed rules
        for (const r of projectedRules.filter((r) => r.id != null)) {
          const srv = serverRules.find((s) => s.id === r.id);
          if (srv && JSON.stringify(srv) !== JSON.stringify(r) && r.id != null) {
            await dataProvider.updateScheduleRule(planId, medId, r.id, r);
          }
        }
      }

      staged.discardAll();
      notify(translate("med_board.apply_success"), { type: "success" });
      await refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`${translate("med_board.apply_error")}: ${msg}`, {
        type: "error",
      });
    } finally {
      setIsApplying(false);
    }
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
              isApplying={isApplying}
            />
          </Stack>
        </Stack>
      </Paper>

      {/* Prescription color legend */}
      {prescriptionLegend.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 1,
            mb: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            backgroundColor: "#fafafa",
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, mr: 1 }}>
            {translate("med_board.rx_legend")}:
          </Typography>
          {prescriptionLegend.map((rx) => {
            const s = prescriptionStyle(rx.id);
            return (
              <Chip
                key={rx.id}
                size="small"
                component="a"
                clickable
                href={`#/prescriptions/${rx.id}/show`}
                label={
                  rx.doctor ? `${rx.label} — ${rx.doctor}` : `Rx ${rx.label}`
                }
                sx={{
                  backgroundColor: s.soft,
                  color: s.text,
                  border: `1px solid ${s.main}`,
                  fontWeight: 600,
                }}
              />
            );
          })}
        </Paper>
      )}

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
            prescriptionLabels={prescriptionLabels}
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
