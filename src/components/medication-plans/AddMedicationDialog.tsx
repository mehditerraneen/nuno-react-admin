import { useState } from "react";
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
  Grid,
  Alert,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useDataProvider, useNotify, useRefresh } from "react-admin";
import type { Medicine } from "../../types/medicationPlans";

interface AddMedicationDialogProps {
  open: boolean;
  onClose: () => void;
  planId: number;
}

interface MedicationFormData {
  medicine_id: number | null;
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
}: AddMedicationDialogProps) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();

  const [formData, setFormData] = useState<MedicationFormData>({
    medicine_id: null,
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
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      notify("Failed to search medicines", { type: "error" });
    } finally {
      setMedicineLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.medicine_id) {
      notify("Please select a medicine", { type: "warning" });
      return;
    }

    if (!formData.dosage) {
      notify("Please enter dosage", { type: "warning" });
      return;
    }

    if (!formData.date_started) {
      notify("Please enter start date", { type: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      await dataProvider.addMedicationToPlan(planId, {
        medicine_id: formData.medicine_id,
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
      });

      notify("Medication added successfully", { type: "success" });
      refresh();
      handleClose();
    } catch (error: any) {
      notify(error.message || "Failed to add medication", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setFormData({
      medicine_id: null,
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
    setMedicineSearch("");
    setMedicineOptions([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">Add Medication</Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          Add a medication to this plan. You can define the default schedule here, and later add
          complex schedule rules for more precise timing.
        </Alert>

        <Grid container spacing={2}>
          {/* Medicine Selection */}
          <Grid item xs={12}>
            <Autocomplete
              options={medicineOptions}
              getOptionLabel={(option) =>
                `${option.abbreviated_name} - ${option.name} (${option.strength})`
              }
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
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Medicine *"
                  placeholder="Type to search..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {medicineLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* Dosage */}
          <Grid item xs={12}>
            <TextField
              label="Dosage *"
              value={formData.dosage}
              onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
              placeholder="e.g., 500mg, 2 tablets, 5ml"
              fullWidth
            />
          </Grid>

          {/* Dates */}
          <Grid item xs={6}>
            <TextField
              label="Start Date *"
              type="date"
              value={formData.date_started}
              onChange={(e) => setFormData({ ...formData, date_started: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="End Date"
              type="date"
              value={formData.date_ended}
              onChange={(e) => setFormData({ ...formData, date_ended: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>

          {/* Remarks */}
          <Grid item xs={12}>
            <TextField
              label="Remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Grid>

          {/* Schedule */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Default Schedule
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Define basic schedule here. You can add complex schedule rules after creating the medication.
            </Typography>
          </Grid>

          {/* Morning */}
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.morning}
                  onChange={(e) => setFormData({ ...formData, morning: e.target.checked })}
                />
              }
              label="Morning"
            />
            {formData.morning && (
              <TextField
                label="Dose"
                value={formData.morning_dose}
                onChange={(e) => setFormData({ ...formData, morning_dose: e.target.value })}
                size="small"
                fullWidth
                sx={{ ml: 2 }}
              />
            )}
          </Grid>

          {/* Noon */}
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.noon}
                  onChange={(e) => setFormData({ ...formData, noon: e.target.checked })}
                />
              }
              label="Noon"
            />
            {formData.noon && (
              <TextField
                label="Dose"
                value={formData.noon_dose}
                onChange={(e) => setFormData({ ...formData, noon_dose: e.target.value })}
                size="small"
                fullWidth
                sx={{ ml: 2 }}
              />
            )}
          </Grid>

          {/* Evening */}
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.evening}
                  onChange={(e) => setFormData({ ...formData, evening: e.target.checked })}
                />
              }
              label="Evening"
            />
            {formData.evening && (
              <TextField
                label="Dose"
                value={formData.evening_dose}
                onChange={(e) => setFormData({ ...formData, evening_dose: e.target.value })}
                size="small"
                fullWidth
                sx={{ ml: 2 }}
              />
            )}
          </Grid>

          {/* Night */}
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.night}
                  onChange={(e) => setFormData({ ...formData, night: e.target.checked })}
                />
              }
              label="Night"
            />
            {formData.night && (
              <TextField
                label="Dose"
                value={formData.night_dose}
                onChange={(e) => setFormData({ ...formData, night_dose: e.target.value })}
                size="small"
                fullWidth
                sx={{ ml: 2 }}
              />
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || !formData.medicine_id || !formData.dosage}
        >
          {submitting ? "Adding..." : "Add Medication"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
