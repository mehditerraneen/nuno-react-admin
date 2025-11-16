import {
  Edit,
  SimpleForm,
  TextInput,
  DateInput,
  SelectInput,
  ArrayField,
  Datagrid,
  TextField,
  DateField,
  BooleanField,
  useRecordContext,
  FunctionField,
  Button,
  ReferenceField,
} from "react-admin";
import { Box, Typography, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DescriptionIcon from "@mui/icons-material/Description";
import type { MedicationPlan, Medication } from "../../types/medicationPlans";

const MedicationsSection = () => {
  const record = useRecordContext<MedicationPlan>();

  if (!record?.medications || record.medications.length === 0) {
    return (
      <Box sx={{ mt: 2, p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          No medications in this plan yet.
        </Typography>
        <Button
          label="Add Medication"
          startIcon={<AddIcon />}
          sx={{ mt: 1 }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Medications ({record.medications.length})
      </Typography>
      <ArrayField source="medications">
        <Datagrid bulkActionButtons={false}>
          <TextField source="medicine_abbreviated_name" label="Medicine" />
          <TextField source="dosage" label="Dosage" />
          <DateField source="date_started" label="Started" />
          <DateField source="date_ended" label="Ended" />
          <FunctionField
            label="Prescription"
            render={(record: Medication) =>
              record.prescription_id ? (
                <ReferenceField
                  source="prescription_id"
                  reference="prescriptions"
                  link="show"
                  record={record}
                >
                  <Chip
                    icon={<DescriptionIcon />}
                    label="View"
                    size="small"
                    color="primary"
                    variant="outlined"
                    clickable
                  />
                </ReferenceField>
              ) : (
                <Chip label="No Rx" size="small" variant="outlined" />
              )
            }
          />
          <FunctionField
            label="Schedule"
            render={(record: Medication) => (
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {record.morning && (
                  <Chip
                    label={`Morning: ${record.morning_dose || "✓"}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
                {record.noon && (
                  <Chip
                    label={`Noon: ${record.noon_dose || "✓"}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
                {record.evening && (
                  <Chip
                    label={`Evening: ${record.evening_dose || "✓"}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
                {record.night && (
                  <Chip
                    label={`Night: ${record.night_dose || "✓"}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
            )}
          />
          <TextField source="remarks" label="Remarks" />
        </Datagrid>
      </ArrayField>
    </Box>
  );
};

export const MedicationPlanEdit = () => (
  <Edit>
    <SimpleForm>
      <Typography variant="h6" gutterBottom>
        Plan Details
      </Typography>
      <TextInput source="description" fullWidth multiline rows={3} />
      <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
        <DateInput source="plan_start_date" />
        <DateInput source="plan_end_date" />
      </Box>
      <SelectInput
        source="status"
        choices={[
          { id: "in_progress", name: "Active" },
          { id: "archived", name: "Archived" },
        ]}
      />

      <MedicationsSection />
    </SimpleForm>
  </Edit>
);
