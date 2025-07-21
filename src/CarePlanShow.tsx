import React from "react";
import {
  ArrayField,
  Datagrid,
  DateField,
  NumberField,
  ReferenceField,
  Show,
  SimpleShowLayout,
  TextField,
  useDataProvider,
  useRecordContext,
} from "react-admin";
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Button,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { useEffect, useState } from "react";
import {
  type CareOccurrence,
  type CarePlanDetail,
  type MyDataProvider,
} from "./dataProvider";
import { CarePlanDetailCreateDialog } from "./CarePlanDetailCreateDialog";
import { CarePlanDetailEditDialog } from "./CarePlanDetailEditDialog";
import {
  DurationSummary,
  CarePlanDetailsSummary,
} from "./components/DurationSummary";
import { formatDurationDisplay } from "./utils/timeUtils";

// Custom field to display package duration with daily calculation
const PackageDurationField = ({ record }: { record: any }) => {
  const weeklyPackage = record?.long_term_care_item?.weekly_package || 0;
  if (weeklyPackage === 0) {
    return <span>—</span>;
  }

  const dailyDuration = weeklyPackage / 7;
  return (
    <span>
      {formatDurationDisplay(weeklyPackage)}/week
      <br />
      <small style={{ color: "#666" }}>
        ({formatDurationDisplay(dailyDuration)}/day)
      </small>
    </span>
  );
};

// Component to fetch and display the details of a Care Plan
const CarePlanDetails = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [detailToEdit, setDetailToEdit] = React.useState<CarePlanDetail | null>(
    null,
  );
  const record = useRecordContext();
  const dataProvider = useDataProvider<MyDataProvider>();
  const [details, setDetails] = useState<CarePlanDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to manually trigger a refresh of care plan details
  const refreshDetails = () => {
    console.log("🔄 Manually refreshing care plan details...");
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (record && record.id) {
      setLoading(true);
      dataProvider
        .getCarePlanDetails(record.id)
        .then((data: CarePlanDetail[]) => {
          console.log("✅ Care plan details fetched:", data);
          setDetails(data);
          setLoading(false);
        })
        .catch((fetchError: Error) => {
          console.error("Error fetching care plan details:", fetchError);
          setError(fetchError);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [record, dataProvider, refreshTrigger]); // Added refreshTrigger to dependency array

  if (loading) return <CircularProgress />;
  if (error) {
    return <Alert severity="error">Error fetching care plan details.</Alert>;
  }

  const handleOpenCreateDialog = () => {
    setIsCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    // Refresh details when dialog closes (in case something was created)
    refreshDetails();
  };

  const handleOpenEditDialog = (detail: CarePlanDetail) => {
    setDetailToEdit(detail);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setDetailToEdit(null);
    // Refresh details when dialog closes (in case something was edited)
    refreshDetails();
  };

  return (
    <Paper
      sx={{ padding: 2, marginTop: 2 }}
      data-testid="care-plan-details-section"
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">Care Plan Details</Typography>
        <Button
          variant="contained"
          onClick={handleOpenCreateDialog}
          startIcon={<AddIcon />}
          data-testid="add-new-detail-button"
        >
          Add New Detail
        </Button>
      </Box>

      {!details || details.length === 0 ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No details found for this care plan.
          </Typography>
          <Typography
            variant="body2"
            color="primary"
            sx={{ fontWeight: "medium" }}
          >
            👆 Click "Add New Detail" above to start adding care plan details,
            occurrences, and long-term care items.
          </Typography>
        </Box>
      ) : (
        <>
          {details.map((detail) => (
            <Paper key={detail.id} sx={{ p: 2, mb: 2 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ flexGrow: 1 }}
                >
                  {detail.name}
                </Typography>
                <IconButton
                  onClick={() => handleOpenEditDialog(detail)}
                  size="small"
                >
                  <EditIcon />
                </IconButton>
              </Box>
              <Box sx={{ display: "flex", gap: 4, mb: 2 }}>
                <TextField
                  record={detail}
                  source="time_start"
                  label="Start Time"
                />
                <TextField record={detail} source="time_end" label="End Time" />
              </Box>
              <TextField
                record={detail}
                source="care_actions"
                label="Care Actions"
                fullWidth
              />

              <Typography variant="subtitle2" sx={{ mt: 2 }}>
                Occurrences:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                {detail.params_occurrence.map((occ: CareOccurrence) => (
                  <Chip key={occ.id} label={`${occ.str_name}: ${occ.value}`} />
                ))}
              </Box>

              <Typography variant="subtitle2">Care Items:</Typography>
              <ArrayField record={detail} source="longtermcareitemquantity_set">
                <Datagrid bulkActionButtons={false} optimized>
                  <TextField
                    source="long_term_care_item.code"
                    label="Item Code"
                  />
                  <TextField
                    source="long_term_care_item.description"
                    label="Item Description"
                  />
                  <NumberField source="quantity" label="Quantity" />
                  <PackageDurationField label="Package Duration" />
                </Datagrid>
              </ArrayField>

              {/* Duration Summary for this detail */}
              <DurationSummary detail={detail} />
            </Paper>
          ))}

          {/* Overall Care Plan Duration Summary */}
          <CarePlanDetailsSummary details={details} />
        </>
      )}

      {record && (
        <CarePlanDetailCreateDialog
          open={isCreateDialogOpen}
          onClose={handleCloseCreateDialog}
          carePlanId={record.id}
          cnsCarePlanId={record.medical_care_summary_per_patient_id}
        />
      )}
      {record && detailToEdit && (
        <CarePlanDetailEditDialog
          open={isEditDialogOpen}
          onClose={handleCloseEditDialog}
          carePlanId={record.id}
          detailToEdit={detailToEdit}
          cnsCarePlanId={record.medical_care_summary_per_patient_id}
        />
      )}
    </Paper>
  );
};

export const CarePlanShow = () => (
  <Show>
    <SimpleShowLayout>
      <Typography variant="h5" gutterBottom>
        Care Plan Summary
      </Typography>
      <ReferenceField source="patient_id" reference="patients" />
      <TextField source="plan_number" />
      <DateField source="plan_start_date" />
      <DateField source="plan_end_date" />
      <DateField source="plan_decision_date" />
      <ReferenceField
        source="medical_care_summary_per_patient_id"
        reference="cnscareplans"
        label="Linked CNS Care Plan"
        emptyText="No CNS care plan linked"
      />
      <CarePlanDetails />
    </SimpleShowLayout>
  </Show>
);
