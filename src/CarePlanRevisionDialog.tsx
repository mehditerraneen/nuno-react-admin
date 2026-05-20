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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Identifier,
  useDataProvider,
  useNotify,
  useTranslate,
} from "react-admin";
import type {
  CarePlanObjective,
  CarePlanObjectiveOutcomeStatus,
  MyDataProvider,
} from "./dataProvider";
import { RevisionTriggerPicker } from "./components/care-plan-revision/RevisionTriggerPicker";

interface CarePlanRevisionDialogProps {
  open: boolean;
  onClose: () => void;
  onRevised: () => void;
  carePlanId: Identifier;
  objectives?: CarePlanObjective[];
}

interface PendingTrigger {
  kind: string;
  source_id: number;
  summary: string;
}

interface OutcomeDraft {
  objective_id: number;
  status: CarePlanObjectiveOutcomeStatus | "";
  note: string;
}

const OUTCOME_OPTIONS: {
  value: CarePlanObjectiveOutcomeStatus;
  label: string;
}[] = [
  { value: "achieved", label: "Atteint" },
  { value: "partially_achieved", label: "Partiellement atteint" },
  { value: "unchanged", label: "Inchangé" },
  { value: "regressed", label: "Régression" },
  { value: "abandoned", label: "Abandonné" },
];

export const CarePlanRevisionDialog: React.FC<CarePlanRevisionDialogProps> = ({
  open,
  onClose,
  onRevised,
  carePlanId,
  objectives = [],
}) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const notify = useNotify();
  const translate = useTranslate();
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState<PendingTrigger[]>([]);
  const [outcomes, setOutcomes] = useState<Record<number, OutcomeDraft>>({});
  const [saving, setSaving] = useState(false);

  const activeObjectives = objectives.filter((o) => o.status === "active");

  const setOutcomeField = (
    objectiveId: number,
    field: "status" | "note",
    value: string,
  ) => {
    setOutcomes((cur) => {
      const prev = cur[objectiveId] ?? {
        objective_id: objectiveId,
        status: "" as const,
        note: "",
      };
      return { ...cur, [objectiveId]: { ...prev, [field]: value } };
    });
  };

  const handleClose = () => {
    if (saving) return;
    setComment("");
    setPending([]);
    setOutcomes({});
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
      // Persist any per-objective outcomes the user filled in.
      const outcomePayload = Object.values(outcomes)
        .filter((o) => o.status !== "")
        .map((o) => ({
          objective_id: o.objective_id,
          status: o.status as CarePlanObjectiveOutcomeStatus,
          note: o.note,
        }));
      let outcomeFailed = false;
      if (outcomePayload.length > 0) {
        try {
          await dataProvider.upsertCarePlanRevisionOutcomes(
            carePlanId,
            revision.id,
            outcomePayload,
          );
        } catch (e) {
          outcomeFailed = true;
        }
      }

      if (failures.length === 0 && !outcomeFailed) {
        notify(translate("care_plan_revision.success"), { type: "success" });
      } else if (outcomeFailed) {
        notify(
          "Révision créée mais les résultats d'objectifs n'ont pas pu être enregistrés.",
          { type: "warning" },
        );
      } else {
        notify(
          `Révision créée mais ${failures.length} motif(s) n'ont pas pu être attachés : ${failures.join(", ")}`,
          { type: "warning" },
        );
      }
      setComment("");
      setPending([]);
      setOutcomes({});
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
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1 }}
        >
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
                  (p) =>
                    !(p.kind === item.kind && p.source_id === item.source_id),
                ),
              )
            }
            disabled={saving}
          />
        </Box>

        {activeObjectives.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" gutterBottom>
              Évaluation des objectifs
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1.5 }}
            >
              Pour chaque objectif actif : où en est-on à cette révision ?
              Laisser vide si non évalué cette fois.
            </Typography>
            <Stack spacing={1.5}>
              {activeObjectives.map((obj) => {
                const draft = outcomes[obj.id] ?? {
                  objective_id: obj.id,
                  status: "" as const,
                  note: "",
                };
                return (
                  <Box
                    key={obj.id}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      p: 1.5,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      🎯 {obj.title}
                    </Typography>
                    <Box
                      sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}
                    >
                      <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel id={`outcome-status-${obj.id}`}>
                          Statut
                        </InputLabel>
                        <Select
                          labelId={`outcome-status-${obj.id}`}
                          label="Statut"
                          value={draft.status}
                          onChange={(e) =>
                            setOutcomeField(obj.id, "status", e.target.value)
                          }
                          disabled={saving}
                        >
                          <MenuItem value="">
                            <em>— non évalué —</em>
                          </MenuItem>
                          {OUTCOME_OPTIONS.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                              {o.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        label="Commentaire"
                        value={draft.note}
                        onChange={(e) =>
                          setOutcomeField(obj.id, "note", e.target.value)
                        }
                        disabled={saving || draft.status === ""}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </>
        )}
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
