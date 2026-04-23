import React, { useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";
import {
  Identifier,
  useDataProvider,
  useNotify,
  useTranslate,
} from "react-admin";
import type { MyDataProvider } from "./dataProvider";

interface CarePlanRevisionDialogProps {
  open: boolean;
  onClose: () => void;
  onRevised: () => void;
  carePlanId: Identifier;
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
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    if (saving) return;
    setComment("");
    onClose();
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await dataProvider.markCarePlanAsRevised(carePlanId, comment);
      notify(translate("care_plan_revision.success"), { type: "success" });
      setComment("");
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
