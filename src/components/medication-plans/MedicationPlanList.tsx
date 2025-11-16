import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  SelectInput,
  ReferenceInput,
  SearchInput,
  FunctionField,
  ChipField,
} from "react-admin";
import type { MedicationPlanListItem } from "../../types/medicationPlans";

const medicationPlanFilters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <ReferenceInput key="patient" source="patient_id" reference="patients">
    <SelectInput optionText="name" />
  </ReferenceInput>,
  <SelectInput
    key="status"
    source="status"
    choices={[
      { id: "in_progress", name: "Active" },
      { id: "archived", name: "Archived" },
    ]}
  />,
];

export const MedicationPlanList = () => (
  <List filters={medicationPlanFilters} sort={{ field: "last_updated", order: "DESC" }}>
    <Datagrid rowClick="show">
      <TextField source="id" />
      <TextField source="patient_name" label="Patient" />
      <TextField source="description" />
      <DateField source="plan_start_date" label="Start Date" />
      <DateField source="plan_end_date" label="End Date" />
      <FunctionField
        label="Status"
        render={(record: MedicationPlanListItem) => (
          <ChipField
            record={record}
            source="status"
            sx={{
              backgroundColor:
                record.status === "in_progress" ? "#4caf50" : "#9e9e9e",
              color: "white",
            }}
          />
        )}
      />
      <NumberField source="medication_count" label="Medications" />
      <DateField source="last_updated" label="Last Updated" showTime />
    </Datagrid>
  </List>
);
