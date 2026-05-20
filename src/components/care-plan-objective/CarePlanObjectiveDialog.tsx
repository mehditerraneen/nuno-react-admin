import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { useDataProvider, useNotify, type Identifier } from "react-admin";

import type {
  CarePlanObjective,
  CarePlanObjectivePriority,
  CarePlanObjectiveStatus,
  MyDataProvider,
} from "../../dataProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  carePlanId: Identifier;
  /** When set, dialog edits this objective; otherwise creates a new one. */
  initial?: CarePlanObjective | null;
  onSaved: () => void;
}

const PRIORITY_OPTIONS: { value: CarePlanObjectivePriority; label: string }[] =
  [
    { value: "high", label: "Haute" },
    { value: "medium", label: "Moyenne" },
    { value: "low", label: "Basse" },
  ];

const STATUS_OPTIONS: { value: CarePlanObjectiveStatus; label: string }[] = [
  { value: "active", label: "Actif" },
  { value: "achieved", label: "Atteint" },
  { value: "partially_achieved", label: "Partiellement atteint" },
  { value: "abandoned", label: "Abandonné" },
];

export const CarePlanObjectiveDialog = ({
  open,
  onClose,
  carePlanId,
  initial,
  onSaved,
}: Props) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const notify = useNotify();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<CarePlanObjectivePriority>("medium");
  const [status, setStatus] = useState<CarePlanObjectiveStatus>("active");
  const [targetDate, setTargetDate] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setDescription(initial?.description ?? "");
      setPriority(initial?.priority ?? "medium");
      setStatus(initial?.status ?? "active");
      setTargetDate(initial?.target_date ?? "");
    }
  }, [open, initial]);

  const handleSave = async () => {
    if (!title.trim()) {
      notify("Le titre est requis", { type: "warning" });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        target_date: targetDate || null,
      };
      if (initial?.id) {
        await dataProvider.updateCarePlanObjective(
          carePlanId,
          initial.id,
          payload,
        );
        notify("Objectif mis à jour", { type: "success" });
      } else {
        await dataProvider.createCarePlanObjective(carePlanId, payload);
        notify("Objectif créé", { type: "success" });
      }
      onSaved();
      onClose();
    } catch (err) {
      notify(`Erreur : ${err instanceof Error ? err.message : String(err)}`, {
        type: "error",
      });
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
      <DialogTitle>
        {initial?.id ? "Modifier l'objectif" : "Nouvel objectif"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Titre"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Prévenir les chutes"
            required
            autoFocus
            disabled={busy}
            fullWidth
            size="small"
          />
          <TextField
            label="Description / justification"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Pourquoi cet objectif ? Sur quel constat clinique ?"
            multiline
            minRows={3}
            disabled={busy}
            fullWidth
            size="small"
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel id="objective-priority-label">Priorité</InputLabel>
              <Select
                labelId="objective-priority-label"
                label="Priorité"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as CarePlanObjectivePriority)
                }
                disabled={busy}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel id="objective-status-label">Statut</InputLabel>
              <Select
                labelId="objective-status-label"
                label="Statut"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as CarePlanObjectiveStatus)
                }
                disabled={busy}
              >
                {STATUS_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <TextField
            label="Échéance"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            disabled={busy}
            size="small"
            sx={{ width: 240 }}
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
          disabled={busy || !title.trim()}
        >
          {busy ? <CircularProgress size={20} /> : "Enregistrer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
