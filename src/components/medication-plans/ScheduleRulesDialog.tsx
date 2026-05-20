import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  Card,
  CardContent,
  Grid,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Divider,
  FormHelperText,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useDataProvider, useNotify, useRefresh, useTranslate } from "react-admin";
import type { Medication, ScheduleRule, ScheduleKind, PartOfDay } from "../../types/medicationPlans";

interface ScheduleRulesDialogProps {
  open: boolean;
  onClose: () => void;
  medication: Medication;
  planId: number;
}

interface RuleFormData {
  schedule_kind: ScheduleKind;
  dose: string;
  dose_unit: string;
  rule_order: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  notes: string;

  // Parts of day
  parts_of_day: PartOfDay[];

  // Exact times
  exact_times: string[];

  // Weekly pattern
  weekdays: number[];
  weekly_time: string;

  // Monthly pattern
  days_of_month: number[];
  monthly_time: string;

  // Specific dates
  specific_datetimes: string[];

  // PRN
  prn_condition: string;
  prn_max_doses_per_day: string;
  prn_min_interval_hours: string;
}

const SCHEDULE_KIND_OPTIONS: { value: ScheduleKind; labelKey: string; icon: string }[] = [
  { value: "parts", labelKey: "med_schedule_rules.kind.parts", icon: "🌅" },
  { value: "times", labelKey: "med_schedule_rules.kind.times", icon: "🕐" },
  { value: "weekly", labelKey: "med_schedule_rules.kind.weekly", icon: "📅" },
  { value: "monthly", labelKey: "med_schedule_rules.kind.monthly", icon: "📆" },
  { value: "specific", labelKey: "med_schedule_rules.kind.specific", icon: "📌" },
  { value: "prn", labelKey: "med_schedule_rules.kind.prn", icon: "💊" },
];

const PARTS_OF_DAY_OPTIONS: { value: PartOfDay; key: string; emoji: string }[] = [
  { value: "morning", key: "med_schedule_rules.part.morning", emoji: "🌅" },
  { value: "noon", key: "med_schedule_rules.part.noon", emoji: "☀️" },
  { value: "evening", key: "med_schedule_rules.part.evening", emoji: "🌇" },
  { value: "night", key: "med_schedule_rules.part.night", emoji: "🌙" },
];

const WEEKDAY_OPTIONS: { value: number; key: string }[] = [
  { value: 0, key: "med_schedule_rules.weekday.monday" },
  { value: 1, key: "med_schedule_rules.weekday.tuesday" },
  { value: 2, key: "med_schedule_rules.weekday.wednesday" },
  { value: 3, key: "med_schedule_rules.weekday.thursday" },
  { value: 4, key: "med_schedule_rules.weekday.friday" },
  { value: 5, key: "med_schedule_rules.weekday.saturday" },
  { value: 6, key: "med_schedule_rules.weekday.sunday" },
];

const getDefaultFormData = (medication: Medication): RuleFormData => ({
  schedule_kind: "parts",
  dose: "1",
  dose_unit: "comprimé(s)",
  rule_order: 0,
  is_active: true,
  valid_from: medication.date_started || "",
  valid_until: medication.date_ended || "",
  notes: "",
  parts_of_day: [],
  exact_times: [""],
  weekdays: [],
  weekly_time: "",
  days_of_month: [],
  monthly_time: "",
  specific_datetimes: [""],
  prn_condition: "",
  prn_max_doses_per_day: "",
  prn_min_interval_hours: "",
});

