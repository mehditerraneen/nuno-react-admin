import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import {
  Identifier,
  useDataProvider,
  useNotify,
  useTranslate,
} from "react-admin";
import type { MyDataProvider } from "./dataProvider";
import { RevisionTriggerPicker } from "./components/care-plan-revision/RevisionTriggerPicker";

interface CarePlanRevisionDialogProps {
  open: boolean;
  onClose: () => void;
  onRevised: () => void;
  carePlanId: Identifier;
}

interface PendingTrigger {
  kind: string;
  source_id: number;
  summary: string;
}

export const CarePlanRevisionDialog: React.FC<CarePlanRevisionDialogProps> = ({
  open,
  onClose,
  onRevised,
  carePlanId,
}) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const notify = useNotify();
  const translate = useTranslate();
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState<PendingTrigger[]>([]);
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    if (saving) return;
    setComment("");
    setPending([]);
    onClose();
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const revision = await dataProvider.markCarePlanAsRevised(
        carePlanId,
        comment,
      );
      // Attach pending triggers in parallel; revision is created either way.
      const failures: string[] = [];
      await Promise.all(
        pending.map(async (p) => {
          try {
            await dataProvider.attachRevisionTrigger(
              carePlanId,
              revision.id,
              p.kind,
              p.source_id,
            );
          } catch (e) {
            failures.push(p.summary);
          }
        }),
      );
      if (failures.length === 0) {
        notify(translate("care_plan_revision.success"), { type: "success" });
      } else {
        notify(
          `Révision créée mais ${failures.length} motif(s) n'ont pas pu être attachés : ${failures.join(", ")}`,
          { type: "warning" },
        );
      }
      setComment("");
      setPending([]);
      onRevised();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`${translate("care_plan_revision.error")}: ${msg}`, {
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{translate("care_plan_revision.dialog_title")}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {translate("care_plan_revision.dialog_hint")}
        </DialogContentText>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          label={translate("care_plan_revision.comment")}
          placeholder={translate("care_plan_revision.comment_placeholder")}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={saving}
        />

        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle2" gutterBottom>
          Motifs de la révision
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Optionnel — chute, prescription, plan CNS, hospitalisation, etc.
        </Typography>
        <Box sx={{ mt: 1 }}>
          <RevisionTriggerPicker
            carePlanId={carePlanId}
            pending={pending}
            onPick={(item) => setPending((cur) => [...cur, item])}
            onRemovePending={(item) =>
              setPending((cur) =>
                cur.filter(
                  (p) => !(p.kind === item.kind && p.source_id === item.source_id),
                ),
              )
            }
            disabled={saving}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          {translate("care_plan_revision.cancel")}
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? (
            <CircularProgress size={20} />
          ) : (
            translate("care_plan_revision.confirm")
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
