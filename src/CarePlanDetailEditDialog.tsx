import React, { useState, useEffect } from "react";
import {
  SimpleForm,
  TextInput,
  ReferenceArrayInput,
  CheckboxGroupInput, // Added for occurrences
  // SelectArrayInput, // No longer used
  ArrayInput,
  SimpleFormIterator,
  ReferenceInput,
  SelectInput,
  NumberInput,
  useDataProvider,
  useNotify,
  useTranslate,
  Identifier,
} from "react-admin";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { useFormState } from "react-hook-form";
import {
  type MyDataProvider,
  type CarePlanDetail,
  type CarePlanDetailUpdatePayload,
  type LongTermCareItem, // Added for typing choice in SelectInput
} from "./dataProvider";
import { type FieldValues, useWatch } from "react-hook-form";
import {
  formatTimeFieldsInFormData,
  formatDurationDisplay,
} from "./utils/timeUtils";
import { EnhancedTimeInput } from "./components/ReactAdminTimeInput";
import { SmartTimeInput } from "./components/SmartTimeInput";
import { SmartOccurrenceInput } from "./components/SmartOccurrenceInput";
import { LiveDurationCalculator } from "./components/LiveDurationCalculator";
import { TabbedCareFormLayout } from "./components/TabbedCareFormLayout";

// Interface for the structure of long_term_care_items from the form
interface FormLongTermCareItem {
  long_term_care_item_id: Identifier;
  quantity: number;
}

interface FormAction {
  action_text?: string;
  duration_minutes?: number | string | null;
  order?: number;
}

/**
 * Small relay component rendered inside the SimpleForm — gives the
 * dialog access to react-hook-form state (isDirty + the dirty fields
 * map + the live values) so the Save button can be enabled only when
 * there's actually something to save, and the change-preview panel
 * can render before → after for each modified field.
 */
