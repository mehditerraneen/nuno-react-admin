import React from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type {
  GlycemiaContext,
  GlycemiaDosingEntry,
  PartOfDay,
  ScheduleKind,
  ScheduleRule,
} from "../../types/medicationPlans";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const PART_OPTIONS: { value: PartOfDay; label: string }[] = [
  { value: "morning", label: "Matin" },
  { value: "noon", label: "Midi" },
  { value: "evening", label: "Soir" },
  { value: "night", label: "Nuit" },
];

const GLYCEMIA_CONTEXTS: { value: GlycemiaContext; label: string }[] = [
  { value: "any", label: "Quelconque" },
  { value: "fasting", label: "À jeun" },
  { value: "before_meal", label: "Avant repas" },
  { value: "after_meal", label: "Après repas" },
  { value: "bedtime", label: "Au coucher" },
];

const SCHEDULE_KIND_LABEL: Record<ScheduleKind, string> = {
  parts: "Parties de la journée",
  times: "Heures précises",
  weekly: "Hebdomadaire",
  monthly: "Mensuel",
  specific: "Dates spécifiques",
  prn: "Si besoin (PRN)",
  glycemia_scale: "Selon glycémie (insuline)",
};

interface MedBoardRuleEditorProps {
  rule: ScheduleRule;
  onChange: (patch: Partial<ScheduleRule>) => void;
  onDelete: () => void;
  disabled?: boolean;
}

export const MedBoardRuleEditor: React.FC<MedBoardRuleEditorProps> = ({
  rule,
  onChange,
  onDelete,
  disabled,
}) => {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 1.5,
        mb: 1.5,
        backgroundColor: rule.is_active === false ? "#fafafa" : "white",
      }}
    >
      {/* Kind + active + delete row */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={rule.schedule_kind}
            label="Type"
            onChange={(e) =>
              onChange({ schedule_kind: e.target.value as ScheduleKind })
            }
            disabled={disabled}
          >
            {(Object.keys(SCHEDULE_KIND_LABEL) as ScheduleKind[]).map((k) => (
              <MenuItem key={k} value={k}>
                {SCHEDULE_KIND_LABEL[k]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={rule.is_active !== false}
              onChange={(e) => onChange({ is_active: e.target.checked })}
              disabled={disabled}
            />
          }
          label="Actif"
        />
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Supprimer la règle">
          <span>
            <IconButton size="small" onClick={onDelete} disabled={disabled}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* Dose row (common to all except glycemia_scale which has per-entry doses) */}
      {rule.schedule_kind !== "glycemia_scale" && (
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <TextField
            size="small"
            label="Dose"
            type="number"
            value={rule.dose ?? ""}
            onChange={(e) =>
              onChange({ dose: e.target.value === "" ? 0 : Number(e.target.value) })
            }
            inputProps={{ step: 0.01, min: 0 }}
            sx={{ width: 120 }}
            disabled={disabled}
          />
          <TextField
            size="small"
            label="Unité"
            value={rule.dose_unit ?? ""}
            onChange={(e) => onChange({ dose_unit: e.target.value })}
            placeholder="comprimé(s)"
            sx={{ flexGrow: 1 }}
            disabled={disabled}
          />
        </Stack>
      )}

      {/* Kind-specific fields */}
      {rule.schedule_kind === "parts" && (
        <PartsEditor rule={rule} onChange={onChange} disabled={disabled} />
      )}
      {rule.schedule_kind === "times" && (
        <TimesEditor rule={rule} onChange={onChange} disabled={disabled} />
      )}
      {rule.schedule_kind === "weekly" && (
        <WeeklyEditor rule={rule} onChange={onChange} disabled={disabled} />
      )}
      {rule.schedule_kind === "monthly" && (
        <MonthlyEditor rule={rule} onChange={onChange} disabled={disabled} />
      )}
      {rule.schedule_kind === "specific" && (
        <SpecificEditor rule={rule} onChange={onChange} disabled={disabled} />
      )}
      {rule.schedule_kind === "prn" && (
        <PrnEditor rule={rule} onChange={onChange} disabled={disabled} />
      )}
      {rule.schedule_kind === "glycemia_scale" && (
        <GlycemiaScaleEditor rule={rule} onChange={onChange} disabled={disabled} />
      )}

      {/* Validity dates + notes */}
      <Divider sx={{ my: 1 }} />
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        <TextField
          size="small"
          type="date"
          label="Valide du"
          InputLabelProps={{ shrink: true }}
          value={rule.valid_from ?? ""}
          onChange={(e) => onChange({ valid_from: e.target.value || null })}
          disabled={disabled}
        />
        <TextField
          size="small"
          type="date"
          label="Valide au"
          InputLabelProps={{ shrink: true }}
          value={rule.valid_until ?? ""}
          onChange={(e) => onChange({ valid_until: e.target.value || null })}
          disabled={disabled}
        />
      </Stack>
      <TextField
        size="small"
        fullWidth
        multiline
        minRows={1}
        label="Notes"
        value={rule.notes ?? ""}
        onChange={(e) => onChange({ notes: e.target.value })}
        disabled={disabled}
      />
    </Box>
  );
};

// ---------- kind-specific editors ----------

const PartsEditor: React.FC<{
  rule: ScheduleRule;
  onChange: (patch: Partial<ScheduleRule>) => void;
  disabled?: boolean;
}> = ({ rule, onChange, disabled }) => {
  const selected = new Set(rule.parts_of_day ?? []);
  const toggle = (p: PartOfDay) => {
    const next = new Set(selected);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    onChange({ parts_of_day: Array.from(next) });
  };
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
      {PART_OPTIONS.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          onClick={disabled ? undefined : () => toggle(opt.value)}
          color={selected.has(opt.value) ? "primary" : "default"}
          variant={selected.has(opt.value) ? "filled" : "outlined"}
        />
      ))}
    </Stack>
  );
};

