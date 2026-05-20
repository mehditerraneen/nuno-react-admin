import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FlagIcon from "@mui/icons-material/Flag";
import { useDataProvider, useNotify, type Identifier } from "react-admin";

import type {
  CarePlanObjective,
  CarePlanObjectivePriority,
  CarePlanObjectiveStatus,
  MyDataProvider,
} from "../../dataProvider";
import { CarePlanObjectiveDialog } from "./CarePlanObjectiveDialog";

interface Props {
  carePlanId: Identifier;
  objectives: CarePlanObjective[];
  /** When true, show edit/delete buttons. */
  canEdit: boolean;
  onChanged: () => void;
}

const PRIORITY_COLOR: Record<
  CarePlanObjectivePriority,
  "error" | "warning" | "default"
> = {
  high: "error",
  medium: "warning",
  low: "default",
};

const STATUS_COLOR: Record<
  CarePlanObjectiveStatus,
  "primary" | "success" | "warning" | "default"
> = {
  active: "primary",
  achieved: "success",
  partially_achieved: "warning",
  abandoned: "default",
};

const formatDate = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR");
};

export const ObjectivesPanel = ({
  carePlanId,
  objectives,
  canEdit,
  onChanged,
}: Props) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const notify = useNotify();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CarePlanObjective | null>(null);

  const handleNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (obj: CarePlanObjective) => {
    setEditing(obj);
    setDialogOpen(true);
  };

  const handleDelete = async (obj: CarePlanObjective) => {
    if (!window.confirm(`Supprimer l'objectif "${obj.title}" ?`)) return;
    try {
      await dataProvider.deleteCarePlanObjective(carePlanId, obj.id);
      notify("Objectif supprimé", { type: "success" });
      onChanged();
    } catch (err) {
      notify(`Erreur : ${err instanceof Error ? err.message : String(err)}`, {
        type: "error",
      });
    }
  };

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FlagIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Objectifs ({objectives.length})
          </Typography>
        </Box>
        {canEdit && (
          <Button startIcon={<AddIcon />} onClick={handleNew} size="small">
            Nouvel objectif
          </Button>
        )}
      </Box>

      {objectives.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontStyle: "italic" }}
        >
          Aucun objectif défini. Les objectifs décrivent ce qu'on cherche à
          atteindre (prévenir les chutes, maintenir l'autonomie, etc.) et
          permettent d'évaluer si les actions du plan portent leurs fruits.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {objectives.map((obj) => (
            <Box
              key={obj.id}
              sx={{
                p: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {obj.title}
                    </Typography>
                    <Chip
                      label={obj.priority_label}
                      size="small"
                      color={PRIORITY_COLOR[obj.priority]}
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                    <Chip
                      label={obj.status_label}
                      size="small"
                      color={STATUS_COLOR[obj.status]}
                      variant="filled"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                    {obj.target_date && (
                      <Tooltip title="Échéance" arrow>
                        <Chip
                          label={`📅 ${formatDate(obj.target_date)}`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: 11 }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                  {obj.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}
                    >
                      {obj.description}
                    </Typography>
                  )}
                </Box>
                {canEdit && (
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title="Modifier" arrow>
                      <IconButton size="small" onClick={() => handleEdit(obj)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer" arrow>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(obj)}
                        color="error"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      <CarePlanObjectiveDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        carePlanId={carePlanId}
        initial={editing}
        onSaved={onChanged}
      />
    </Paper>
  );
};