export const ScheduleRulesDialog = ({
  open,
  onClose,
  medication,
  planId,
}: ScheduleRulesDialogProps) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const translate = useTranslate();

  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<ScheduleRule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<RuleFormData>(getDefaultFormData(medication));

  useEffect(() => {
    if (open && medication.id) {
      fetchRules();
    }
  }, [open, medication.id]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const result = await dataProvider.getScheduleRules(planId, medication.id);
      setRules(result.data || []);
    } catch (error) {
      console.error("Failed to fetch schedule rules:", error);
      notify(translate("med_schedule_rules.notify.load_failed"), { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const prepareDataForSubmit = (data: RuleFormData): any => {
    const baseData = {
      schedule_kind: data.schedule_kind,
      dose: parseFloat(data.dose),
      dose_unit: data.dose_unit,
      rule_order: data.rule_order,
      is_active: data.is_active,
      valid_from: data.valid_from || null,
      valid_until: data.valid_until || null,
      notes: data.notes || null,
    };

    // Add schedule-specific fields
    switch (data.schedule_kind) {
      case "parts":
        return {
          ...baseData,
          parts_of_day: data.parts_of_day.length > 0 ? data.parts_of_day : null,
        };
      case "times":
        return {
          ...baseData,
          exact_times: data.exact_times.filter(t => t.trim() !== ""),
        };
      case "weekly":
        return {
          ...baseData,
          weekdays: data.weekdays,
          weekly_time: data.weekly_time || null,
        };
      case "monthly":
        return {
          ...baseData,
          days_of_month: data.days_of_month,
          monthly_time: data.monthly_time || null,
        };
      case "specific":
        return {
          ...baseData,
          specific_datetimes: data.specific_datetimes.filter(dt => dt.trim() !== ""),
        };
      case "prn":
        return {
          ...baseData,
          prn_condition: data.prn_condition,
          prn_max_doses_per_day: data.prn_max_doses_per_day ? parseInt(data.prn_max_doses_per_day) : null,
          prn_min_interval_hours: data.prn_min_interval_hours ? parseFloat(data.prn_min_interval_hours) : null,
        };
      default:
        return baseData;
    }
  };

  const handleCreate = async () => {
    try {
      const submitData = prepareDataForSubmit(formData);
      await dataProvider.createScheduleRule(planId, medication.id, submitData);
      notify(translate("med_schedule_rules.notify.created"), { type: "success" });
      fetchRules();
      setShowForm(false);
      resetForm();
      refresh();
    } catch (error: any) {
      notify(
        error.message || translate("med_schedule_rules.notify.create_failed"),
        { type: "error" },
      );
    }
  };

  const handleUpdate = async () => {
    if (!editingRule?.id) return;

    try {
      const submitData = prepareDataForSubmit(formData);
      await dataProvider.updateScheduleRule(planId, medication.id, editingRule.id, submitData);
      notify(translate("med_schedule_rules.notify.updated"), { type: "success" });
      fetchRules();
      setEditingRule(null);
      setShowForm(false);
      resetForm();
      refresh();
    } catch (error: any) {
      notify(
        error.message || translate("med_schedule_rules.notify.update_failed"),
        { type: "error" },
      );
    }
  };

  const handleDelete = async (ruleId: number) => {
    if (!confirm(translate("med_schedule_rules.delete_confirm"))) return;

    try {
      await dataProvider.deleteScheduleRule(planId, medication.id, ruleId);
      notify(translate("med_schedule_rules.notify.deleted"), { type: "success" });
      fetchRules();
      refresh();
    } catch (error: any) {
      notify(
        error.message || translate("med_schedule_rules.notify.delete_failed"),
        { type: "error" },
      );
    }
  };

  const resetForm = () => {
    setFormData(getDefaultFormData(medication));
  };

  const startEdit = (rule: ScheduleRule) => {
    setEditingRule(rule);
    setFormData({
      schedule_kind: rule.schedule_kind,
      dose: String(rule.dose || 1),
      dose_unit: rule.dose_unit || "comprimé(s)",
      rule_order: rule.rule_order || 0,
      is_active: rule.is_active !== false,
      valid_from: rule.valid_from || "",
      valid_until: rule.valid_until || "",
      notes: rule.notes || "",
      parts_of_day: rule.parts_of_day || [],
      exact_times: rule.exact_times || [""],
      weekdays: rule.weekdays || [],
      weekly_time: rule.weekly_time || "",
      days_of_month: rule.days_of_month || [],
      monthly_time: rule.monthly_time || "",
      specific_datetimes: rule.specific_datetimes || [""],
      prn_condition: rule.prn_condition || "",
      prn_max_doses_per_day: String(rule.prn_max_doses_per_day || ""),
      prn_min_interval_hours: String(rule.prn_min_interval_hours || ""),
    });
    setShowForm(true);
  };

  const togglePartOfDay = (part: PartOfDay) => {
    const current = formData.parts_of_day;
    if (current.includes(part)) {
      setFormData({ ...formData, parts_of_day: current.filter(p => p !== part) });
    } else {
      setFormData({ ...formData, parts_of_day: [...current, part] });
    }
  };

  const toggleWeekday = (day: number) => {
    const current = formData.weekdays;
    if (current.includes(day)) {
      setFormData({ ...formData, weekdays: current.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, weekdays: [...current, day].sort() });
    }
  };

  const addArrayItem = (field: "exact_times" | "specific_datetimes") => {
    setFormData({ ...formData, [field]: [...formData[field], ""] });
  };

  const removeArrayItem = (field: "exact_times" | "specific_datetimes", index: number) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray.length > 0 ? newArray : [""] });
  };

  const updateArrayItem = (field: "exact_times" | "specific_datetimes", index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addDayOfMonth = () => {
    const newDay = 1;
    if (!formData.days_of_month.includes(newDay)) {
      setFormData({ ...formData, days_of_month: [...formData.days_of_month, newDay].sort((a, b) => a - b) });
    }
  };

  const removeDayOfMonth = (day: number) => {
    setFormData({ ...formData, days_of_month: formData.days_of_month.filter(d => d !== day) });
  };

  const getScheduleDescription = (rule: ScheduleRule): string => {
    const doseStr = `${rule.dose} ${rule.dose_unit}`;
    const tAt = translate("med_schedule_rules.summary.at");
    const tDay = translate("med_schedule_rules.summary.day");

    switch (rule.schedule_kind) {
      case "parts": {
        const parts =
          rule.parts_of_day
            ?.map((p) => translate(`med_schedule_rules.part.${p}`))
            .join(", ") || "";
        return `${doseStr} - ${parts}`;
      }
      case "times":
        return `${doseStr} ${tAt} ${rule.exact_times?.join(", ")}`;
      case "weekly": {
        const days =
          rule.weekdays
            ?.map((d) =>
              translate(WEEKDAY_OPTIONS[d]?.key ?? "").slice(0, 3),
            )
            .join(", ") || "";
        return `${doseStr} - ${days} ${tAt} ${rule.weekly_time}`;
      }
      case "monthly": {
        const monthDays = rule.days_of_month?.join(", ") || "";
        return `${doseStr} - ${tDay} ${monthDays} ${tAt} ${rule.monthly_time}`;
      }
      case "specific": {
        const count = rule.specific_datetimes?.length || 0;
        return `${doseStr} - ${translate("med_schedule_rules.summary.n_specific", { count })}`;
      }
      case "prn":
        return `${doseStr} ${translate("med_schedule_rules.summary.prn")} - ${rule.prn_condition}`;
      default:
        return doseStr;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">
            {translate("med_schedule_rules.title", {
              name: medication.medicine_abbreviated_name,
            })}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          {translate("med_schedule_rules.info")}
        </Alert>

        {/* Existing Rules */}
        {!loading && rules.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {translate("med_schedule_rules.current", { count: rules.length })}
            </Typography>
            {rules.map((rule) => (
              <Card key={rule.id} variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="subtitle2">
                        {SCHEDULE_KIND_OPTIONS.find(o => o.value === rule.schedule_kind)?.icon}
                        {" "}
                        {new Date(rule.valid_from || "").toLocaleDateString()}
                        {" - "}
                        {rule.valid_until
                          ? new Date(rule.valid_until).toLocaleDateString()
                          : translate("med_schedule_rules.ongoing")}
                      </Typography>
                      {!rule.is_active && (
                        <Chip
                          label={translate("med_schedule_rules.inactive")}
                          size="small"
                          color="default"
                        />
                      )}
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => startEdit(rule)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(rule.id!)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {getScheduleDescription(rule)}
                  </Typography>
                  {rule.notes && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                      📝 {rule.notes}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <Box sx={{ p: 2, border: "1px solid #e0e0e0", borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              {editingRule
                ? translate("med_schedule_rules.form.edit_title")
                : translate("med_schedule_rules.form.add_title")}
            </Typography>

            {/* Common Fields */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>{translate("med_schedule_rules.form.type")}</InputLabel>
                  <Select
                    value={formData.schedule_kind}
                    onChange={(e) => setFormData({ ...formData, schedule_kind: e.target.value as ScheduleKind })}
                    label={translate("med_schedule_rules.form.type")}
                  >
                    {SCHEDULE_KIND_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.icon} {translate(opt.labelKey)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={6}>
                <TextField
                  label={translate("med_schedule_rules.form.dose")}
                  type="number"
                  value={formData.dose}
                  onChange={(e) => setFormData({ ...formData, dose: e.target.value })}
                  fullWidth
                  size="small"
                  inputProps={{ min: 0, step: 0.5 }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label={translate("med_schedule_rules.form.unit")}
                  value={formData.dose_unit}
                  onChange={(e) => setFormData({ ...formData, dose_unit: e.target.value })}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label={translate("med_schedule_rules.form.valid_from")}
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label={translate("med_schedule_rules.form.valid_until")}
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label={translate("med_schedule_rules.form.active")}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Type-Specific Fields */}
            {formData.schedule_kind === "parts" && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {translate("med_schedule_rules.form.parts_of_day")}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {PARTS_OF_DAY_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.value}
                      label={`${translate(opt.key)} ${opt.emoji}`}
                      onClick={() => togglePartOfDay(opt.value)}
                      color={formData.parts_of_day.includes(opt.value) ? "primary" : "default"}
                      variant={formData.parts_of_day.includes(opt.value) ? "filled" : "outlined"}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {formData.schedule_kind === "times" && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {translate("med_schedule_rules.form.exact_times")}
                </Typography>
                {formData.exact_times.map((time, index) => (
                  <Box key={index} sx={{ display: "flex", gap: 1, mb: 1 }}>
                    <TextField
                      value={time}
                      onChange={(e) => updateArrayItem("exact_times", index, e.target.value)}
                      placeholder={translate("med_schedule_rules.form.exact_times_placeholder")}
                      size="small"
                      fullWidth
                    />
                    <IconButton size="small" onClick={() => removeArrayItem("exact_times", index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button size="small" startIcon={<AddIcon />} onClick={() => addArrayItem("exact_times")}>
                  {translate("med_schedule_rules.form.add_time")}
                </Button>
              </Box>
            )}

            {formData.schedule_kind === "weekly" && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {translate("med_schedule_rules.form.weekdays")}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                  {WEEKDAY_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.value}
                      label={translate(opt.key)}
                      onClick={() => toggleWeekday(opt.value)}
                      color={formData.weekdays.includes(opt.value) ? "primary" : "default"}
                      variant={formData.weekdays.includes(opt.value) ? "filled" : "outlined"}
                    />
                  ))}
                </Box>
                <TextField
                  label={translate("med_schedule_rules.form.time_field")}
                  value={formData.weekly_time}
                  onChange={(e) => setFormData({ ...formData, weekly_time: e.target.value })}
                  placeholder={translate("med_schedule_rules.form.time_placeholder")}
                  size="small"
                  fullWidth
                />
              </Box>
            )}

            {formData.schedule_kind === "monthly" && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {translate("med_schedule_rules.form.days_of_month")}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                  {formData.days_of_month.map((day) => (
                    <Chip
                      key={day}
                      label={day}
                      onDelete={() => removeDayOfMonth(day)}
                      color="primary"
                    />
                  ))}
                  <Chip
                    label={translate("med_schedule_rules.form.add_day")}
                    onClick={addDayOfMonth}
                    variant="outlined"
                  />
                </Box>
                <TextField
                  label={translate("med_schedule_rules.form.time_field")}
                  value={formData.monthly_time}
                  onChange={(e) => setFormData({ ...formData, monthly_time: e.target.value })}
                  placeholder="08:00"
                  size="small"
                  fullWidth
                />
                <FormHelperText>
                  {translate("med_schedule_rules.form.days_help")}
                </FormHelperText>
              </Box>
            )}

            {formData.schedule_kind === "specific" && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {translate("med_schedule_rules.form.specific")}
                </Typography>
                {formData.specific_datetimes.map((datetime, index) => (
                  <Box key={index} sx={{ display: "flex", gap: 1, mb: 1 }}>
                    <TextField
                      value={datetime}
                      onChange={(e) => updateArrayItem("specific_datetimes", index, e.target.value)}
                      placeholder={translate("med_schedule_rules.form.specific_placeholder")}
                      size="small"
                      fullWidth
                    />
                    <IconButton size="small" onClick={() => removeArrayItem("specific_datetimes", index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button size="small" startIcon={<AddIcon />} onClick={() => addArrayItem("specific_datetimes")}>
                  {translate("med_schedule_rules.form.add_datetime")}
                </Button>
                <FormHelperText>
                  {translate("med_schedule_rules.form.specific_example")}
                </FormHelperText>
              </Box>
            )}

            {formData.schedule_kind === "prn" && (
              <Grid container spacing={2}>
                <Grid size={12}>
                  <TextField
                    label={translate("med_schedule_rules.form.condition")}
                    value={formData.prn_condition}
                    onChange={(e) => setFormData({ ...formData, prn_condition: e.target.value })}
                    placeholder={translate("med_schedule_rules.form.condition_placeholder")}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    label={translate("med_schedule_rules.form.max_per_day")}
                    type="number"
                    value={formData.prn_max_doses_per_day}
                    onChange={(e) => setFormData({ ...formData, prn_max_doses_per_day: e.target.value })}
                    fullWidth
                    size="small"
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    label={translate("med_schedule_rules.form.min_interval")}
                    type="number"
                    value={formData.prn_min_interval_hours}
                    onChange={(e) => setFormData({ ...formData, prn_min_interval_hours: e.target.value })}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0.5, step: 0.5 }}
                  />
                </Grid>
              </Grid>
            )}

            <Divider sx={{ my: 2 }} />

            <TextField
              label={translate("med_schedule_rules.form.notes")}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              multiline
              rows={2}
              fullWidth
              size="small"
            />

            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
              <Button
                variant="contained"
                onClick={editingRule ? handleUpdate : handleCreate}
              >
                {editingRule
                  ? translate("med_schedule_rules.form.update")
                  : translate("med_schedule_rules.form.create")}
              </Button>
              <Button
                onClick={() => {
                  setShowForm(false);
                  setEditingRule(null);
                  resetForm();
                }}
              >
                {translate("med_schedule_rules.cancel")}
              </Button>
            </Box>
          </Box>
        )}

        {!showForm && (
          <Button
            startIcon={<AddIcon />}
            onClick={() => setShowForm(true)}
            variant="outlined"
            fullWidth
          >
            {translate("med_schedule_rules.add_button")}
          </Button>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{translate("med_schedule_rules.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};
