import {
  Create,
  SimpleForm,
  TextInput,
  DateInput,
  SelectInput,
  ReferenceInput,
  AutocompleteInput,
  required,
} from "react-admin";
import { Box, Typography } from "@mui/material";

export const MedicationPlanCreate = () => (
  <Create redirect="show">
    <SimpleForm>
      <Typography variant="h6" gutterBottom>
        Create New Medication Plan
      </Typography>

      <ReferenceInput source="patient_id" reference="patients">
        <AutocompleteInput
          optionText={(choice) =>
            choice
              ? `${choice.name} ${choice.first_name} (${choice.code_sn})`
              : ""
          }
          validate={required()}
          fullWidth
        />
      </ReferenceInput>

      <TextInput
        source="description"
        fullWidth
        multiline
        rows={3}
        validate={required()}
      />

      <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
        <DateInput
          source="plan_start_date"
          validate={required()}
          defaultValue={new Date().toISOString().split("T")[0]}
        />
        <DateInput source="plan_end_date" />
      </Box>

      <SelectInput
        source="status"
        choices={[
          { id: "in_progress", name: "Active" },
          { id: "archived", name: "Archived" },
        ]}
        defaultValue="in_progress"
        validate={required()}
      />

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Note: After creating the plan, you can add medications from the plan
        details page.
      </Typography>
    </SimpleForm>
  </Create>
);
