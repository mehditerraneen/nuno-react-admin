import {
  Edit,
  SimpleForm,
  TextInput,
  DateInput,
  useRecordContext,
  useDataProvider,
  useNotify,
  useRefresh,
  Button,
  required,
} from "react-admin";
import { Box, Typography, Card, CardContent, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useState, useCallback } from "react";
import type { Prescription } from "../../types/prescriptions";

const FileUploadSection = () => {
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
                alignItems: "center",
              }}
            >
              <Box>
                <Typography variant="body1">{record.file_name}</Typography>
                {record.file_thumbnail && (
                  <Box sx={{ mt: 1 }}>
                    <img
                      src={record.file_thumbnail}
                      alt="Prescription thumbnail"
                      style={{ maxWidth: 200, maxHeight: 200 }}
                    />
                  </Box>
                )}
                <Button
                  label="View File"
                  onClick={() => window.open(record.file, "_blank")}
                  sx={{ mt: 1 }}
                />
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
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ textAlign: "center", py: 2 }}>
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
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export const PrescriptionEdit = () => (
  <Edit>
    <SimpleForm>
      <Typography variant="h6" gutterBottom>
        Prescription Details
      </Typography>

      <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
        <DateInput source="date" validate={required()} />
        <DateInput source="end_date" />
      </Box>

      <TextInput source="note" fullWidth multiline rows={4} />

      <FileUploadSection />
    </SimpleForm>
  </Edit>
);
