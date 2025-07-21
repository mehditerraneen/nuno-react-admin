import {
  Show,
  SimpleShowLayout,
  TextField,
  DateField,
  NumberField,
  ReferenceField,
  BooleanField,
  useRecordContext,
  useDataProvider,
  Datagrid,
  Loading,
} from "react-admin";
import { Typography } from "@mui/material";
import { useState, useEffect } from "react";
import {
  type MyDataProvider,
  type MedicalCareSummaryPerPatientDetail,
} from "./dataProvider";

const CnsCarePlanTitle = () => {
  // Note: The record might not be loaded yet when title is rendered.
  // We might need to use useRecordContext or fetch the record if title needs dynamic data.
  // For now, a static title or one based on id (if available directly) is safer.
  // const record = useRecordContext();
  // return <span>CNS Care Plan {record ? `"${record.plan_number}"` : ""}</span>;
  return <span>CNS Care Plan Details</span>;
};

// Component to fetch and display the details of a CNS Care Plan
const CnsCarePlanDetailsGrid = () => {
  const record = useRecordContext();
  const dataProvider = useDataProvider<MyDataProvider>();
  const [details, setDetails] = useState<MedicalCareSummaryPerPatientDetail[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (record && record.id) {
      setLoading(true);
      dataProvider
        .getCnsCarePlanDetails(record.id)
        .then((data) => {
          setDetails(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching CNS care plan details:", error);
          setError(error);
          setLoading(false);
        });
    } else {
      // If there's no record, we're not loading and there's no data.
      setLoading(false);
    }
  }, [record, dataProvider]);

  if (loading) return <Loading />;
  if (error) {
    return (
      <Typography color="error">
        Could not fetch care plan details: {error.message}
      </Typography>
    );
  }
  if (!details || details.length === 0) {
    return null; // Don't render anything if there are no details
  }

  return (
    <>
      <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Care Plan Items
      </Typography>
      <Datagrid data={details} bulkActionButtons={false} optimized>
        <TextField source="item.code" label="Item Code" />
        <TextField source="item.description" label="Item Description" />
        <TextField source="custom_description" label="Custom Description" />
        <NumberField source="number_of_care" label="# of Care" />
        <TextField source="periodicity" label="Periodicity" />
      </Datagrid>
    </>
  );
};

export const CnsCarePlanShow = () => (
  <Show title={<CnsCarePlanTitle />}>
    <SimpleShowLayout>
      <Typography variant="h6" gutterBottom>
        Plan Details
      </Typography>
      <TextField source="plan_number" label="Plan Number" />
      <ReferenceField label="Patient" source="patient_id" reference="patients">
        <TextField source="name" />
      </ReferenceField>
      <DateField source="date_of_decision" label="Decision Date" />
      <TextField source="decision_number" label="Decision Number" />
      <NumberField source="level_of_needs" label="Level of Needs" />
      <DateField source="start_of_support" label="Support Start" />
      <DateField source="end_of_support" label="Support End" />
      <TextField source="referent" label="Referent" />
      <DateField source="date_of_evaluation" label="Evaluation Date" />
      <DateField source="date_of_notification" label="Notification Date" />
      <DateField
        source="date_of_notification_to_provider"
        label="Notification to Provider Date"
      />
      <TextField source="special_package" label="Special Package" />
      <NumberField source="nature_package" label="Nature Package" />
      <NumberField source="cash_package" label="Cash Package" />
      <BooleanField source="fmi_right" label="FMI Right" />
      <TextField source="sn_code_aidant" label="SN Code Aidant" />
      <DateField
        source="date_of_change_to_new_plan"
        label="Change to New Plan Date"
      />
      <DateField
        source="date_of_start_of_plan_for_us"
        label="Start of Plan for Us Date"
      />

      {/* Display the grid of care plan details */}
      <CnsCarePlanDetailsGrid />

      {/* Fields specific to patient-filtered view, will only show if present */}
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Request Specific Details (if applicable)
      </Typography>
      <NumberField source="packageLevel" label="Package Level (Request)" />
      <DateField source="request_start_date" label="Period Start (Request)" />
      <DateField source="request_end_date" label="Period End (Request)" />
    </SimpleShowLayout>
  </Show>
);
