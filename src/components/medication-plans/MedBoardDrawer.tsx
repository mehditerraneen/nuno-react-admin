import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArchiveIcon from "@mui/icons-material/Inventory2Outlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import SaveIcon from "@mui/icons-material/Save";
import UndoIcon from "@mui/icons-material/Undo";
import type {
  Medication,
  ScheduleKind,
  ScheduleRule,
} from "../../types/medicationPlans";
import { MedBoardRuleEditor } from "./MedBoardRuleEditor";
import type { UseStagedChangesApi } from "./medBoardStagedChanges";

const KIND_LABELS: Record<ScheduleKind, string> = {
  parts: "Parties de la journée",
  times: "Heures précises",
  weekly: "Hebdomadaire",
  monthly: "Mensuel",
  specific: "Dates spécifiques",
  prn: "Si besoin (PRN)",
  glycemia_scale: "Selon glycémie (insuline)",
};

const blankRule = (kind: ScheduleKind): ScheduleRule => ({
  schedule_kind: kind,
  dose: 1,
  dose_unit: "comprimé(s)",
  is_active: true,
  parts_of_day: kind === "parts" ? ["morning"] : null,
  exact_times: kind === "times" ? ["08:00"] : null,
  weekdays: kind === "weekly" ? [0] : null,
  weekly_time: kind === "weekly" ? "08:00" : null,
  days_of_month: kind === "monthly" ? [1] : null,
  monthly_time: kind === "monthly" ? "08:00" : null,
  specific_datetimes: kind === "specific" ? [] : null,
  prn_condition: kind === "prn" ? "" : null,
  prn_max_doses_per_day: null,
  prn_min_interval_hours: null,
  glycemia_context: kind === "glycemia_scale" ? "before_meal" : null,
  glycemia_dosing_schema:
    kind === "glycemia_scale"
      ? [
          { min: null, max: 100, dose: 0 },
          { min: 100, max: 150, dose: 2 },
          { min: 150, max: null, dose: 4 },
        ]
      : null,
  max_daily_units: null,
  notes: null,
});

// Deep-clone rules so draft edits don't mutate the projected state.
const cloneRule = (r: ScheduleRule): ScheduleRule => ({
  ...r,
  parts_of_day: r.parts_of_day ? [...r.parts_of_day] : r.parts_of_day,
  exact_times: r.exact_times ? [...r.exact_times] : r.exact_times,
  weekdays: r.weekdays ? [...r.weekdays] : r.weekdays,
  days_of_month: r.days_of_month ? [...r.days_of_month] : r.days_of_month,
  specific_datetimes: r.specific_datetimes
    ? [...r.specific_datetimes]
    : r.specific_datetimes,
  glycemia_dosing_schema: r.glycemia_dosing_schema
    ? r.glycemia_dosing_schema.map((e) => ({ ...e }))
    : r.glycemia_dosing_schema,
});

const cloneMed = (m: Medication): Medication => ({
  ...m,
  schedule_rules: (m.schedule_rules ?? []).map(cloneRule),
});

interface MedBoardDrawerProps {
  medication: Medication | null;
  onClose: () => void;
  staged: UseStagedChangesApi;
}

type DraftRule = ScheduleRule & { __key: string };