const TimesEditor: React.FC<{
  rule: ScheduleRule;
  onChange: (patch: Partial<ScheduleRule>) => void;
  disabled?: boolean;
}> = ({ rule, onChange, disabled }) => {
  const times = rule.exact_times ?? [];
  const setAt = (i: number, v: string) => {
    const next = times.slice();
    next[i] = v;
    onChange({ exact_times: next });
  };
  const remove = (i: number) => {
    onChange({ exact_times: times.filter((_, idx) => idx !== i) });
  };
  const add = () => onChange({ exact_times: [...times, "08:00"] });
  return (
    <Box>
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
        {times.map((t, i) => (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <TextField
              size="small"
              type="time"
              value={t}
              onChange={(e) => setAt(i, e.target.value)}
              disabled={disabled}
              sx={{ width: 120 }}
            />
            <IconButton size="small" onClick={() => remove(i)} disabled={disabled}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={add}
          disabled={disabled}
        >
          Heure
        </Button>
      </Stack>
    </Box>
  );
};

const WeeklyEditor: React.FC<{
  rule: ScheduleRule;
  onChange: (patch: Partial<ScheduleRule>) => void;
  disabled?: boolean;
}> = ({ rule, onChange, disabled }) => {
  const days = new Set(rule.weekdays ?? []);
  const toggle = (d: number) => {
    const next = new Set(days);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    onChange({ weekdays: Array.from(next).sort((a, b) => a - b) });
  };
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
        {WEEKDAY_LABELS.map((lbl, d) => (
          <Chip
            key={d}
            label={lbl}
            onClick={disabled ? undefined : () => toggle(d)}
            color={days.has(d) ? "primary" : "default"}
            variant={days.has(d) ? "filled" : "outlined"}
          />
        ))}
      </Stack>
      <TextField
        size="small"
        type="time"
        label="Heure"
        InputLabelProps={{ shrink: true }}
        value={rule.weekly_time ?? ""}
        onChange={(e) => onChange({ weekly_time: e.target.value || null })}
        sx={{ width: 140 }}
        disabled={disabled}
      />
    </Stack>
  );
};

const MonthlyEditor: React.FC<{
  rule: ScheduleRule;
  onChange: (patch: Partial<ScheduleRule>) => void;
  disabled?: boolean;
}> = ({ rule, onChange, disabled }) => {
  const days = new Set(rule.days_of_month ?? []);
  const toggle = (d: number) => {
    const next = new Set(days);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    onChange({ days_of_month: Array.from(next).sort((a, b) => a - b) });
  };
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <Chip
            key={d}
            label={String(d)}
            size="small"
            onClick={disabled ? undefined : () => toggle(d)}
            color={days.has(d) ? "primary" : "default"}
            variant={days.has(d) ? "filled" : "outlined"}
          />
        ))}
      </Stack>
      <TextField
        size="small"
        type="time"
        label="Heure"
        InputLabelProps={{ shrink: true }}
        value={rule.monthly_time ?? ""}
        onChange={(e) => onChange({ monthly_time: e.target.value || null })}
        sx={{ width: 140 }}
        disabled={disabled}
      />
    </Stack>
  );
};

