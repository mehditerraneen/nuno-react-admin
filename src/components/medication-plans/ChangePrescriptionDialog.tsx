import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useDataProvider, useNotify, useTranslate } from "react-admin";

interface PatientPrescription {
  id: number;
  date?: string | null;
  end_date?: string | null;
  prescriptor_name?: string | null;
  prescriptor_first_name?: string | null;
  prescriptor?: { name?: string; first_name?: string } | null;
}

interface MedicationLite {
  id: number;
  medicine_abbreviated_name?: string | null;
  date_started?: string | null;
  date_ended?: string | null;
}

interface ChangePrescriptionDialogProps {
  open: boolean;
  onClose: () => void;
  /** Medication plan id, used by the bulk-update endpoint. */
  planId: number;
  /** Patient id, to filter the prescription picker. */
  patientId: number;
  /** Medications currently linked to the *old* prescription that the
   * user is replacing. All of them get the new prescription_id. */
  medications: MedicationLite[];
  /** The current (old) prescription id — excluded from the picker so
   * the user can only pick a different one. */
  currentPrescriptionId: number | null;
  onChanged: () => void;
}

const fmtPrescriptionLabel = (
  p: PatientPrescription,
  translate: (k: string) => string,
): string => {
  const dateStr = p.date ? new Date(p.date).toLocaleDateString("fr-FR") : "—";
  const docFirst = p.prescriptor_first_name || p.prescriptor?.first_name || "";
  const docLast = p.prescriptor_name || p.prescriptor?.name || "";
  const doctor = `${docFirst} ${docLast}`.trim();
  const tag = `#${p.id}`;
  const titleBase = translate("prescription_show.title");
  return doctor
    ? `${titleBase} ${tag} · ${dateStr} · ${doctor}`
    : `${titleBase} ${tag} · ${dateStr}`;
};

export const ChangePrescriptionDialog = ({
  open,
  onClose,
  planId,
  patientId,
  medications,
  currentPrescriptionId,
  onChanged,
}: ChangePrescriptionDialogProps) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const translate = useTranslate();

  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const [loadingRx, setLoadingRx] = useState(false);
  const [picked, setPicked] = useState<PatientPrescription | null>(null);
  const [newStart, setNewStart] = useState<string>("");
  const [newEnd, setNewEnd] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // Fetch the patient's prescriptions when the dialog opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingRx(true);
    (dataProvider as any)
      .getPatientPrescriptions(patientId)
      .then((result: unknown) => {
        if (cancelled) return;
        const list: PatientPrescription[] = Array.isArray(result)
          ? (result as PatientPrescription[])
          : Array.isArray((result as { data?: unknown })?.data)
            ? (result as { data: PatientPrescription[] }).data
            : [];
        // Exclude the current one.
        setPrescriptions(list.filter((p) => p.id !== currentPrescriptionId));
      })
      .catch(() => {
        if (!cancelled) setPrescriptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRx(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, patientId, currentPrescriptionId, dataProvider]);

  // Reset local state on each open.
  useEffect(() => {
    if (open) {
      setPicked(null);
      setNewStart("");
      setNewEnd("");
    }
  }, [open]);

  // When a prescription is picked, prefill suggested dates from it.
  useEffect(() => {
    if (!picked) {
      setNewStart("");
      setNewEnd("");
      return;
    }
    setNewStart(picked.date ? picked.date.slice(0, 10) : "");
    setNewEnd(picked.end_date ? picked.end_date.slice(0, 10) : "");
  }, [picked]);

  const medicationIds = useMemo(
    () => medications.map((m) => m.id),
    [medications],
  );

  const handleApply = async () => {
    if (!picked) {
      notify("Veuillez sélectionner une prescription.", { type: "warning" });
      return;
    }
    setBusy(true);
    try {
      const data: Record<string, unknown> = { prescription_id: picked.id };
      if (newStart) data.date_started = newStart;
      if (newEnd) data.date_ended = newEnd;

      const result = await (dataProvider as any).bulkUpdateMedications(
        planId,
        medicationIds,
        data,
      );
      notify(
        `Prescription mise à jour pour ${result?.updated ?? medicationIds.length} médicament(s).`,
        { type: "success" },
      );
      onChanged();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Erreur : ${msg}`, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Changer la prescription</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Rattachez les médicaments ci-dessous à une autre prescription du
          patient (par exemple un renouvellement). Vous pouvez aussi ajuster les
          dates de début / fin — elles seront appliquées à tous les médicaments
          du groupe.
        </DialogContentText>

        <Stack spacing={2}>
          <Box
            sx={{
              p: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              backgroundColor: "action.hover",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Médicaments concernés ({medications.length})
            </Typography>
            <Stack spacing={0.25} sx={{ mt: 0.5 }}>
              {medications.map((m) => (
                <Typography key={m.id} variant="body2">
                  • {m.medicine_abbreviated_name ?? `Médicament #${m.id}`}
                </Typography>
              ))}
            </Stack>
          </Box>

          <Autocomplete<PatientPrescription, false, false, false>
            options={prescriptions}
            loading={loadingRx}
            value={picked}
            onChange={(_, v) => setPicked(v)}
            getOptionLabel={(p) => fmtPrescriptionLabel(p, translate)}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Nouvelle prescription"
                placeholder="Choisir parmi les prescriptions du patient…"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingRx ? (
                        <CircularProgress color="inherit" size={16} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            noOptionsText={
              loadingRx
                ? "Chargement…"
                : "Aucune autre prescription pour ce patient"
            }
            disabled={busy}
          />

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Nouvelle date de début"
              type="date"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              disabled={busy}
              helperText="Laisser vide pour ne pas changer"
              sx={{ flex: 1 }}
            />
            <TextField
              label="Nouvelle date de fin"
              type="date"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              disabled={busy}
              helperText="Laisser vide pour ne pas changer"
              sx={{ flex: 1 }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Annuler
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          disabled={busy || !picked}
        >
          {busy ? <CircularProgress size={20} /> : "Appliquer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
