import {
  Show,
  TextField,
  DateField,
  NumberField,
  ReferenceField,
  BooleanField,
  useRecordContext,
  useDataProvider,
  Loading,
} from "react-admin";
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from "@mui/material";
import {
  Person,
  CalendarToday,
  Gavel,
  LocalHospital,
  Assignment,
  BarChart,
} from "@mui/icons-material";
import { useState, useEffect } from "react";
import {
  type MyDataProvider,
  type MedicalCareSummaryPerPatientDetail,
} from "./dataProvider";

const CnsCarePlanTitle = () => {
  const record = useRecordContext();
  return (
    <span>
      CNS Care Plan {record ? `#${record.plan_number}` : ""}
    </span>
  );
};

const FieldGroup = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Card variant="outlined" sx={{ height: "100%" }}>
    <CardContent>
      <Typography
        variant="subtitle1"
        fontWeight={600}
        sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
      >
        {icon}
        {title}
      </Typography>
      {children}
    </CardContent>
  </Card>
);

const LabelValue = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Box sx={{ mt: 0.25 }}>{children}</Box>
  </Box>
);

const CnsCarePlanDetailsGrid = () => {
  const record = useRecordContext();
  const dataProvider = useDataProvider<MyDataProvider>();
  const [details, setDetails] = useState<MedicalCareSummaryPerPatientDetail[]>([]);
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
        .catch((err) => {
          console.error("Error fetching CNS care plan details:", err);
          setError(err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [record, dataProvider]);

  if (loading) return <Loading />;
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Could not fetch care plan details: {error.message}
      </Alert>
    );
  }
  if (!details || details.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No care items linked to this plan.
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography
        variant="h6"
        fontWeight={600}
        sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
      >
        <Assignment color="primary" />
        Care Plan Items ({details.length})
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "action.hover" }}>
              <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Custom Description</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                # of Care
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Periodicity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {details.map((detail, index) => (
              <TableRow
                key={index}
                sx={{ "&:nth-of-type(odd)": { backgroundColor: "action.hover" } }}
              >
                <TableCell>
                  <Chip label={detail.item?.code || "—"} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {detail.item?.description || "—"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {detail.custom_description || "—"}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={detail.number_of_care}
                    size="small"
                    color="primary"
                    variant="filled"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{detail.periodicity || "—"}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const CnsCarePlanShowContent = () => {
  const record = useRecordContext();
  if (!record) return <Loading />;

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h5" fontWeight={600}>
            Plan #{record.plan_number}
          </Typography>
          {record.level_of_needs != null && (
            <Chip
              label={`Level ${record.level_of_needs}`}
              color={
                record.level_of_needs >= 10
                  ? "error"
                  : record.level_of_needs >= 5
                    ? "warning"
                    : "success"
              }
              icon={<BarChart />}
            />
          )}
        </Box>
        <ReferenceField
          source="patient_id"
          reference="patients"
          link={false}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Person color="primary" />
            <Typography variant="h6" color="primary">
              <TextField source="name" /> <TextField source="first_name" />
            </Typography>
            <Typography variant="body2" color="text.secondary">
              (<TextField source="code_sn" />)
            </Typography>
          </Box>
        </ReferenceField>
      </Box>

      <Grid container spacing={2}>
        {/* Dates & Decision */}
        <Grid item xs={12} md={4}>
          <FieldGroup title="Decision" icon={<Gavel color="primary" />}>
            <LabelValue label="Decision Date">
              <DateField source="date_of_decision" />
            </LabelValue>
            <LabelValue label="Decision Number">
              <TextField source="decision_number" emptyText="—" />
            </LabelValue>
            <LabelValue label="Referent">
              <TextField source="referent" emptyText="—" />
            </LabelValue>
            <LabelValue label="Evaluation Date">
              <DateField source="date_of_evaluation" emptyText="—" />
            </LabelValue>
          </FieldGroup>
        </Grid>

        {/* Support Period */}
        <Grid item xs={12} md={4}>
          <FieldGroup title="Support Period" icon={<CalendarToday color="primary" />}>
            <LabelValue label="Start of Support">
              <DateField source="start_of_support" />
            </LabelValue>
            <LabelValue label="End of Support">
              <DateField source="end_of_support" emptyText="Ongoing" />
            </LabelValue>
            <LabelValue label="Notification Date">
              <DateField source="date_of_notification" emptyText="—" />
            </LabelValue>
            <LabelValue label="Notification to Provider">
              <DateField source="date_of_notification_to_provider" emptyText="—" />
            </LabelValue>
          </FieldGroup>
        </Grid>

        {/* Packages & Benefits */}
        <Grid item xs={12} md={4}>
          <FieldGroup title="Packages" icon={<LocalHospital color="primary" />}>
            <LabelValue label="Special Package">
              <TextField source="special_package" emptyText="—" />
            </LabelValue>
            <Box sx={{ display: "flex", gap: 2 }}>
              <LabelValue label="Nature Package">
                <NumberField source="nature_package" emptyText="—" />
              </LabelValue>
              <LabelValue label="Cash Package">
                <NumberField source="cash_package" emptyText="—" />
              </LabelValue>
            </Box>
            <LabelValue label="FMI Right">
              <BooleanField source="fmi_right" />
            </LabelValue>
            <LabelValue label="SN Code Aidant">
              <TextField source="sn_code_aidant" emptyText="—" />
            </LabelValue>
          </FieldGroup>
        </Grid>
      </Grid>

      {/* Plan transitions */}
      {(record.date_of_change_to_new_plan || record.date_of_start_of_plan_for_us || record.packageLevel) && (
        <>
          <Divider sx={{ my: 3 }} />
          <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {record.packageLevel != null && (
              <LabelValue label="Package Level">
                <Chip label={record.packageLevel} color="info" size="small" />
              </LabelValue>
            )}
            {record.date_of_change_to_new_plan && (
              <LabelValue label="Change to New Plan">
                <DateField source="date_of_change_to_new_plan" />
              </LabelValue>
            )}
            {record.date_of_start_of_plan_for_us && (
              <LabelValue label="Start of Plan for Us">
                <DateField source="date_of_start_of_plan_for_us" />
              </LabelValue>
            )}
            {record.request_start_date && (
              <LabelValue label="Request Period">
                <Typography variant="body2">
                  <DateField source="request_start_date" /> — <DateField source="request_end_date" />
                </Typography>
              </LabelValue>
            )}
          </Box>
        </>
      )}

      {/* Care Items Table */}
      <CnsCarePlanDetailsGrid />
    </Box>
  );
};

export const CnsCarePlanShow = () => (
  <Show title={<CnsCarePlanTitle />}>
    <CnsCarePlanShowContent />
  </Show>
);