const FormStateRelay = ({
  onState,
}: {
  onState: (state: {
    isDirty: boolean;
    dirtyFields: Record<string, unknown>;
    values: FieldValues;
  }) => void;
}) => {
  const { isDirty, dirtyFields } = useFormState();
  const values = useWatch();
  useEffect(() => {
    onState({
      isDirty,
      dirtyFields: dirtyFields as Record<string, unknown>,
      values: values as FieldValues,
    });
    // dirtyFields and values are objects we serialize as deps so
    // react picks up the change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, JSON.stringify(dirtyFields), JSON.stringify(values)]);
  return null;
};

const FIELD_LABELS_FR: Record<string, string> = {
  name: "Nom",
  time_start: "Heure de début",
  time_end: "Heure de fin",
  care_actions: "Actions à prévoir",
  params_occurrence_ids: "Occurrences",
  long_term_care_items: "Prestations",
  actions: "Actions personnalisées",
  objective_ids: "Objectifs",
  responsible_role: "Responsable",
};

const RESPONSIBLE_ROLE_LABELS_FR: Record<string, string> = {
  nurse: "Infirmier·ère",
  care_assistant: "Aide-soignant·e",
  physiotherapist: "Kinésithérapeute",
  occupational_therapist: "Ergothérapeute",
  physician: "Médecin",
  caregiver: "Aidant·es",
  patient: "Patient",
  other: "Autre",
  "": "—",
};

const formatTimeForDiff = (v: unknown): string => {
  if (!v) return "—";
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return "—";
    const h = String(v.getHours()).padStart(2, "0");
    const m = String(v.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  if (typeof v === "string") {
    // already 'HH:MM' or ISO — keep first 5 chars when looks like time
    if (/^\d{2}:\d{2}/.test(v)) return v.slice(0, 5);
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    }
  }
  return String(v);
};

const truncate = (s: string, n = 40) =>
  s.length > n ? s.slice(0, n) + "…" : s;

interface ChangeDiffProps {
  field: string;
  before: unknown;
  after: unknown;
  objectives: Array<{ id: number; title: string }>;
}

/**
 * Render a single before → after line for one dirty field. Knows
 * about the kind-specific shape of each field so the user sees a
 * meaningful summary instead of a JSON blob.
 */
const ChangeDiff = ({ field, before, after, objectives }: ChangeDiffProps) => {
  const arrow = " → ";

  let beforeStr = "—";
  let afterStr = "—";

  switch (field) {
    case "name":
    case "care_actions": {
      const b = typeof before === "string" ? before : "";
      const a = typeof after === "string" ? after : "";
      beforeStr = b ? `"${truncate(b)}"` : "—";
      afterStr = a ? `"${truncate(a)}"` : "—";
      break;
    }
    case "time_start":
    case "time_end": {
      beforeStr = formatTimeForDiff(before);
      afterStr = formatTimeForDiff(after);
      break;
    }
    case "objective_ids": {
      const titlesOf = (raw: unknown): string => {
        const ids = Array.isArray(raw)
          ? (raw
              .map((v) => Number(v))
              .filter((n) => !Number.isNaN(n)) as number[])
          : [];
        if (ids.length === 0) return "—";
        const titles = ids.map(
          (id) => objectives.find((o) => o.id === id)?.title ?? `#${id}`,
        );
        const joined = titles.join(" · ");
        return joined.length > 80 ? joined.slice(0, 80) + "…" : joined;
      };
      beforeStr = titlesOf(before);
      afterStr = titlesOf(after);
      break;
    }
    case "responsible_role": {
      const b = (typeof before === "string" ? before : "") as string;
      const a = (typeof after === "string" ? after : "") as string;
      beforeStr = RESPONSIBLE_ROLE_LABELS_FR[b] ?? b ?? "—";
      afterStr = RESPONSIBLE_ROLE_LABELS_FR[a] ?? a ?? "—";
      break;
    }
    case "params_occurrence_ids": {
      const b = Array.isArray(before) ? (before as number[]) : [];
      const a = Array.isArray(after) ? (after as number[]) : [];
      beforeStr = `${b.length} occurrence${b.length > 1 ? "s" : ""}`;
      afterStr = `${a.length} occurrence${a.length > 1 ? "s" : ""}`;
      // Annotate added/removed when the count is the same
      if (b.length === a.length) {
        const added = a.filter((id) => !b.includes(id));
        const removed = b.filter((id) => !a.includes(id));
        if (added.length || removed.length) {
          afterStr += ` (${[
            removed.length && `−${removed.length}`,
            added.length && `+${added.length}`,
          ]
            .filter(Boolean)
            .join(", ")})`;
        }
      }
      break;
    }
    case "long_term_care_items": {
      const b = Array.isArray(before)
        ? (before as Array<{
            long_term_care_item_id: number;
            quantity: number;
          }>)
        : [];
      const a = Array.isArray(after)
        ? (after as Array<{ long_term_care_item_id: number; quantity: number }>)
        : [];
      const beforeIds = new Set(b.map((i) => i?.long_term_care_item_id));
      const afterIds = new Set(a.map((i) => i?.long_term_care_item_id));
      const added = [...afterIds].filter((id) => id && !beforeIds.has(id));
      const removed = [...beforeIds].filter((id) => id && !afterIds.has(id));
      const qtyChanged = a.filter((aItem) => {
        const bItem = b.find(
          (x) => x?.long_term_care_item_id === aItem?.long_term_care_item_id,
        );
        return bItem && Number(bItem.quantity) !== Number(aItem?.quantity);
      });
      beforeStr = `${b.length} prestation${b.length > 1 ? "s" : ""}`;
      const afterParts = [`${a.length} prestation${a.length > 1 ? "s" : ""}`];
      if (added.length || removed.length || qtyChanged.length) {
        const detail = [
          removed.length && `−${removed.length}`,
          added.length && `+${added.length}`,
          qtyChanged.length && `qté ×${qtyChanged.length}`,
        ]
          .filter(Boolean)
          .join(", ");
        afterParts.push(`(${detail})`);
      }
      afterStr = afterParts.join(" ");
      break;
    }
    case "actions": {
      const b = Array.isArray(before) ? (before as unknown[]).length : 0;
      const a = Array.isArray(after) ? (after as unknown[]).length : 0;
      beforeStr = `${b} action${b > 1 ? "s" : ""}`;
      afterStr = `${a} action${a > 1 ? "s" : ""}`;
      break;
    }
    default: {
      try {
        beforeStr = before == null ? "—" : truncate(JSON.stringify(before));
        afterStr = after == null ? "—" : truncate(JSON.stringify(after));
      } catch {
        beforeStr = String(before);
        afterStr = String(after);
      }
    }
  }

  return (
    <Box
      sx={{ display: "flex", gap: 1, alignItems: "baseline", flexWrap: "wrap" }}
    >
      <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 130 }}>
        {FIELD_LABELS_FR[field] ?? field}
      </Typography>
      <Typography
        variant="caption"
        component="span"
        sx={{ color: "text.secondary", textDecoration: "line-through" }}
      >
        {beforeStr}
      </Typography>
      <Typography variant="caption" component="span" sx={{ opacity: 0.7 }}>
        {arrow}
      </Typography>
      <Typography
        variant="caption"
        component="span"
        sx={{ fontWeight: 600, color: "info.dark" }}
      >
        {afterStr}
      </Typography>
    </Box>
  );
};