export const MedBoardDrawer: React.FC<MedBoardDrawerProps> = ({
  medication,
  onClose,
  staged,
}) => {
  const open = medication !== null;

  const [draft, setDraft] = useState<Medication | null>(null);
  const [draftRules, setDraftRules] = useState<DraftRule[]>([]);
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLButtonElement | null>(
    null,
  );

  // Reset local draft whenever a different medication is opened.
  useEffect(() => {
    if (!medication) {
      setDraft(null);
      setDraftRules([]);
      return;
    }
    setDraft(cloneMed(medication));
    setDraftRules(
      (medication.schedule_rules ?? []).map((r, idx) => ({
        ...cloneRule(r),
        __key: r.id != null ? `rid-${r.id}` : `tmp-${idx}`,
      })),
    );
  }, [medication?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => {
    if (!draft || !medication) return false;
    // Medicine-level fields
    const medKeys: (keyof Medication)[] = [
      "dosage",
      "date_started",
      "date_ended",
      "remarks",
    ];
    for (const k of medKeys) {
      if ((draft[k] ?? null) !== (medication[k] ?? null)) return true;
    }
    // Rules: serialize and compare
    const origRules = (medication.schedule_rules ?? []).map(
      ({ ...r }) => r,
    );
    const curRules = draftRules.map(({ __key, ...r }) => r);
    return JSON.stringify(origRules) !== JSON.stringify(curRules);
  }, [draft, medication, draftRules]);

  if (!medication || !draft) {
    return (
      <Drawer anchor="right" open={open} onClose={onClose}>
        <Box sx={{ width: 480, p: 2 }} />
      </Drawer>
    );
  }

  const patchMed = (patch: Partial<Medication>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const patchRule = (key: string, patch: Partial<ScheduleRule>) => {
    setDraftRules((prev) =>
      prev.map((r) => (r.__key === key ? { ...r, ...patch } : r)),
    );
  };

  const removeRule = (key: string) => {
    setDraftRules((prev) => prev.filter((r) => r.__key !== key));
  };

  const addRule = (kind: ScheduleKind) => {
    const tempKey = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setDraftRules((prev) => [...prev, { ...blankRule(kind), __key: tempKey }]);
    setAddMenuAnchor(null);
  };

  const handleSave = () => {
    if (!draft) return;
    // 1) Dispatch medicine-field diff
    const medPatch: Partial<Medication> = {};
    (["dosage", "date_started", "date_ended", "remarks"] as const).forEach(
      (k) => {
        if ((draft[k] ?? null) !== (medication[k] ?? null)) {
          // @ts-expect-error — TS can't narrow the union across k
          medPatch[k] = draft[k];
        }
      },
    );
    if (Object.keys(medPatch).length > 0) {
      staged.updateMedication(medication.id, medPatch);
    }

    // 2) Rules: compare by id
    const origRulesById = new Map<number, ScheduleRule>();
    for (const r of medication.schedule_rules ?? []) {
      if (r.id != null) origRulesById.set(r.id, r);
    }
    const draftIdsSeen = new Set<number>();
    for (const { __key, ...dr } of draftRules) {
      if (dr.id != null && origRulesById.has(dr.id)) {
        draftIdsSeen.add(dr.id);
        const orig = origRulesById.get(dr.id)!;
        const rulePatch: Partial<ScheduleRule> = {};
        const keys = Object.keys(dr) as (keyof ScheduleRule)[];
        for (const k of keys) {
          if (JSON.stringify(dr[k]) !== JSON.stringify(orig[k])) {
            // @ts-expect-error see above
            rulePatch[k] = dr[k];
          }
        }
        if (Object.keys(rulePatch).length > 0) {
          staged.updateRule(medication.id, dr.id, rulePatch);
        }
      } else {
        staged.addRule(medication.id, dr);
      }
    }
    // Removed rules
    for (const [rid] of origRulesById) {
      if (!draftIdsSeen.has(rid)) {
        staged.removeRule(medication.id, rid);
      }
    }

    onClose();
  };

  const handleDiscard = () => {
    setDraft(cloneMed(medication));
    setDraftRules(
      (medication.schedule_rules ?? []).map((r, idx) => ({
        ...cloneRule(r),
        __key: r.id != null ? `rid-${r.id}` : `tmp-${idx}`,
      })),
    );
  };

  const handleArchive = () => {
    staged.archiveMedication(medication.id);
    onClose();
  };

  const handleRemove = () => {
    if (
      !window.confirm(
        `Supprimer « ${medication.medicine_abbreviated_name || medication.medicine_name} » ?`,
      )
    )
      return;
    staged.removeMedication(medication.id);
    onClose();
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 520, display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid",
            borderBottomColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap>
              {medication.medicine_abbreviated_name || medication.medicine_name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {medication.medicine_name}
            </Typography>
          </Box>
          {medication.prescription_id && (
            <Chip
              label={`Prescription #${medication.prescription_id}`}
              size="small"
              component="a"
              clickable
              href={`#/prescriptions/${medication.prescription_id}/show`}
            />
          )}
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Scrollable body */}
        <Box sx={{ p: 2, overflow: "auto", flexGrow: 1 }}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Dosage & période
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                size="small"
                fullWidth
                label="Dosage"
                value={draft.dosage ?? ""}
                onChange={(e) => patchMed({ dosage: e.target.value })}
              />
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  type="date"
                  label="Début"
                  InputLabelProps={{ shrink: true }}
                  value={draft.date_started ?? ""}
                  onChange={(e) =>
                    patchMed({ date_started: e.target.value || "" })
                  }
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Fin"
                  InputLabelProps={{ shrink: true }}
                  value={draft.date_ended ?? ""}
                  onChange={(e) =>
                    patchMed({ date_ended: e.target.value || null })
                  }
                  sx={{ flex: 1 }}
                />
              </Stack>
              <TextField
                size="small"
                fullWidth
                multiline
                minRows={2}
                label="Remarques"
                value={draft.remarks ?? ""}
                onChange={(e) => patchMed({ remarks: e.target.value })}
              />
            </Stack>
          </Paper>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1,
            }}
          >
            <Typography variant="subtitle2">
              Règles de planification ({draftRules.length})
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={(e) => setAddMenuAnchor(e.currentTarget)}
            >
              Ajouter règle
            </Button>
            <Menu
              anchorEl={addMenuAnchor}
              open={Boolean(addMenuAnchor)}
              onClose={() => setAddMenuAnchor(null)}
            >
              {(Object.keys(KIND_LABELS) as ScheduleKind[]).map((k) => (
                <MenuItem key={k} onClick={() => addRule(k)}>
                  {KIND_LABELS[k]}
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {draftRules.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Aucune règle. Utilisez « Ajouter règle » ci-dessus — les règles
              déterminent quand et combien donner.
            </Typography>
          )}

          {draftRules.map((rule) => (
            <MedBoardRuleEditor
              key={rule.__key}
              rule={rule}
              onChange={(patch) => patchRule(rule.__key, patch)}
              onDelete={() => removeRule(rule.__key)}
            />
          ))}

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" spacing={1}>
            <Tooltip title="Archiver le médicament (date de fin = aujourd'hui)">
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<ArchiveIcon />}
                onClick={handleArchive}
              >
                Archiver
              </Button>
            </Tooltip>
            <Tooltip title="Supprimer totalement le médicament">
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteForeverIcon />}
                onClick={handleRemove}
              >
                Supprimer
              </Button>
            </Tooltip>
          </Stack>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid",
            borderTopColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Button
            size="small"
            startIcon={<UndoIcon />}
            onClick={handleDiscard}
            disabled={!dirty}
          >
            Annuler les modifications
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!dirty}
          >
            Enregistrer (stager)
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default MedBoardDrawer;
