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
  useTranslate,
} from "react-admin";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
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
import { CarePlanPrintButton } from "./components/CarePlanPrintView";

// Custom field to display package duration with daily calculation
const PackageDurationField = () => {
  const record = useRecordContext();
  const translate = useTranslate();
  const weeklyPackage = record?.long_term_care_item?.weekly_package || 0;
  if (weeklyPackage === 0) {
    return <span>—</span>;
  }

  const dailyDuration = weeklyPackage / 7;
  return (
    <span>
      {formatDurationDisplay(weeklyPackage)}
      {translate("care_plan_show.per_week")}
      <br />
      <small style={{ color: "#666" }}>
        ({formatDurationDisplay(dailyDuration)}
        {translate("care_plan_show.per_day")})
      </small>
    </span>
  );
};

// Show custom_description from CNS Care Plan if available, otherwise generic description
const ItemDescriptionField = () => {
  const record = useRecordContext();
  const customDesc = record?.custom_description;
  const genericDesc = record?.long_term_care_item?.description;

  if (customDesc) {
    return (
      <Box>
        <Typography variant="body2">{customDesc}</Typography>
        {genericDesc && genericDesc !== customDesc && (
          <Typography variant="caption" color="text.secondary">
            {genericDesc}
          </Typography>
        )}
      </Box>
    );
  }

  return <span>{genericDesc || "—"}</span>;
};

// Component to fetch and display the details of a Care Plan
const CarePlanDetails = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [detailToEdit, setDetailToEdit] = React.useState<CarePlanDetail | null>(
    null,
  );
  const record = useRecordContext();
  const translate = useTranslate();
  const dataProvider = useDataProvider<MyDataProvider>();
  const [details, setDetails] = useState<CarePlanDetail[]>([]);
  const [patient, setPatient] = useState<any>(null);
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
          setDetails(data);
          setLoading(false);
        })
        .catch((fetchError: Error) => {
          console.error("Error fetching care plan details:", fetchError);
          setError(fetchError);
          setLoading(false);
        });
      // Fetch patient for print view
      if (record.patient_id) {
        dataProvider
          .getOne("patients", { id: record.patient_id })
          .then((res: any) => setPatient(res.data))
          .catch(() => {});
      }
    } else {
      setLoading(false);
    }
  }, [record, dataProvider, refreshTrigger]); // Added refreshTrigger to dependency array

  if (loading) return <CircularProgress />;
  if (error) {
    return (
      <Alert severity="error">
        {translate("care_plan_show.loading_error")}
      </Alert>
    );
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
        <Typography variant="h6">
          {translate("care_plan_show.details_title")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {details.length > 0 && (
            <CarePlanPrintButton record={record} patient={patient} details={details} />
          )}
          <Button
            variant="contained"
            onClick={handleOpenCreateDialog}
            startIcon={<AddIcon />}
            data-testid="add-new-detail-button"
          >
            {translate("care_plan_show.add_new_detail")}
          </Button>
        </Box>
      </Box>

      {!details || details.length === 0 ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {translate("care_plan_show.no_details")}
          </Typography>
          <Typography
            variant="body2"
            color="primary"
            sx={{ fontWeight: "medium" }}
          >
            {translate("care_plan_show.no_details_hint")}
          </Typography>
        </Box>
      ) : (
        <>
          {details.map((detail) => (
            <Paper key={detail.id} sx={{ p: 2, mb: 2, maxWidth: 800 }}>
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
                  label={translate("care_plan_show.start_time")}
                />
                <TextField
                  record={detail}
                  source="time_end"
                  label={translate("care_plan_show.end_time")}
                />
              </Box>
              <TextField
                record={detail}
                source="care_actions"
                label={translate("care_plan_show.care_actions")}
                fullWidth
              />

              <Typography variant="subtitle2" sx={{ mt: 2 }}>
                {translate("care_plan_show.occurrences")}:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                {detail.params_occurrence.map((occ: CareOccurrence) => (
                  <Chip key={occ.id} label={`${occ.str_name}: ${occ.value}`} />
                ))}
              </Box>

              <Typography variant="subtitle2">
                {translate("care_plan_show.care_items")}:
              </Typography>
              <ArrayField record={detail} source="longtermcareitemquantity_set">
                <Datagrid bulkActionButtons={false} optimized rowClick={false}>
                  <TextField
                    source="long_term_care_item.code"
                    label={translate("care_plan_show.item_code")}
                  />
                  <ItemDescriptionField
                    label={translate("care_plan_show.item_description")}
                  />
                  <NumberField
                    source="quantity"
                    label={translate("care_plan_show.quantity")}
                  />
                  <PackageDurationField
                    label={translate("care_plan_show.package_duration")}
                  />
                </Datagrid>
              </ArrayField>

              {/* Free-text actions */}
              {detail.actions && detail.actions.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2 }}>
                    {translate("care_plan_show.actions")}:
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: "#fff8e1" }}>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {translate("care_plan_show.action")}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontWeight: 600, width: 140 }}
                          >
                            {translate("care_plan_show.duration_min")}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detail.actions.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell sx={{ whiteSpace: "pre-wrap" }}>
                              {a.action_text}
                            </TableCell>
                            <TableCell align="right">
                              {a.duration_minutes}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {/* Duration Summary for this detail */}
              <DurationSummary detail={detail} />
            </Paper>
          ))}

          {/* Overall Care Plan Duration Summary */}
          <CarePlanDetailsSummary
            details={details}
            cnsCarePlanId={record?.medical_care_summary_per_patient_id}
          />
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

const CarePlanShowLayout = () => {
  const translate = useTranslate();
  return (
    <SimpleShowLayout>
      <Typography variant="h5" gutterBottom>
        {translate("care_plan_show.summary_title")}
      </Typography>
      <ReferenceField source="patient_id" reference="patients" />
      <TextField
        source="plan_number"
        label={translate("care_plan_show.plan_number")}
      />
      <DateField
        source="plan_start_date"
        label={translate("care_plan_show.plan_start_date")}
      />
      <DateField
        source="plan_end_date"
        label={translate("care_plan_show.plan_end_date")}
      />
      <DateField
        source="plan_decision_date"
        label={translate("care_plan_show.plan_decision_date")}
      />
      <ReferenceField
        source="medical_care_summary_per_patient_id"
        reference="cnscareplans"
        label={translate("care_plan_show.linked_cns")}
        emptyText={translate("care_plan_show.no_cns_linked")}
      />
      <Box
        sx={{
          display: "flex",
          gap: 4,
          mt: 1,
          mb: 1,
          p: 1.5,
          bgcolor: "grey.50",
          borderRadius: 1,
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary">
            {translate("care_plan_show.created")}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DateField source="created_on" showTime />
            <TextField source="created_by" />
          </Box>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {translate("care_plan_show.last_updated")}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DateField source="updated_on" showTime />
            <TextField source="updated_by" emptyText="—" />
          </Box>
        </Box>
      </Box>
      <CarePlanDetails />
    </SimpleShowLayout>
  );
};

export const CarePlanShow = () => (
  <Show>
    <CarePlanShowLayout />
  </Show>
);
