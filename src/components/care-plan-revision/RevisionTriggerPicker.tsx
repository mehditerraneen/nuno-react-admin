import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useDataProvider, type Identifier } from "react-admin";

import type {
  CarePlanRevisionTrigger,
  CarePlanRevisionTriggerCandidate,
  CarePlanRevisionTriggerKind,
  MyDataProvider,
} from "../../dataProvider";

const KIND_ICON: Record<string, string> = {
  fall: "🦴",
  prescription: "💊",
  cns_plan: "📋",
  hospitalization: "🏥",
  wound: "🩹",
};

interface SelectedItem {
  kind: string;
  source_id: number;
  summary: string;
}

interface RevisionTriggerPickerProps {
  carePlanId: Identifier;
  /** Already-attached triggers shown as removable chips (with `id` set
   * we delete via API; otherwise we just remove from local state). */
  existing?: CarePlanRevisionTrigger[];
  /** Items the user has picked but not yet committed. */
  pending?: SelectedItem[];
  /** Called when the user picks a candidate that isn't already pending or
   * already attached. */
  onPick: (item: SelectedItem) => void;
  /** Called when the user removes an existing (committed) trigger chip. */
  onRemoveExisting?: (trigger: CarePlanRevisionTrigger) => void;
  /** Called when the user removes a pending (not-yet-saved) item. */
  onRemovePending?: (item: SelectedItem) => void;
  disabled?: boolean;
}

/**
 * Picker UI: a kind dropdown + a search-as-you-type box that lists
 * candidate source records for the selected kind. Shows already-picked
 * items as removable chips above the search row.
 */
export const RevisionTriggerPicker = ({
  carePlanId,
  existing = [],
  pending = [],
  onPick,
  onRemoveExisting,
  onRemovePending,
  disabled,
}: RevisionTriggerPickerProps) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const [kinds, setKinds] = useState<CarePlanRevisionTriggerKind[]>([]);
  const [kind, setKind] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [debouncedQ, setDebouncedQ] = useState<string>("");
  const [candidates, setCandidates] = useState<CarePlanRevisionTriggerCandidate[]>(
    [],
  );
  const [loading, setLoading] = useState(false);

  // Load kinds on mount.
  useEffect(() => {
    let cancelled = false;
    dataProvider
      .getRevisionTriggerKinds(carePlanId)
      .then((res) => {
        if (cancelled) return;
        setKinds(res);
        if (res.length && !kind) setKind(res[0].kind);
      })
      .catch(() => {
        if (!cancelled) setKinds([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carePlanId, dataProvider]);

  // Debounce the search input.
  useEffect(() => {
    const h = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(h);
  }, [q]);

  // Reload candidates whenever kind / debouncedQ changes.
  useEffect(() => {
    if (!kind) return;
    let cancelled = false;
    setLoading(true);
    dataProvider
      .searchRevisionTriggerCandidates(carePlanId, kind, debouncedQ, 25)
      .then((res) => {
        if (!cancelled) setCandidates(res);
      })
      .catch(() => {
        if (!cancelled) setCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [carePlanId, dataProvider, kind, debouncedQ]);

  // Filter out candidates already attached or pending so they can't be
  // picked twice.
  const alreadyPicked = useMemo(() => {
    const set = new Set<string>();
    existing.forEach((t) => set.add(`${t.kind}:${t.source_id}`));
    pending.forEach((p) => set.add(`${p.kind}:${p.source_id}`));
    return set;
  }, [existing, pending]);

  const filtered = useMemo(
    () =>
      candidates.filter(
        (c) => !alreadyPicked.has(`${c.kind}:${c.source_id}`),
      ),
    [candidates, alreadyPicked],
  );

  return (
    <Box>
      {(existing.length > 0 || pending.length > 0) && (
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2, gap: 1 }}>
          {existing.map((t) => (
            <Chip
              key={`x-${t.id}`}
              label={`${KIND_ICON[t.kind] || "•"} ${t.summary || t.kind_label}`}
              onDelete={
                onRemoveExisting ? () => onRemoveExisting(t) : undefined
              }
              disabled={disabled}
              size="small"
              color="primary"
              variant="filled"
            />
          ))}
          {pending.map((p) => (
            <Chip
              key={`p-${p.kind}-${p.source_id}`}
              label={`${KIND_ICON[p.kind] || "•"} ${p.summary}`}
              onDelete={onRemovePending ? () => onRemovePending(p) : undefined}
              disabled={disabled}
              size="small"
              color="default"
              variant="outlined"
            />
          ))}
        </Stack>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="stretch">
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="revision-trigger-kind-label">Type</InputLabel>
          <Select
            labelId="revision-trigger-kind-label"
            label="Type"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            disabled={disabled || kinds.length === 0}
          >
            {kinds.map((k) => (
              <MenuItem key={k.kind} value={k.kind}>
                {KIND_ICON[k.kind] ? `${KIND_ICON[k.kind]} ` : ""}
                {k.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Autocomplete<CarePlanRevisionTriggerCandidate, false, false, false>
          fullWidth
          size="small"
          options={filtered}
          loading={loading}
          disabled={disabled || !kind}
          value={null}
          inputValue={q}
          onInputChange={(_, v) => setQ(v)}
          getOptionLabel={(o) => o.summary}
          isOptionEqualToValue={(a, b) =>
            a.kind === b.kind && a.source_id === b.source_id
          }
          onChange={(_, value) => {
            if (value) {
              onPick({
                kind: value.kind,
                source_id: value.source_id,
                summary: value.summary,
              });
              // Clear query so user can pick another.
              setQ("");
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Rechercher…"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress color="inherit" size={16} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          noOptionsText={
            !kind ? "Sélectionner un type" : loading ? "Chargement…" : "Aucun résultat"
          }
        />
      </Stack>
      {kinds.length === 0 && (
        <Typography variant="caption" color="text.secondary">
          Aucun type de motif disponible.
        </Typography>
      )}
    </Box>
  );
};
