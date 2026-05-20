import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useDataProvider, useNotify, type Identifier } from "react-admin";

import type {
  CarePlanRevisionTrigger,
  MyDataProvider,
} from "../../dataProvider";
import { RevisionTriggerPicker } from "./RevisionTriggerPicker";

interface EditTriggersDialogProps {
  open: boolean;
  onClose: () => void;
  carePlanId: Identifier;
  revisionId: Identifier;
  initialTriggers: CarePlanRevisionTrigger[];
  initialRevisedOn?: string | null;
  onChanged: () => void;
}

const toLocalInputValue = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
};

/**
 * Manage triggers on an *existing* revision: add/remove. Each action
 * commits to the backend immediately so the UI stays in sync; closing
 * the dialog calls onChanged so the parent can refresh.
 */
export const EditTriggersDialog = ({
  open,
  onClose,
  carePlanId,
  revisionId,
  initialTriggers,
  initialRevisedOn,
  onChanged,
}: EditTriggersDialogProps) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const notify = useNotify();
  const [triggers, setTriggers] = useState<CarePlanRevisionTrigger[]>(
    initialTriggers,
  );
  const initialLocal = toLocalInputValue(initialRevisedOn);
  const [revisedOn, setRevisedOn] = useState<string>(initialLocal);
  const [busy, setBusy] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

  useEffect(() => {
    setRevisedOn(toLocalInputValue(initialRevisedOn));
  }, [initialRevisedOn, revisionId]);

  const dateChanged = revisedOn !== initialLocal && revisedOn !== "";

  const handleSaveDate = async () => {
    if (!dateChanged) return;
    setSavingDate(true);
    try {
      const iso = new Date(revisedOn).toISOString();
      await dataProvider.updateCarePlanRevisionDate(
        carePlanId,
        revisionId,
        iso,
      );
      notify("Date de révision mise à jour", { type: "success" });
      onChanged();
    } catch (err) {
      notify(
        `Impossible de mettre à jour la date : ${
          err instanceof Error ? err.message : String(err)
        }`,
        { type: "error" },
      );
    } finally {
      setSavingDate(false);
    }
  };

  const handleAttach = async (item: {
    kind: string;
    source_id: number;
    summary: string;
  }) => {
    setBusy(true);
    try {
      const trigger = await dataProvider.attachRevisionTrigger(
        carePlanId,
        revisionId,
        item.kind,
        item.source_id,
      );
      setTriggers((cur) =>
        cur.some((t) => t.id === trigger.id) ? cur : [...cur, trigger],
      );
    } catch (err) {
      notify(
        `Impossible d'attacher : ${err instanceof Error ? err.message : String(err)}`,
        { type: "error" },
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDetach = async (t: CarePlanRevisionTrigger) => {
    setBusy(true);
    try {
      await dataProvider.detachRevisionTrigger(carePlanId, revisionId, t.id);
      setTriggers((cur) => cur.filter((x) => x.id !== t.id));
    } catch (err) {
      notify(
        `Impossible de détacher : ${err instanceof Error ? err.message : String(err)}`,
        { type: "error" },
      );
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (busy) return;
    onChanged();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Motifs de la révision</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Date de révision
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              type="datetime-local"
              size="small"
              value={revisedOn}
              onChange={(e) => setRevisedOn(e.target.value)}
              disabled={busy || savingDate}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleSaveDate}
              disabled={!dateChanged || busy || savingDate}
            >
              {savingDate ? <CircularProgress size={18} /> : "Enregistrer"}
            </Button>
          </Stack>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <RevisionTriggerPicker
          carePlanId={carePlanId}
          existing={triggers}
          onPick={handleAttach}
          onRemoveExisting={handleDetach}
          disabled={busy}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>
          {busy ? <CircularProgress size={20} /> : "Fermer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
