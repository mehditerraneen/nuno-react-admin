import {
  Show,
  SimpleShowLayout,
  TextField,
  DateField,
  ReferenceField,
  FunctionField,
  useRecordContext,
  Button,
  useDataProvider,
  useNotify,
  useRefresh,
  useGetOne,
} from "react-admin";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Paper,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { useState, useCallback, useEffect } from "react";
import type { Prescription } from "../../types/prescriptions";

const FileSection = () => {
  const record = useRecordContext<Prescription>();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !record?.id) return;

      setUploading(true);
      try {
        await dataProvider.uploadPrescriptionFile(record.id, file);
        notify("File uploaded successfully", { type: "success" });
        refresh();
      } catch (error) {
        notify("Failed to upload file", { type: "error" });
      } finally {
        setUploading(false);
      }
    },
    [record?.id, dataProvider, notify, refresh],
  );

  const handleFileDelete = useCallback(async () => {
    if (!record?.id) return;

    if (!window.confirm("Are you sure you want to delete this file?")) return;

    try {
      await dataProvider.deletePrescriptionFile(record.id);
      notify("File deleted successfully", { type: "success" });
      refresh();
    } catch (error) {
      notify("Failed to delete file", { type: "error" });
    }
  }, [record?.id, dataProvider, notify, refresh]);

  if (!record) return null;

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Prescription File
      </Typography>

      {record.file ? (
        <Card variant="outlined">
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <AttachFileIcon color="primary" />
                  <Typography variant="body1" fontWeight="bold">
                    {record.file_name}
                  </Typography>
                </Box>

                {record.file_thumbnail && (
                  <Box sx={{ mb: 2 }}>
                    <img
                      src={record.file_thumbnail}
                      alt="Prescription thumbnail"
                      style={{
                        maxWidth: "100%",
                        maxHeight: 300,
                        borderRadius: 4,
                        border: "1px solid #e0e0e0",
                      }}
                    />
                  </Box>
                )}

                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    label="View File"
                    onClick={() => window.open(record.file, "_blank")}
                  />
                  <Button
                    label="Download"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = record.file!;
                      link.download = record.file_name || "prescription";
                      link.click();
                    }}
                  />
                </Box>

                {record.md5hash && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    MD5: {record.md5hash}
                  </Typography>
                )}
              </Box>

              <IconButton
                onClick={handleFileDelete}
                color="error"
                title="Delete file"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            No file uploaded yet
          </Typography>
          <Button
            component="label"
            label={uploading ? "Uploading..." : "Upload File"}
            startIcon={<CloudUploadIcon />}
            disabled={uploading}
            sx={{ mt: 2 }}
          >
            <input
              type="file"
              hidden
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
            />
          </Button>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
            Supported formats: PDF, JPG, JPEG, PNG
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

const PrescriptorInfo = () => {
  const record = useRecordContext<Prescription>();

  if (!record) return null;

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Prescriptor
        </Typography>
        <Typography variant="h6" gutterBottom>
          Dr. {record.prescriptor_name} {record.prescriptor_first_name}
        </Typography>
        {record.prescriptor_specialty && (
          <Chip
            label={record.prescriptor_specialty}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </CardContent>
    </Card>
  );
};

const LinkedMedicationsSection = () => {
  const record = useRecordContext<Prescription>();
  const dataProvider = useDataProvider();
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!record?.id) return;

    const fetchMedications = async () => {
      try {
        const result = await dataProvider.getPrescriptionMedications(record.id);
        setMedications(result.data || []);
      } catch (error) {
        console.error("Failed to fetch linked medications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedications();
  }, [record?.id, dataProvider]);

  if (loading) {
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Linked Medications
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  if (medications.length === 0) {
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Linked Medications
        </Typography>
        <Paper sx={{ p: 2, backgroundColor: "#f5f5f5" }}>
          <Typography variant="body2" color="text.secondary">
            No medications are currently linked to this prescription.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Linked Medications ({medications.length})
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        These medications are authorized by this prescription
      </Typography>

      {medications.map((medication: any) => (
        <Card key={medication.id} variant="outlined" sx={{ mb: 2, mt: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Patient
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {medication.patient_name}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Medication Plan
                </Typography>
                <ReferenceField
                  source="medication_plan_id"
                  reference="medication-plans"
                  record={medication}
                  link="show"
                >
                  <Chip
                    label="View Plan"
                    size="small"
                    color="primary"
                    clickable
                  />
                </ReferenceField>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Medicine
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {medication.medicine_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Dosage: {medication.dosage}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Started
                </Typography>
                <Typography variant="body2">
                  {new Date(medication.date_started).toLocaleDateString()}
                </Typography>
              </Grid>

              {medication.date_ended && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Ended
                  </Typography>
                  <Typography variant="body2">
                    {new Date(medication.date_ended).toLocaleDateString()}
                  </Typography>
                </Grid>
              )}

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Schedule
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {medication.morning && (
                    <Chip
                      label={`Morning: ${medication.morning_dose || "✓"}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {medication.noon && (
                    <Chip
                      label={`Noon: ${medication.noon_dose || "✓"}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {medication.evening && (
                    <Chip
                      label={`Evening: ${medication.evening_dose || "✓"}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {medication.night && (
                    <Chip
                      label={`Night: ${medication.night_dose || "✓"}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export const PrescriptionShow = () => (
  <Show>
    <SimpleShowLayout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Prescription Details
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="text.secondary">
            Patient
          </Typography>
          <ReferenceField source="patient_id" reference="patients" link="show">
            <FunctionField
              render={(patient: any) =>
                patient
                  ? `${patient.name} ${patient.first_name} (${patient.code_sn})`
                  : ""
              }
            />
          </ReferenceField>
        </Grid>

        <Grid item xs={12} md={6}>
          <PrescriptorInfo />
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" color="text.secondary">
            Prescription Date
          </Typography>
          <DateField source="date" />
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" color="text.secondary">
            End Date
          </Typography>
          <FunctionField
            render={(record: Prescription) =>
              record.end_date ? (
                <DateField source="end_date" record={record} />
              ) : (
                <Typography variant="body2">No end date</Typography>
              )
            }
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" color="text.secondary">
            Status
          </Typography>
          <FunctionField
            render={(record: Prescription) => {
              const today = new Date().toISOString().split("T")[0];
              const isActive = !record.end_date || record.end_date >= today;
              return (
                <Chip
                  label={isActive ? "Active" : "Expired"}
                  color={isActive ? "success" : "default"}
                  size="small"
                />
              );
            }}
          />
        </Grid>

        {useRecordContext<Prescription>()?.note && (
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">
              Notes
            </Typography>
            <Paper sx={{ p: 2, backgroundColor: "#f5f5f5" }}>
              <TextField source="note" />
            </Paper>
          </Grid>
        )}

        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="text.secondary">
            Created At
          </Typography>
          <DateField source="created_at" showTime />
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="text.secondary">
            Updated At
          </Typography>
          <DateField source="updated_at" showTime />
        </Grid>
      </Grid>

      <FileSection />

      <LinkedMedicationsSection />
    </SimpleShowLayout>
  </Show>
);
