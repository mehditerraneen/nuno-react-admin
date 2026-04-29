import { useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  onChanged: () => void;
}

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
  onChanged,
}: EditTriggersDialogProps) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const notify = useNotify();
  const [triggers, setTriggers] = useState<CarePlanRevisionTrigger[]>(
    initialTriggers,
  );
  const [busy, setBusy] = useState(false);

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
