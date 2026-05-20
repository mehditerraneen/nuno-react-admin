import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  Grid,
  Alert,
  Autocomplete,
  CircularProgress,
  Link as MuiLink,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  useDataProvider,
  useNotify,
  useRefresh,
  useTranslate,
} from "react-admin";
import type { Medicine, Medication } from "../../types/medicationPlans";

interface AddMedicationDialogProps {
  open: boolean;
  onClose: () => void;
  planId: number;
  /** Patient this plan belongs to — used to load prescriptions for linking. */
  patientId?: number;
  /** Called after a medication is successfully created. Parent can use this
   *  to open the Schedule Rules dialog for the new medication. */
  onCreated?: (medication: Medication) => void;
}

interface RxOption {
  id: number;
  date?: string | null;
  end_date?: string | null;
  prescriptor_name?: string;
  prescriptor_first_name?: string;
  prescriptor?: { name?: string };
}

interface MedicationFormData {
  medicine_id: number | null;
  prescription_id: number | null;
  dosage: string;
  date_started: string;
  date_ended: string;
  remarks: string;
  morning: boolean;
  morning_dose: string;
  noon: boolean;
  noon_dose: string;
  evening: boolean;
  evening_dose: string;
  night: boolean;
  night_dose: string;
}

export const AddMedicationDialog = ({
  open,
  onClose,
  planId,
  patientId,
  onCreated,
}: AddMedicationDialogProps) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const translate = useTranslate();

  const [formData, setFormData] = useState<MedicationFormData>({
    medicine_id: null,
    prescription_id: null,
    dosage: "",
    date_started: new Date().toISOString().split("T")[0],
    date_ended: "",
    remarks: "",
    morning: false,
    morning_dose: "",
    noon: false,
    noon_dose: "",
    evening: false,
    evening_dose: "",
    night: false,
    night_dose: "",
  });

  const [medicineOptions, setMedicineOptions] = useState<Medicine[]>([]);
  const [medicineLoading, setMedicineLoading] = useState(false);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [catalogInfo, setCatalogInfo] = useState<{
    last_imported_at: string | null;
    last_imported_by: string | null;
    admin_url: string;
    total_medicines: number;
  } | null>(null);

  // Fetch the Liste Positive import metadata once when the dialog
  // opens so the user can see freshness + how to refresh it.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (dataProvider as any)
      .getMedicinesCatalogInfo()
      .then((info: typeof catalogInfo) => {
        if (!cancelled) setCatalogInfo(info);
      })
      .catch(() => {
        if (!cancelled) setCatalogInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, dataProvider]);

  // Prescriptions (patient-scoped)
  const [prescriptionOptions, setPrescriptionOptions] = useState<RxOption[]>(
    [],
  );
  const [selectedRx, setSelectedRx] = useState<RxOption | null>(null);

  useEffect(() => {
    if (!open || !patientId) {
      setPrescriptionOptions([]);
      return;
    }
    let cancelled = false;
    (dataProvider as any)
      .getPatientPrescriptions(patientId)
      .then((result: unknown) => {
        if (cancelled) return;
        const list: RxOption[] = Array.isArray(result)
          ? (result as RxOption[])
          : Array.isArray((result as { data?: unknown })?.data)
            ? (result as { data: RxOption[] }).data
            : [];
        setPrescriptionOptions(list);
      })
      .catch(() => {
        if (!cancelled) setPrescriptionOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, patientId, dataProvider]);

  const formatRxOption = (rx: RxOption): string => {
    const date = rx.date ? new Date(rx.date).toLocaleDateString() : `#${rx.id}`;
    const doctor = rx.prescriptor_name || rx.prescriptor?.name;
    return doctor
      ? translate("medication_plan_show.add.prescription_option", {
          date,
          doctor,
        })
      : translate("medication_plan_show.add.prescription_option_short", {
          date,
        });
  };

  const handleRxSelection = (rx: RxOption | null) => {
    setSelectedRx(rx);
    setFormData((prev) => ({
      ...prev,
      prescription_id: rx ? rx.id : null,
      // Default dates to prescription's date range when linking; don't
      // clobber user edits when unlinking.
      date_started: rx?.date ? rx.date.slice(0, 10) : prev.date_started,
      date_ended: rx?.end_date ? rx.end_date.slice(0, 10) : prev.date_ended,
    }));
  };

  const searchMedicines = async (query: string) => {
    if (query.length < 2) {
      setMedicineOptions([]);
      return;
    }

    setMedicineLoading(true);
    try {
      const results = await dataProvider.searchMedicines(query, 20);
      setMedicineOptions(results || []);
    } catch (error) {
      console.error("Failed to search medicines:", error);
      notify(translate("medication_plan_show.add.medicine_search_failed"), {
        type: "error",
      });
    } finally {
      setMedicineLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.medicine_id) {
      notify(translate("medication_plan_show.add.validation_medicine"), {
        type: "warning",
      });
      return;
    }

    if (!formData.dosage) {
      notify(translate("medication_plan_show.add.validation_dosage"), {
        type: "warning",
      });
      return;
    }

    if (!formData.date_started) {
      notify(translate("medication_plan_show.add.validation_start"), {
        type: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const created = (await dataProvider.addMedicationToPlan(planId, {
        medicine_id: formData.medicine_id,
        prescription_id: formData.prescription_id,
        dosage: formData.dosage,
        date_started: formData.date_started,
        date_ended: formData.date_ended || null,
        remarks: formData.remarks || null,
        morning: formData.morning,
        morning_dose: formData.morning_dose || null,
        noon: formData.noon,
        noon_dose: formData.noon_dose || null,
        evening: formData.evening,
        evening_dose: formData.evening_dose || null,
        night: formData.night,
        night_dose: formData.night_dose || null,
      })) as Medication;

      notify(translate("medication_plan_show.add.success"), {
        type: "success",
      });
      refresh();
      handleClose();
      if (onCreated && created?.id) {
        onCreated(created);
      }
    } catch (error: any) {
      notify(error.message || translate("medication_plan_show.add.failure"), {
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setFormData({
      medicine_id: null,
      prescription_id: null,
      dosage: "",
      date_started: new Date().toISOString().split("T")[0],
      date_ended: "",
      remarks: "",
      morning: false,
      morning_dose: "",
      noon: false,
      noon_dose: "",
      evening: false,
      evening_dose: "",
      night: false,
      night_dose: "",
    });
    setSelectedMedicine(null);
    setSelectedRx(null);
    setMedicineSearch("");
    setMedicineOptions([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">
            {translate("medication_plan_show.add.title")}
          </Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          {translate("medication_plan_show.add.info")}
        </Alert>

        <Grid container spacing={2}>
          {/* Prescription link (optional) */}
          <Grid size={12}>
            <Autocomplete
              fullWidth
              options={prescriptionOptions}
              getOptionLabel={formatRxOption}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              value={selectedRx}
              onChange={(_, newValue) => handleRxSelection(newValue)}
              noOptionsText={translate(
                "medication_plan_show.add.prescription_none",
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  label={translate("medication_plan_show.add.prescription")}
                  helperText={
                    <span>
                      {translate("medication_plan_show.add.prescription_hint")}{" "}
                      <MuiLink
                        href="#/prescriptions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {translate(
                          "medication_plan_show.add.prescription_manage",
                        )}
                      </MuiLink>
                    </span>
                  }
                />
              )}
            />
          </Grid>

          {/* Medicine Selection */}
          <Grid size={12}>
            <Autocomplete
              fullWidth
              options={medicineOptions}
              getOptionLabel={(option) => {
                const code = option.cns_code ? ` — ${option.cns_code}` : "";
                return `${option.abbreviated_name}${code}`;
              }}
              loading={medicineLoading}
              value={selectedMedicine}
              onChange={(_, newValue) => {
                setSelectedMedicine(newValue);
                setFormData({ ...formData, medicine_id: newValue?.id || null });
              }}
              inputValue={medicineSearch}
              onInputChange={(_, newInputValue) => {
                setMedicineSearch(newInputValue);
                searchMedicines(newInputValue);
              }}
              noOptionsText={
                medicineSearch.length < 2
                  ? translate("medication_plan_show.add.medicine_search_hint")
                  : translate("medication_plan_show.add.medicine_no_results")
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  label={`${translate("medication_plan_show.add.medicine")} *`}
                  placeholder={translate(
                    "medication_plan_show.add.medicine_search_hint",
                  )}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {medicineLoading ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            {catalogInfo && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                {catalogInfo.last_imported_at ? (
                  <>
                    Liste Positive CNS importée le{" "}
                    <strong>
                      {new Date(
                        catalogInfo.last_imported_at,
                      ).toLocaleDateString("fr-FR")}
                    </strong>
                    {catalogInfo.last_imported_by
                      ? ` par ${catalogInfo.last_imported_by}`
                      : ""}{" "}
                    · {catalogInfo.total_medicines.toLocaleString("fr-FR")}{" "}
                    médicaments
                  </>
                ) : (
                  "Liste Positive CNS jamais importée"
                )}
                {" — "}
                <MuiLink
                  href={(() => {
                    const apiUrl =
                      (import.meta.env.VITE_SIMPLE_REST_URL as
                        | string
                        | undefined) || "";
                    const base = apiUrl.replace(/\/fast\/?$/, "");
                    return `${base}${catalogInfo.admin_url}`;
                  })()}
                  target="_blank"
                  rel="noopener"
                  underline="hover"
                >
                  gérer / importer
                </MuiLink>
              </Typography>
            )}
          </Grid>

          {/* Dosage */}
          <Grid size={12}>
            <TextField
              label={`${translate("medication_plan_show.add.dosage")} *`}
              value={formData.dosage}
              onChange={(e) =>
                setFormData({ ...formData, dosage: e.target.value })
              }
              placeholder={translate(
                "medication_plan_show.add.dosage_placeholder",
              )}
              fullWidth
            />
          </Grid>

          {/* Dates */}
          <Grid size={6}>
            <TextField
              label={`${translate("medication_plan_show.add.start_date")} *`}
              type="date"
              value={formData.date_started}
              onChange={(e) =>
                setFormData({ ...formData, date_started: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label={translate("medication_plan_show.add.end_date")}
              type="date"
              value={formData.date_ended}
              onChange={(e) =>
                setFormData({ ...formData, date_ended: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>

          {/* Remarks */}
          <Grid size={12}>
            <TextField
              label={translate("medication_plan_show.add.remarks")}
              value={formData.remarks}
              onChange={(e) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
              multiline
              rows={2}
              fullWidth
            />
          </Grid>

          {/* Schedule moved to dedicated rule editor — opened
              automatically right after the medication is created. */}
          <Grid size={12}>
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                border: "1px solid",
                borderColor: "info.light",
                borderRadius: 1,
                backgroundColor: "info.lighter",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                💡 L'horaire d'administration se définit avec des{" "}
                <strong>règles de planification</strong> (parties du journée,
                heures précises, hebdomadaire, mensuel, spécifique, PRN, échelle
                glycémique). L'éditeur de règles s'ouvre automatiquement après
                la création du médicament.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {translate("medication_plan_show.add.cancel")}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || !formData.medicine_id || !formData.dosage}
        >
          {submitting
            ? translate("medication_plan_show.add.submitting")
            : translate("medication_plan_show.add.submit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