const SpecificEditor: React.FC<{
  rule: ScheduleRule;
  onChange: (patch: Partial<ScheduleRule>) => void;
  disabled?: boolean;
}> = ({ rule, onChange, disabled }) => {
  const items = rule.specific_datetimes ?? [];
  const toInputValue = (iso: string): string => {
    // datetime-local expects "YYYY-MM-DDTHH:mm"
    if (!iso) return "";
    return iso.length >= 16 ? iso.slice(0, 16) : iso;
  };
  const setAt = (i: number, v: string) => {
    const next = items.slice();
    next[i] = v;
    onChange({ specific_datetimes: next });
  };
  const remove = (i: number) => {
    onChange({ specific_datetimes: items.filter((_, idx) => idx !== i) });
  };
  const add = () =>
    onChange({
      specific_datetimes: [
        ...items,
        new Date().toISOString().slice(0, 16),
      ],
    });
  return (
    <Stack spacing={0.5}>
      {items.map((v, i) => (
        <Stack direction="row" spacing={0.5} alignItems="center" key={i}>
          <TextField
            size="small"
            type="datetime-local"
            value={toInputValue(v)}
            onChange={(e) => setAt(i, e.target.value)}
            disabled={disabled}
          />
          <IconButton size="small" onClick={() => remove(i)} disabled={disabled}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      <Button
        size="small"
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={add}
        disabled={disabled}
        sx={{ alignSelf: "flex-start" }}
      >
        Date
      </Button>
    </Stack>
  );
};

const PrnEditor: React.FC<{
  rule: ScheduleRule;
  onChange: (patch: Partial<ScheduleRule>) => void;
  disabled?: boolean;
}> = ({ rule, onChange, disabled }) => (
  <Stack spacing={1}>
    <TextField
      size="small"
      fullWidth
      label="Condition"
      placeholder="ex. en cas de douleur"
      value={rule.prn_condition ?? ""}
      onChange={(e) => onChange({ prn_condition: e.target.value })}
      disabled={disabled}
    />
    <Stack direction="row" spacing={1}>
      <TextField
        size="small"
        type="number"
        label="Max / jour"
        value={rule.prn_max_doses_per_day ?? ""}
        onChange={(e) =>
          onChange({
            prn_max_doses_per_day:
              e.target.value === "" ? null : Number(e.target.value),
          })
        }
        inputProps={{ min: 0 }}
        sx={{ width: 140 }}
        disabled={disabled}
      />
      <TextField
        size="small"
        type="number"
        label="Intervalle min. (h)"
        value={rule.prn_min_interval_hours ?? ""}
        onChange={(e) =>
          onChange({
            prn_min_interval_hours:
              e.target.value === "" ? null : Number(e.target.value),
          })
        }
        inputProps={{ min: 0, step: 0.5 }}
        sx={{ width: 180 }}
        disabled={disabled}
      />
    </Stack>
  </Stack>
);

const GlycemiaScaleEditor: React.FC<{
  rule: ScheduleRule;
  onChange: (patch: Partial<ScheduleRule>) => void;
  disabled?: boolean;
}> = ({ rule, onChange, disabled }) => {
  const schema: GlycemiaDosingEntry[] = rule.glycemia_dosing_schema ?? [];
  const setAt = (i: number, patch: Partial<GlycemiaDosingEntry>) => {
    const next = schema.slice();
    next[i] = { ...next[i], ...patch };
    onChange({ glycemia_dosing_schema: next });
  };
  const remove = (i: number) => {
    onChange({ glycemia_dosing_schema: schema.filter((_, idx) => idx !== i) });
  };
  const add = () => {
    onChange({
      glycemia_dosing_schema: [...schema, { min: null, max: null, dose: 0 }],
    });
  };
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Contexte de mesure</InputLabel>
          <Select
            value={rule.glycemia_context ?? "any"}
            label="Contexte de mesure"
            onChange={(e) =>
              onChange({
                glycemia_context: e.target.value as GlycemiaContext,
              })
            }
            disabled={disabled}
          >
            {GLYCEMIA_CONTEXTS.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          type="number"
          label="Max. unités / 24h"
          value={rule.max_daily_units ?? ""}
          onChange={(e) =>
            onChange({
              max_daily_units:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
          inputProps={{ min: 0 }}
          sx={{ width: 160 }}
          disabled={disabled}
        />
      </Stack>

      <Typography variant="caption" color="text.secondary">
        Paliers glycémie → dose (mg/dL → unités). Laissez min ou max vide pour
        "sans borne".
      </Typography>

      {schema.map((entry, i) => (
        <Stack direction="row" spacing={1} alignItems="center" key={i}>
          <TextField
            size="small"
            type="number"
            label="min"
            value={entry.min ?? ""}
            onChange={(e) =>
              setAt(i, {
                min: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            sx={{ width: 100 }}
            disabled={disabled}
          />
          <Typography variant="body2">→</Typography>
          <TextField
            size="small"
            type="number"
            label="max"
            value={entry.max ?? ""}
            onChange={(e) =>
              setAt(i, {
                max: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            sx={{ width: 100 }}
            disabled={disabled}
          />
          <Typography variant="body2">⇒</Typography>
          <TextField
            size="small"
            type="number"
            label="Dose (U)"
            value={entry.dose}
            onChange={(e) =>
              setAt(i, { dose: Number(e.target.value) || 0 })
            }
            inputProps={{ min: 0, step: 0.5 }}
            sx={{ width: 120 }}
            disabled={disabled}
          />
          <IconButton size="small" onClick={() => remove(i)} disabled={disabled}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}

      <Button
        size="small"
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={add}
        disabled={disabled}
        sx={{ alignSelf: "flex-start" }}
      >
        Palier
      </Button>
    </Stack>
  );
};

export default MedBoardRuleEditor;
