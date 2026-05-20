import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { useDataProvider, type Identifier } from "react-admin";

import type { MyDataProvider } from "../../dataProvider";

interface RevisionDiffPanelProps {
  carePlanId: Identifier;
  revisionId: number;
  /** Optional override of the comparison target. If omitted the
   *  backend picks the previous revision automatically. */
  against?: number;
}

interface DiffPayload {
  revision_id: number;
  revised_on: string | null;
  against_revision_id: number | null;
  against_revised_on: string | null;
  against_has_snapshot: boolean;
  details: {
    added: Array<Record<string, unknown>>;
    removed: Array<Record<string, unknown>>;
    changed: Array<{ name: string; changes: Record<string, unknown> }>;
  };
  objectives: {
    added: Array<{ id: number; title: string }>;
    removed: Array<{ id: number; title: string }>;
    changed: Array<{
      id: number;
      title: string;
      changes: Record<string, { before: unknown; after: unknown }>;
    }>;
  };
}

const fmtDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("fr-FR");
};

const fmtValue = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

const FIELD_LABELS_FR: Record<string, string> = {
  time_start: "Heure de début",
  time_end: "Heure de fin",
  care_actions: "Actions à prévoir",
  occurrences: "Occurrences",
  care_items: "Prestations",
  actions: "Actions personnalisées",
  responsible_role: "Responsable",
  objective_ids: "Objectifs liés",
  title: "Titre",
  priority: "Priorité",
  status: "Statut",
  target_date: "Échéance",
  description: "Description",
};

const renderFieldDiff = (field: string, change: unknown): React.ReactNode => {
  const label = FIELD_LABELS_FR[field] ?? field;
  // Most fields come back as { before, after }
  if (
    change &&
    typeof change === "object" &&
    "before" in change &&
    "after" in change
  ) {
    const c = change as { before: unknown; after: unknown };
    return (
      <Typography variant="caption" component="div">
        <strong>{label} :</strong>{" "}
        <span style={{ textDecoration: "line-through", color: "#888" }}>
          {fmtValue(c.before)}
        </span>{" "}
        → <strong>{fmtValue(c.after)}</strong>
      </Typography>
    );
  }
  // care_items / occurrences / actions come back as { added, removed, ... }
  if (change && typeof change === "object") {
    const c = change as Record<string, unknown>;
    const bits: string[] = [];
    const added = (c.added as unknown[]) ?? [];
    const removed = (c.removed as unknown[]) ?? [];
    const qty = (c.quantity_changed as unknown[]) ?? [];
    if (Array.isArray(removed) && removed.length)
      bits.push(`−${removed.length}`);
    if (Array.isArray(added) && added.length) bits.push(`+${added.length}`);
    if (Array.isArray(qty) && qty.length) bits.push(`qté ×${qty.length}`);
    return (
      <Typography variant="caption" component="div">
        <strong>{label} :</strong> {bits.length ? bits.join(", ") : "modifié"}
      </Typography>
    );
  }
  return null;
};

export const RevisionDiffPanel = ({
  carePlanId,
  revisionId,
  against,
}: RevisionDiffPanelProps) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const [data, setData] = useState<DiffPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    dataProvider
      .getCarePlanRevisionDiff(carePlanId, revisionId, against)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [carePlanId, revisionId, against, dataProvider]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
        <CircularProgress size={14} />
        <Typography variant="caption" color="text.secondary">
          Calcul des changements…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 1 }}>
        {error}
      </Alert>
    );
  }

  if (!data) return null;

  const totalChanges =
    data.details.added.length +
    data.details.removed.length +
    data.details.changed.length +
    data.objectives.added.length +
    data.objectives.removed.length +
    data.objectives.changed.length;

  if (data.against_revision_id === null) {
    return (
      <Alert
        severity="info"
        icon={<CompareArrowsIcon fontSize="inherit" />}
        sx={{ mt: 1 }}
      >
        Première révision — aucune révision antérieure pour comparer.
      </Alert>
    );
  }

  if (!data.against_has_snapshot) {
    return (
      <Alert
        severity="warning"
        icon={<CompareArrowsIcon fontSize="inherit" />}
        sx={{ mt: 1 }}
      >
        La révision précédente ({fmtDate(data.against_revised_on)}) n'a pas de
        snapshot enregistré (révision antérieure à la mise en place du suivi).
        Comparaison impossible.
      </Alert>
    );
  }

  if (totalChanges === 0) {
    return (
      <Alert
        severity="success"
        icon={<CompareArrowsIcon fontSize="inherit" />}
        sx={{ mt: 1 }}
      >
        Aucun changement détecté depuis la révision du{" "}
        {fmtDate(data.against_revised_on)}.
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        mt: 1,
        p: 1.5,
        border: "1px solid",
        borderColor: "info.light",
        borderRadius: 1,
        backgroundColor: "background.default",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <CompareArrowsIcon fontSize="small" color="info" />
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {totalChanges} changement{totalChanges > 1 ? "s" : ""} depuis la
          révision du {fmtDate(data.against_revised_on)}
        </Typography>
      </Box>

      {/* Objectives diff */}
      {(data.objectives.added.length > 0 ||
        data.objectives.removed.length > 0 ||
        data.objectives.changed.length > 0) && (
        <Box sx={{ mb: 1 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: "text.secondary" }}
          >
            🎯 Objectifs
          </Typography>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ flexWrap: "wrap", gap: 0.5, mt: 0.25 }}
          >
            {data.objectives.added.map((o) => (
              <Chip
                key={`added-${o.id}`}
                label={`+ ${o.title}`}
                size="small"
                color="success"
                variant="filled"
                sx={{ height: 22, fontSize: 11 }}
              />
            ))}
            {data.objectives.removed.map((o) => (
              <Chip
                key={`removed-${o.id}`}
                label={`− ${o.title}`}
                size="small"
                color="error"
                variant="filled"
                sx={{ height: 22, fontSize: 11 }}
              />
            ))}
            {data.objectives.changed.map((o) => {
              const fields = Object.keys(o.changes)
                .map((f) => FIELD_LABELS_FR[f] ?? f)
                .join(", ");
              return (
                <Chip
                  key={`changed-${o.id}`}
                  label={`~ ${o.title} (${fields})`}
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ height: 22, fontSize: 11 }}
                />
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Details diff */}
      {(data.details.added.length > 0 ||
        data.details.removed.length > 0 ||
        data.details.changed.length > 0) && (
        <Box>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: "text.secondary" }}
          >
            🩺 Détails
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 0.25 }}>
            {data.details.added.map((d) => (
              <Typography
                key={`a-${d.id}`}
                variant="caption"
                sx={{ color: "success.main" }}
              >
                + Ajouté : <strong>{String(d.name)}</strong>
              </Typography>
            ))}
            {data.details.removed.map((d) => (
              <Typography
                key={`r-${d.id}`}
                variant="caption"
                sx={{ color: "error.main" }}
              >
                − Supprimé : <strong>{String(d.name)}</strong>
              </Typography>
            ))}
            {data.details.changed.map((d, i) => (
              <Box
                key={`c-${i}-${d.name}`}
                sx={{
                  pl: 1,
                  borderLeft: "2px solid",
                  borderLeftColor: "warning.main",
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  ~ {d.name}
                </Typography>
                {Object.entries(d.changes).map(([field, change]) => (
                  <Box key={field} sx={{ pl: 1 }}>
                    {renderFieldDiff(field, change)}
                  </Box>
                ))}
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};
