import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  ReferenceField, // Added for displaying patient name
  ReferenceInput,
  AutocompleteInput,
  DateInput,
  useListContext,
  TopToolbar,
  FilterButton,
  sanitizeListRestProps,
  FilterForm,
} from "react-admin";
import { Box, Typography } from "@mui/material";

const cnsCarePlanFilters = [
  <ReferenceInput
    label="Patient"
    source="patient_id"
    reference="patients_with_cns_plan" // Use the new virtual resource
    alwaysOn
    key="patient_filter"
  >
    {/* optionText is removed to default to the recordRepresentation */}
    <AutocompleteInput sx={{ minWidth: 200 }} />
  </ReferenceInput>,
  <DateInput
    label="Start Date"
    source="start_date"
    alwaysOn
    key="start_date_filter"
  />,
  <DateInput
    label="End Date"
    source="end_date"
    alwaysOn
    key="end_date_filter"
  />,
];

const ListActions = () => {
  // className is not directly available from useListContext for TopToolbar like this.
  // TopToolbar will inherit className if ListActions is passed a className prop by its parent.
  const { displayedFilters, ...rest } = useListContext();
  return (
    <TopToolbar {...sanitizeListRestProps(rest)}>
      {displayedFilters && <FilterForm filters={displayedFilters} />}
      <FilterButton />
    </TopToolbar>
  );
};

const EmptyList = () => (
  <Box textAlign="center" m={1}>
    <Typography variant="h6" paragraph>
      No CNS care plans found.
    </Typography>
    <Typography variant="body1">
      Try adjusting filters or check if records exist.
    </Typography>
  </Box>
);

// Changed to functional component without props for now to resolve lint warning,
// can be reverted if props are needed and type issue is resolved.
export const CnsCarePlanList = () => (
  <List
    filters={cnsCarePlanFilters}
    actions={<ListActions />}
    empty={<EmptyList />}
    title="CNS Detailed Care Plans"
    perPage={25}
  >
    <Datagrid bulkActionButtons={false} rowClick="show">
      <TextField source="plan_number" label="Plan Number" />
      <ReferenceField
        label="Patient"
        source="patient_id"
        reference="patients"
        link="show"
      >
        {/* No child, so it uses the global recordRepresentation */}
      </ReferenceField>
      <DateField source="date_of_decision" label="Decision Date" />
      <NumberField source="level_of_needs" label="Level of Needs" />
      <DateField source="start_of_support" label="Support Start" />
      <DateField source="end_of_support" label="Support End" />
      <NumberField source="packageLevel" label="Package Level" />
      <DateField source="request_start_date" label="Period Start" />
      <DateField source="request_end_date" label="Period End" />
      <TextField source="referent" label="Referent" />
      <DateField source="date_of_evaluation" label="Evaluation Date" />
      <DateField source="date_of_notification" label="Notification Date" />
    </Datagrid>
  </List>
);
