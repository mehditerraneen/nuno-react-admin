import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useDataProvider, useNotify, useTranslate } from "react-admin";

import type { Medication } from "../../types/medicationPlans";

interface EditMedicationDialogProps {
  open: boolean;
  onClose: () => void;
  planId: number;
  medication: Medication;
  onSaved: () => void;
}

const toDateInput = (v: string | null | undefined): string =>
  v ? String(v).slice(0, 10) : "";

/**
 * Compact edit dialog for the per-medication metadata: dosage, the
 * planned start/end window, and the free-text remarks. Schedule
 * rules and prescription change live in their own dedicated
 * dialogs — keeping this one focused on the medication-row fields.
 */
export const EditMedicationDialog = ({
  open,
  onClose,
  planId,
  medication,
  onSaved,
}: EditMedicationDialogProps) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const translate = useTranslate();

  const [dosage, setDosage] = useState<string>("");
  const [dateStarted, setDateStarted] = useState<string>("");
  const [dateEnded, setDateEnded] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // Reset form whenever the dialog opens onto a (potentially new)
  // medication so we don't show stale data.
  useEffect(() => {
    if (!open) return;
    setDosage(medication.dosage ?? "");
    setDateStarted(toDateInput(medication.date_started));
    setDateEnded(toDateInput(medication.date_ended));
    setRemarks(medication.remarks ?? "");
  }, [open, medication]);

  const handleSave = async () => {
    setBusy(true);
    try {
      await (dataProvider as any).updateMedication(planId, medication.id, {
        dosage: dosage.trim(),
        date_started: dateStarted || null,
        date_ended: dateEnded || null,
        remarks: remarks,
      });
      notify("Médicament mis à jour", { type: "success" });
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Erreur : ${msg}`, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const title =
    medication.medicine_abbreviated_name ||
    medication.medicine_name ||
    "Médicament";

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", pr: 1 }}>
        <Box sx={{ flexGrow: 1 }}>Modifier — {title}</Box>
        <Tooltip title="Fermer" arrow>
          <span>
            <IconButton onClick={onClose} disabled={busy} size="small">
              <CloseIcon />
            </IconButton>
          </span>
        </Tooltip>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Modifier le dosage, la fenêtre de prise (début/fin) et les remarques.
          L'horaire d'administration et la prescription rattachée se modifient
          dans leurs propres boîtes de dialogue.
        </DialogContentText>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Dosage"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            size="small"
            disabled={busy}
            fullWidth
            placeholder="ex. 500 mg"
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={translate("medication_plan_show.med.started")}
              type="date"
              value={dateStarted}
              onChange={(e) => setDateStarted(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              disabled={busy}
              sx={{ flex: 1 }}
            />
            <TextField
              label={translate("medication_plan_show.med.ended_label")}
              type="date"
              value={dateEnded}
              onChange={(e) => setDateEnded(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              disabled={busy}
              helperText="Vide = pas de date de fin"
              sx={{ flex: 1 }}
            />
          </Box>
          <TextField
            label={translate("medication_plan_show.med.remarks")}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            multiline
            minRows={3}
            size="small"
            disabled={busy}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Annuler
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={busy || !dosage.trim()}
        >
          {busy ? <CircularProgress size={20} /> : "Enregistrer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
