import {
  Create,
  SimpleForm,
  TextInput,
  DateInput,
  ReferenceInput,
  AutocompleteInput,
  required,
  useDataProvider,
} from "react-admin";
import { Box, Typography } from "@mui/material";
import { useState, useCallback } from "react";

export const PrescriptionCreate = () => {
  const dataProvider = useDataProvider();
  const [physicians, setPhysicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const searchPhysicians = useCallback(
    async (searchText: string) => {
      if (!searchText || searchText.length < 2) {
        setPhysicians([]);
        return;
      }

      setLoading(true);
      try {
        const results = await dataProvider.searchPhysicians(searchText);
        setPhysicians(results);
      } catch (error) {
        console.error("Failed to search physicians:", error);
        setPhysicians([]);
      } finally {
        setLoading(false);
      }
    },
    [dataProvider],
  );

  return (
    <Create redirect="show">
      <SimpleForm>
        <Typography variant="h6" gutterBottom>
          Create New Prescription
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

        <AutocompleteInput
          source="prescriptor_id"
          label="Prescriptor (Physician)"
          choices={physicians}
          optionText={(choice) =>
            choice
              ? `Dr. ${choice.name} ${choice.first_name}${choice.specialty ? ` - ${choice.specialty}` : ""}`
              : ""
          }
          optionValue="id"
          filterToQuery={(searchText) => searchText}
          onInputChange={(event, value) => {
            if (value) {
              searchPhysicians(value);
            }
          }}
          validate={required()}
          isLoading={loading}
          fullWidth
          helperText="Start typing to search for a physician"
        />

        <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
          <DateInput
            source="date"
            validate={required()}
            defaultValue={new Date().toISOString().split("T")[0]}
          />
          <DateInput source="end_date" />
        </Box>

        <TextInput source="note" fullWidth multiline rows={4} />

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Note: You can upload the prescription file after creating the record.
        </Typography>
      </SimpleForm>
    </Create>
  );
};
