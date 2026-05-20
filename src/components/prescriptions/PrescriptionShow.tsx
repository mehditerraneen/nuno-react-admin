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
  useTranslate,
  TopToolbar,
  EditButton,
  ListButton,
} from "react-admin";
import { WriteOnly } from "../auth/WriteOnly";
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
  const translate = useTranslate();
  const [uploading, setUploading] = useState(false);

  const fileUrl = record?.file ?? record?.file_upload ?? null;
  const fileThumb = record?.file_thumbnail ?? record?.thumbnail_img ?? null;
  const fileHash = record?.md5hash ?? record?.file_hash ?? null;
  const fileName =
    record?.file_name ??
    (fileUrl ? fileUrl.split("/").pop() ?? null : null);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !record?.id) return;

      setUploading(true);
      try {
        await dataProvider.uploadPrescriptionFile(record.id, file);
        notify(translate("prescription_show.file.upload_success"), {
          type: "success",
        });
        refresh();
      } catch (error) {
        notify(translate("prescription_show.file.upload_failed"), {
          type: "error",
        });
      } finally {
        setUploading(false);
      }
    },
    [record?.id, dataProvider, notify, refresh, translate],
  );

  const handleFileDelete = useCallback(async () => {
    if (!record?.id) return;

    if (!window.confirm(translate("prescription_show.file.delete_confirm")))
      return;

    try {
      await dataProvider.deletePrescriptionFile(record.id);
      notify(translate("prescription_show.file.delete_success"), {
        type: "success",
      });
      refresh();
    } catch (error) {
      notify(translate("prescription_show.file.delete_failed"), {
        type: "error",
      });
    }
  }, [record?.id, dataProvider, notify, refresh, translate]);

  if (!record) return null;

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        {translate("prescription_show.file.title")}
      </Typography>

      {fileUrl ? (
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
                    {fileName || translate("prescription_show.file.filename_fallback")}
                  </Typography>
                </Box>

                {fileThumb && (
                  <Box sx={{ mb: 2 }}>
                    <img
                      src={fileThumb}
                      alt={translate("prescription_show.file.title")}
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
                    label={translate("prescription_show.file.view")}
                    onClick={() => window.open(fileUrl, "_blank")}
                  />
                  <Button
                    label={translate("prescription_show.file.download")}
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = fileUrl;
                      link.download =
                        fileName ||
                        translate("prescription_show.file.filename_fallback");
                      link.click();
                    }}
                  />
                </Box>

                {fileHash && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    {translate("prescription_show.file.md5")}: {fileHash}
                  </Typography>
                )}
              </Box>

              <WriteOnly>
                <IconButton
                  onClick={handleFileDelete}
                  color="error"
                  title={translate("prescription_show.file.delete_title")}
                >
                  <DeleteIcon />
                </IconButton>
              </WriteOnly>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {translate("prescription_show.file.no_file")}
          </Typography>
          <WriteOnly>
            <Button
              component="label"
              label={
                uploading
                  ? translate("prescription_show.file.uploading")
                  : translate("prescription_show.file.upload")
              }
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
          </WriteOnly>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
            {translate("prescription_show.file.supported")}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

const PrescriptorInfo = () => {
  const record = useRecordContext<Prescription>();
  const translate = useTranslate();

  if (!record) return null;

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {translate("prescription_show.prescriptor")}
        </Typography>
        <Typography variant="h6" gutterBottom>
          {translate("prescription_show.dr_prefix")} {record.prescriptor_name}{" "}
          {record.prescriptor_first_name}
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
  const translate = useTranslate();
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
          {translate("prescription_show.linked.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {translate("prescription_show.linked.loading")}
        </Typography>
      </Box>
    );
  }

  if (medications.length === 0) {
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          {translate("prescription_show.linked.title")}
        </Typography>
        <Paper sx={{ p: 2, backgroundColor: "action.hover" }}>
          <Typography variant="body2" color="text.secondary">
            {translate("prescription_show.linked.none")}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        {translate("prescription_show.linked.title")} ({medications.length})
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {translate("prescription_show.linked.subtitle")}
      </Typography>

      {medications.map((medication: any) => (
        <Card key={medication.id} variant="outlined" sx={{ mb: 2, mt: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {translate("prescription_show.linked.patient")}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {medication.patient_name}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {translate("prescription_show.linked.medication_plan")}
                </Typography>
                <ReferenceField
                  source="medication_plan_id"
                  reference="medication-plans"
                  record={medication}
                  link="show"
                >
                  <Chip
                    label={translate("prescription_show.linked.view_plan")}
                    size="small"
                    color="primary"
                    clickable
                  />
                </ReferenceField>
              </Grid>

              <Grid size={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  {translate("prescription_show.linked.medicine")}
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {medication.medicine_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {translate("prescription_show.linked.dosage_prefix")}:{" "}
                  {medication.dosage}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {translate("prescription_show.linked.started")}
                </Typography>
                <Typography variant="body2">
                  {new Date(medication.date_started).toLocaleDateString()}
                </Typography>
              </Grid>

              {medication.date_ended && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {translate("prescription_show.linked.ended")}
                  </Typography>
                  <Typography variant="body2">
                    {new Date(medication.date_ended).toLocaleDateString()}
                  </Typography>
                </Grid>
              )}

              <Grid size={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {translate("prescription_show.linked.schedule")}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {medication.morning && (
                    <Chip
                      label={`${translate("prescription_show.linked.morning")}: ${medication.morning_dose || "✓"}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {medication.noon && (
                    <Chip
                      label={`${translate("prescription_show.linked.noon")}: ${medication.noon_dose || "✓"}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {medication.evening && (
                    <Chip
                      label={`${translate("prescription_show.linked.evening")}: ${medication.evening_dose || "✓"}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {medication.night && (
                    <Chip
                      label={`${translate("prescription_show.linked.night")}: ${medication.night_dose || "✓"}`}
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

const NotesBlock = () => {
  const record = useRecordContext<Prescription>();
  const translate = useTranslate();
  const noteText = record?.note ?? record?.notes;
  if (!noteText) return null;
  return (
    <Grid size={12}>
      <Typography variant="subtitle2" color="text.secondary">
        {translate("prescription_show.notes")}
      </Typography>
      <Paper sx={{ p: 2, backgroundColor: "action.hover" }}>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          {noteText}
        </Typography>
      </Paper>
    </Grid>
  );
};

const PrescriptionShowLayout = () => {
  const translate = useTranslate();
  return (
    <SimpleShowLayout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {translate("prescription_show.title")}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {translate("prescription_show.patient")}
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

        <Grid size={{ xs: 12, md: 6 }}>
          <PrescriptorInfo />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {translate("prescription_show.prescription_date")}
          </Typography>
          <DateField source="date" />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {translate("prescription_show.end_date")}
          </Typography>
          <FunctionField
            render={(record: Prescription) =>
              record.end_date ? (
                <DateField source="end_date" record={record} />
              ) : (
                <Typography variant="body2">
                  {translate("prescription_show.no_end_date")}
                </Typography>
              )
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {translate("prescription_show.status")}
          </Typography>
          <FunctionField
            render={(record: Prescription) => {
              const today = new Date().toISOString().split("T")[0];
              const isActive = !record.end_date || record.end_date >= today;
              return (
                <Chip
                  label={translate(
                    isActive
                      ? "prescription_show.active"
                      : "prescription_show.expired",
                  )}
                  color={isActive ? "success" : "default"}
                  size="small"
                />
              );
            }}
          />
        </Grid>

        <NotesBlock />

        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {translate("prescription_show.created_at")}
          </Typography>
          <DateField source="created_at" showTime />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {translate("prescription_show.updated_at")}
          </Typography>
          <DateField source="updated_at" showTime />
        </Grid>
      </Grid>

      <FileSection />

      <LinkedMedicationsSection />
    </SimpleShowLayout>
  );
};

const PrescriptionShowActions = () => (
  <TopToolbar>
    <ListButton />
    <WriteOnly>
      <EditButton />
    </WriteOnly>
  </TopToolbar>
);

export const PrescriptionShow = () => (
  <Show actions={<PrescriptionShowActions />}>
    <PrescriptionShowLayout />
  </Show>
);
