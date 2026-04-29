import { Box, Chip, Stack, Typography } from "@mui/material";
import type { CarePlanRevisionTrigger } from "../../dataProvider";

const KIND_ICON: Record<string, string> = {
  fall: "🦴",
  prescription: "💊",
  cns_plan: "📋",
  hospitalization: "🏥",
};

interface RevisionTriggerChipsProps {
  triggers: CarePlanRevisionTrigger[] | undefined;
  /** When set, also render an inline "Gérer les motifs" button. */
  onManage?: () => void;
  manageDisabled?: boolean;
}

/**
 * Compact, read-only display of the triggers attached to a revision.
 * Use inside the revisions panel to show "why" each revision happened.
 */
export const RevisionTriggerChips = ({
  triggers,
  onManage,
  manageDisabled,
}: RevisionTriggerChipsProps) => {
  const list = triggers || [];
  if (!list.length && !onManage) return null;
  return (
    <Box sx={{ mt: 0.5 }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.5 }}>
        {list.map((t) => (
          <Chip
            key={t.id}
            size="small"
            variant="outlined"
            label={`${KIND_ICON[t.kind] || "•"} ${t.summary || t.kind_label}`}
          />
        ))}
        {onManage && (
          <Chip
            size="small"
            variant="outlined"
            color="primary"
            label="+ Gérer les motifs"
            onClick={manageDisabled ? undefined : onManage}
            sx={{
              cursor: manageDisabled ? "default" : "pointer",
              opacity: manageDisabled ? 0.5 : 1,
            }}
          />
        )}
      </Stack>
      {!list.length && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          Aucun motif rattaché.
        </Typography>
      )}
    </Box>
  );
};