interface CarePlanDetailEditDialogProps {
  open: boolean;
  onClose: () => void;
  carePlanId: Identifier;
  detailToEdit: CarePlanDetail;
  cnsCarePlanId?: Identifier;
  objectives?: import("./dataProvider").CarePlanObjective[];
}

export const CarePlanDetailEditDialog: React.FC<
  CarePlanDetailEditDialogProps
> = ({
  open,
  onClose,
  carePlanId,
  detailToEdit,
  cnsCarePlanId,
  objectives = [],
}) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const notify = useNotify();
  const translate = useTranslate();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [formStateInfo, setFormStateInfo] = useState<{
    isDirty: boolean;
    dirtyFields: Record<string, unknown>;
    values: FieldValues;
  }>({ isDirty: false, dirtyFields: {}, values: {} });

  const handleDelete = async () => {
    if (
      !window.confirm(translate("care_plan_detail.validation.delete_confirm"))
    )
      return;
    setIsDeleting(true);
    try {
      await dataProvider.deleteCarePlanDetail(carePlanId, detailToEdit.id);
      notify(translate("care_plan_detail.validation.delete_success"), {
        type: "success",
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(
        `${translate("care_plan_detail.validation.delete_error")}: ${msg}`,
        { type: "error" },
      );
    } finally {
      setIsDeleting(false);
    }
  };
  const [cnsItemIds, setCnsItemIds] = useState<number[]>([]);
  const [cnsCustomDescriptions, setCnsCustomDescriptions] = useState<
    Record<string, string>
  >({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Fetch CNS available item IDs when dialog opens
  useEffect(() => {
    if (open) {
      console.log(
        "CarePlanDetailEditDialog - CNS Care Plan ID:",
        cnsCarePlanId,
      );
      if (cnsCarePlanId) {
        dataProvider
          .getCnsAvailableItemIds(cnsCarePlanId)
          .then((ids) => {
            console.log("CNS available item IDs:", ids);
            setCnsItemIds(ids);
          })
          .catch((error) => {
            console.error("Failed to fetch CNS item IDs:", error);
            setCnsItemIds([-1]);
          });
        dataProvider
          .getCnsCarePlanDetails(cnsCarePlanId)
          .then((details) => {
            const descMap: Record<string, string> = {};
            details.forEach((d: any) => {
              if (d.item?.code && d.custom_description) {
                descMap[d.item.code] = d.custom_description;
              }
            });
            setCnsCustomDescriptions(descMap);
          })
          .catch(() => {});
      } else {
        // No CNS care plan associated, show no items (empty filter)
        console.log("No CNS care plan ID provided, hiding all items");
        setCnsItemIds([-1]); // Use -1 to ensure no items match
      }
    }
  }, [open, cnsCarePlanId, dataProvider]);

  // Transform detailToEdit for form initialization
  console.log(
    "🔍 Edit Dialog - detailToEdit:",
    JSON.stringify(detailToEdit, null, 2),
  );

  const initialValues = {
    ...detailToEdit,
    params_occurrence_ids: detailToEdit.params_occurrence.map((occ) => occ.id),
    long_term_care_items: detailToEdit.longtermcareitemquantity_set.map(
      (itemQty) => ({
        long_term_care_item_id: itemQty.long_term_care_item.id,
        quantity: itemQty.quantity,
      }),
    ),
    actions: (detailToEdit.actions ?? []).map((a, idx) => ({
      action_text: a.action_text,
      duration_minutes: a.duration_minutes,
      order: a.order ?? idx,
    })),
    // Convert time strings to Date objects for React Admin TimeInput
    time_start: detailToEdit.time_start
      ? (() => {
          console.log("🔄 Converting time_start:", detailToEdit.time_start);
          const [hours, minutes] = detailToEdit.time_start.split(":");
          const date = new Date();
          date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          console.log("📅 Converted time_start to Date:", date);
          return date;
        })()
      : null,
    time_end: detailToEdit.time_end
      ? (() => {
          console.log("🔄 Converting time_end:", detailToEdit.time_end);
          const [hours, minutes] = detailToEdit.time_end.split(":");
          const date = new Date();
          date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          console.log("📅 Converted time_end to Date:", date);
          return date;
        })()
      : null,
  };

  const handleSubmit = async (values: FieldValues) => {
    setIsSaving(true);
    setValidationErrors({}); // Clear previous errors

    // Validate required fields before submission
    const missingFields: string[] = [];
    if (!values.name?.trim()) missingFields.push("name");
    if (!values.time_start) missingFields.push("time_start");
    if (!values.time_end) missingFields.push("time_end");
    if (!values.care_actions?.trim()) missingFields.push("care_actions");

    if (missingFields.length > 0) {
      const errors: Record<string, string> = {};
      missingFields.forEach((field) => {
        errors[field] = translate("care_plan_detail.validation.required", {
          field: field.replace("_", " "),
        });
      });
      setValidationErrors(errors);
      notify(
        translate("care_plan_detail.validation.fill_required", {
          fields: missingFields.join(", "),
        }),
        { type: "error" },
      );
      setIsSaving(false);
      return;
    }

    // Format time fields before sending to API with extra defensive logic
    const formattedValues = formatTimeFieldsInFormData(values, [
      "time_start",
      "time_end",
    ]);

    // Double-check time formatting with additional defensive code
    if (
      formattedValues.time_start &&
      typeof formattedValues.time_start === "string" &&
      formattedValues.time_start.includes("T")
    ) {
      const date = new Date(formattedValues.time_start);
      formattedValues.time_start = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
      console.log(
        "🔧 Additional time_start formatting applied:",
        formattedValues.time_start,
      );
    }

    if (
      formattedValues.time_end &&
      typeof formattedValues.time_end === "string" &&
      formattedValues.time_end.includes("T")
    ) {
      const date = new Date(formattedValues.time_end);
      formattedValues.time_end = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
      console.log(
        "🔧 Additional time_end formatting applied:",
        formattedValues.time_end,
      );
    }

    const payload: CarePlanDetailUpdatePayload = {
      name: formattedValues.name,
      params_occurrence_ids: formattedValues.params_occurrence_ids,
      time_start: formattedValues.time_start, // Properly formatted HH:MM
      time_end: formattedValues.time_end, // Properly formatted HH:MM
      long_term_care_items: formattedValues.long_term_care_items
        .filter(
          (item: FormLongTermCareItem) => item.long_term_care_item_id != null,
        )
        .map((item: FormLongTermCareItem) => ({
          long_term_care_item_id: item.long_term_care_item_id,
          quantity: item.quantity || 1,
        })),
      care_actions: formattedValues.care_actions,
      objective_ids: Array.isArray(formattedValues.objective_ids)
        ? formattedValues.objective_ids
            .filter((v: unknown) => v != null && v !== "")
            .map((v: unknown) => Number(v))
        : [],
      responsible_role: formattedValues.responsible_role || "",
      actions: (formattedValues.actions ?? [])
        .filter((a: FormAction) => a && a.action_text && a.action_text.trim())
        .map((a: FormAction, idx: number) => {
          const raw = a.duration_minutes;
          const n = typeof raw === "number" ? raw : Number(raw);
          return {
            action_text: (a.action_text ?? "").trim(),
            duration_minutes: Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0,
            order: a.order ?? idx,
          };
        }),
    };

    try {
      await dataProvider.updateCarePlanDetail(
        carePlanId,
        detailToEdit.id,
        payload,
      );
      notify(translate("care_plan_detail.validation.update_success"), {
        type: "success",
      });
      onClose(); // Parent component will handle refresh
    } catch (error: unknown) {
      console.error("Error updating care plan detail:", error);

      // Handle validation errors from the API
      if (error instanceof Error && error.message.includes("validation")) {
        try {
          const errorData = JSON.parse(error.message.split("validation: ")[1]);
          const parsedErrors: Record<string, string> = {};

          Object.keys(errorData).forEach((field) => {
            if (Array.isArray(errorData[field])) {
              parsedErrors[field] = errorData[field][0];
            } else {
              parsedErrors[field] = errorData[field];
            }
          });

          setValidationErrors(parsedErrors);
          notify(translate("care_plan_detail.validation.fix_errors"), {
            type: "error",
          });
        } catch {
          notify(`Error: ${error.message}`, { type: "error" });
        }
      } else {
        let errorMessage = translate(
          "care_plan_detail.validation.update_error",
        );
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        notify(`Error: ${errorMessage}`, { type: "error" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // List of field keys that react-hook-form flagged as dirty.
  // dirtyFields is a hierarchical object — for arrays it returns an
  // array of partial dirty maps; we treat any truthy value as 'this
  // field changed'.
  const dirtyFieldKeys = Object.entries(formStateInfo.dirtyFields)
    .filter(([, v]) => {
      if (v === false || v === undefined || v === null) return false;
      if (Array.isArray(v)) return v.some((entry) => !!entry);
      return true;
    })
    .map(([k]) => k);

  const validationErrorEntries = Object.entries(validationErrors).filter(
    ([k]) => k !== "_global",
  );
  const globalError = validationErrors._global;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", pr: 1 }}>
        <Box sx={{ flexGrow: 1 }}>
          {translate("care_plan_detail.title_edit")}
        </Box>
        <Tooltip title="Fermer" arrow>
          <span>
            <IconButton
              onClick={onClose}
              disabled={isSaving || isDeleting}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </span>
        </Tooltip>
      </DialogTitle>
      <DialogContent>
        {/* Validation error summary — shown above the form when the
            backend rejects the save. */}
        {(globalError || validationErrorEntries.length > 0) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>
              {translate("care_plan_detail.validation.fix_errors")}
            </AlertTitle>
            {globalError && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                {globalError}
              </Typography>
            )}
            {validationErrorEntries.length > 0 && (
              <Stack spacing={0.5}>
                {validationErrorEntries.map(([field, msg]) => (
                  <Typography key={field} variant="body2">
                    <strong>{FIELD_LABELS_FR[field] ?? field}:</strong> {msg}
                  </Typography>
                ))}
              </Stack>
            )}
          </Alert>
        )}

        {/* Live preview of changes the user has made but not yet saved.
            Each row reads as 'Field: before → after' so the user can
            confirm exactly what's about to be persisted. */}
        {formStateInfo.isDirty && dirtyFieldKeys.length > 0 && (
          <Alert
            severity="info"
            icon={<EditNoteIcon fontSize="inherit" />}
            sx={{ mb: 2 }}
          >
            <AlertTitle>
              Modifications non enregistrées ({dirtyFieldKeys.length})
            </AlertTitle>
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {dirtyFieldKeys.map((key) => (
                <ChangeDiff
                  key={key}
                  field={key}
                  before={(initialValues as Record<string, unknown>)[key]}
                  after={formStateInfo.values[key]}
                  objectives={objectives}
                />
              ))}
            </Stack>
          </Alert>
        )}

        <SimpleForm
          onSubmit={handleSubmit}
          record={initialValues} // Pre-fill form with existing data
          toolbar={<></>} // Hide default toolbar
          id="care-plan-edit-form"
        >
          <FormStateRelay onState={setFormStateInfo} />
          {/* New Tabbed Layout */}
          <TabbedCareFormLayout
            mode="edit"
            cnsItemIds={cnsItemIds}
            cnsCustomDescriptions={cnsCustomDescriptions}
            validationErrors={validationErrors}
            objectives={objectives}
          />
        </SimpleForm>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleDelete}
          color="error"
          startIcon={
            isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />
          }
          disabled={isSaving || isDeleting}
        >
          {translate("care_plan_detail.validation.delete")}
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} disabled={isSaving || isDeleting}>
          {translate("care_plan_detail.cancel")}
        </Button>
        <Tooltip
          title={
            !formStateInfo.isDirty ? "Aucune modification à enregistrer" : ""
          }
          arrow
        >
          <span>
            <Button
              type="submit"
              form="care-plan-edit-form"
              variant="contained"
              disabled={isSaving || isDeleting || !formStateInfo.isDirty}
            >
              {isSaving ? (
                <CircularProgress size={24} />
              ) : (
                translate("care_plan_detail.save")
              )}
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
};
