import React, { useState } from "react";
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { useTranslate } from "react-admin";
import type { Medication } from "../../types/medicationPlans";
import type { StagedChange } from "./medBoardStagedChanges";

const changeLabel = (c: StagedChange, medById: Map<number, Medication>): string => {
  const med = medById.get(c.medicationId);
  const name =
    med?.medicine_abbreviated_name ||
    med?.medicine_name ||
    `#${c.medicationId}`;
  switch (c.kind) {
    case "archive_medication":
      return `Archiver — ${name} (date de fin → ${c.dateEnded})`;
    case "update_medication": {
      const keys = Object.keys(c.patch).join(", ") || "—";
      return `Modifier — ${name} (${keys})`;
    }
    case "remove_medication":
      return `Supprimer — ${name}`;
    case "add_rule":
      return `Ajouter règle (${c.rule.schedule_kind}) — ${name}`;
    case "update_rule":
      return `Modifier règle — ${name}`;
    case "remove_rule":
      return `Supprimer règle — ${name}`;
  }
};

interface MedBoardPendingTrayProps {
  changes: StagedChange[];
  medications: Medication[];
  onDiscard: (changeId: string) => void;
  onDiscardAll: () => void;
  onApplyAll: () => void;
  isApplying?: boolean;
  disableApply?: boolean;
  applyDisabledReason?: string;
}

export const MedBoardPendingTray: React.FC<MedBoardPendingTrayProps> = ({
  changes,
  medications,
  onDiscard,
  onDiscardAll,
  onApplyAll,
  isApplying,
  disableApply,
  applyDisabledReason,
}) => {
  const translate = useTranslate();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const medById = new Map<number, Medication>();
  for (const m of medications) medById.set(m.id, m);

  const open = Boolean(anchorEl);
  const empty = changes.length === 0;

  const applyButton = (
    <Button
      size="small"
      variant="contained"
      color="success"
      startIcon={isApplying ? <CircularProgress size={14} /> : <CheckIcon />}
      onClick={() => {
        onApplyAll();
      }}
      disabled={empty || !!disableApply || isApplying}
    >
      {translate("med_board.apply_all")}
    </Button>
  );

  return (
    <>
      <Badge
        badgeContent={changes.length}
        color="warning"
        invisible={empty}
        overlap="rectangular"
      >
        <Button
          variant={empty ? "outlined" : "contained"}
          color={empty ? "inherit" : "warning"}
          size="small"
          startIcon={<PlaylistAddCheckIcon />}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          {empty
            ? translate("med_board.pending_empty")
            : translate("med_board.pending_some", { count: changes.length })}
        </Button>
      </Badge>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 380, maxHeight: 480 } } }}
      >
        <Box sx={{ p: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {empty
                ? translate("med_board.pending_empty")
                : translate("med_board.pending_some", { count: changes.length })}
            </Typography>
            <IconButton size="small" onClick={() => setAnchorEl(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          {empty ? (
            <Typography variant="caption" color="text.secondary">
              {translate("med_board.pending_hint")}
            </Typography>
          ) : (
            <Stack spacing={0.5} sx={{ maxHeight: 320, overflow: "auto", mb: 1 }}>
              {changes.map((c) => (
                <Box
                  key={c.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 0.5,
                    borderBottom: "1px solid",
                    borderBottomColor: "divider",
                  }}
                >
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {changeLabel(c, medById)}
                  </Typography>
                  <IconButton size="small" onClick={() => onDiscard(c.id)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}

          <Divider sx={{ my: 1 }} />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              size="small"
              startIcon={<DeleteSweepIcon />}
              onClick={onDiscardAll}
              disabled={empty}
              color="inherit"
            >
              {translate("med_board.discard_all")}
            </Button>
            {applyDisabledReason && disableApply ? (
              <Tooltip title={applyDisabledReason}>
                <span>{applyButton}</span>
              </Tooltip>
            ) : (
              applyButton
            )}
          </Stack>
        </Box>
      </Popover>
    </>
  );
};

export default MedBoardPendingTray;
