import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  ReferenceField,
  ReferenceInput,
  AutocompleteInput,
  DateInput,
  FunctionField,
  ShowButton,
} from "react-admin";
import { Box, Typography, Chip } from "@mui/material";

const cnsCarePlanFilters = [
  <ReferenceInput
    label="Patient"
    source="patient_id"
    reference="patients_with_cns_plan"
    alwaysOn
    key="patient_filter"
  >
    <AutocompleteInput sx={{ minWidth: 250 }} />
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

const EmptyList = () => (
  <Box textAlign="center" m={4}>
    <Typography variant="h6" paragraph color="text.secondary">
      No CNS care plans found.
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Try adjusting filters or check if records exist.
    </Typography>
  </Box>
);

export const CnsCarePlanList = () => (
  <List
    filters={cnsCarePlanFilters}
    empty={<EmptyList />}
    title="CNS Care Plans"
    perPage={25}
    sort={{ field: "date_of_decision", order: "DESC" }}
  >
    <Datagrid
      bulkActionButtons={false}
      rowClick="show"
      sx={{
        "& .RaDatagrid-headerCell": {
          fontWeight: 600,
          backgroundColor: "#f5f5f5",
        },
      }}
    >
      <ReferenceField
        label="Patient"
        source="patient_id"
        reference="patients"
        link={false}
      />
      <TextField source="plan_number" label="Plan #" />
      <FunctionField
        label="Level"
        render={(record: any) =>
          record?.level_of_needs != null ? (
            <Chip
              label={record.level_of_needs}
              size="small"
              color={
                record.level_of_needs >= 10
                  ? "error"
                  : record.level_of_needs >= 5
                    ? "warning"
                    : "success"
              }
            />
          ) : null
        }
      />
      <DateField source="start_of_support" label="Start" />
      <DateField source="end_of_support" label="End" />
      <DateField source="date_of_decision" label="Decision" />
      <TextField source="referent" label="Referent" />
      <FunctionField
        label="Period"
        render={(record: any) => {
          if (!record?.request_start_date) return null;
          const start = new Date(record.request_start_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
          const end = record.request_end_date
            ? new Date(record.request_end_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
            : "...";
          return (
            <Typography variant="caption" sx={{ whiteSpace: "nowrap" }}>
              {start} — {end}
            </Typography>
          );
        }}
      />
      <ShowButton />
    </Datagrid>
  </List>
);
