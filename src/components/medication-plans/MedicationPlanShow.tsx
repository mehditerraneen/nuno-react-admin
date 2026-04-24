import {
  Show,
  SimpleShowLayout,
  TextField,
  DateField,
  FunctionField,
  useRecordContext,
  ReferenceField,
  Button,
  useRefresh,
  useNotify,
  useDataProvider,
  useTranslate,
} from "react-admin";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DescriptionIcon from "@mui/icons-material/Description";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AssignmentIcon from "@mui/icons-material/Assignment";
import type { MedicationPlan, Medication } from "../../types/medicationPlans";
import { ScheduleRulesDialog } from "./ScheduleRulesDialog";
import { AddMedicationDialog } from "./AddMedicationDialog";
import { useEffect, useState } from "react";
import { prescriptionStyle } from "./medBoardPalette";
import { groupByPrescription } from "./medBoardUtils";

const StatusChip = () => {
  const record = useRecordContext<MedicationPlan>();
  if (!record) return null;

  return (
    <Chip
      label={record.status === "in_progress" ? "Active" : "Archived"}
      color={record.status === "in_progress" ? "success" : "default"}
      sx={{ fontWeight: "bold" }}
    />
  );
};

const MedicationCard = ({
  medication,
  planId
}: {
  medication: Medication;
  planId: number;
}) => {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h6" component="div">
            {medication.medicine_abbreviated_name}
          </Typography>
          {medication.date_ended ? (
            <Chip label="Ended" size="small" color="default" />
          ) : (
            <Chip label="Active" size="small" color="success" />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {medication.medicine_name}
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2">
              <strong>Dosage:</strong> {medication.dosage}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2">
              <strong>Started:</strong>{" "}
              {new Date(medication.date_started).toLocaleDateString()}
            </Typography>
          </Grid>
          {medication.date_ended && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Ended:</strong>{" "}
                {new Date(medication.date_ended).toLocaleDateString()}
              </Typography>
            </Grid>
          )}
        </Grid>

        <Divider sx={{ my: 2 }} />

        {medication.prescription_id && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Prescription Authorization
            </Typography>
            <ReferenceField
              source="prescription_id"
              reference="prescriptions"
              link="show"
              record={medication}
            >
              <Chip
                icon={<DescriptionIcon />}
                label="View Prescription"
                size="small"
                color="primary"
                clickable
                component="a"
              />
            </ReferenceField>
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="subtitle2">
            Administration Schedule
          </Typography>
          <Button
            size="small"
            startIcon={<CalendarMonthIcon />}
            onClick={() => setScheduleDialogOpen(true)}
            variant="outlined"
          >
            Manage Schedule Rules
          </Button>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          {medication.morning && (
            <Chip
              label={`Morning: ${medication.morning_dose || "✓"}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {medication.noon && (
            <Chip
              label={`Noon: ${medication.noon_dose || "✓"}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {medication.evening && (
            <Chip
              label={`Evening: ${medication.evening_dose || "✓"}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {medication.night && (
            <Chip
              label={`Night: ${medication.night_dose || "✓"}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        {medication.remarks && (
          <Box sx={{ mt: 2, p: 1, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Remarks:</strong> {medication.remarks}
            </Typography>
          </Box>
        )}

        {medication.schedule_rules && medication.schedule_rules.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Schedule Rules ({medication.schedule_rules.length})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Valid From</TableCell>
                    <TableCell>Valid Until</TableCell>
                    <TableCell>Schedule</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {medication.schedule_rules.map((rule, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(rule.valid_from).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {rule.valid_until
                          ? new Date(rule.valid_until).toLocaleDateString()
                          : "Ongoing"}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                          {rule.morning && (
                            <Chip
                              label={`M: ${rule.morning_dose}`}
                              size="small"
                            />
                          )}
                          {rule.noon && (
                            <Chip label={`N: ${rule.noon_dose}`} size="small" />
                          )}
                          {rule.evening && (
                            <Chip
                              label={`E: ${rule.evening_dose}`}
                              size="small"
                            />
                          )}
                          {rule.night && (
                            <Chip label={`Nt: ${rule.night_dose}`} size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{rule.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </CardContent>

      <ScheduleRulesDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        medication={medication}
        planId={planId}
      />
    </Card>
  );
};

interface RawPrescription {
  id: number;
  date?: string | null;
  prescriptor_name?: string;
  prescriptor_first_name?: string;
  prescriptor?: { name?: string };
}

const PrescriptionGroupHeader: React.FC<{
  prescriptionId: number | null;
  date?: string;
  doctor?: string;
  count: number;
}> = ({ prescriptionId, date, doctor, count }) => {
  const translate = useTranslate();
  const s = prescriptionStyle(prescriptionId);
  const label =
    prescriptionId == null
      ? translate("med_board.no_prescription")
      : doctor
        ? `${translate("prescription_show.title")} · ${date ?? "—"} · ${doctor}`
        : `${translate("prescription_show.title")} · ${date ?? "—"}`;
  return (
    <Paper
      variant="outlined"
      sx={{
        mt: 3,
        mb: 1,
        p: 1.25,
        display: "flex",
        alignItems: "center",
        gap: 1,
        borderLeft: `5px solid ${s.main}`,
        backgroundColor: s.soft,
        color: s.text,
      }}
    >
      <AssignmentIcon fontSize="small" />
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, flexGrow: 1 }}
        title={label}
      >
        {label}
      </Typography>
      {prescriptionId != null && (
        <Chip
          component="a"
          clickable
          href={`#/prescriptions/${prescriptionId}/show`}
          label={`#${prescriptionId}`}
          size="small"
          sx={{
            backgroundColor: "white",
            color: s.text,
            border: `1px solid ${s.main}`,
            fontWeight: 600,
          }}
        />
      )}
      <Chip
        size="small"
        label={count}
        sx={{
          backgroundColor: "white",
          color: s.text,
          border: `1px solid ${s.main}`,
          fontWeight: 600,
        }}
      />
    </Paper>
  );
};

const MedicationsSection = () => {
  const record = useRecordContext<MedicationPlan>();
  const dataProvider = useDataProvider();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [prescriptions, setPrescriptions] = useState<RawPrescription[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!record?.patient_id) return;
    (dataProvider as any)
      .getPatientPrescriptions(record.patient_id)
      .then((result: unknown) => {
        if (cancelled) return;
        const list: RawPrescription[] = Array.isArray(result)
          ? (result as RawPrescription[])
          : Array.isArray((result as { data?: unknown })?.data)
            ? ((result as { data: RawPrescription[] }).data)
            : [];
        setPrescriptions(list);
      })
      .catch(() => {
        if (!cancelled) setPrescriptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [record?.patient_id, dataProvider]);

  if (!record?.medications || record.medications.length === 0) {
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Medications
        </Typography>
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            No medications in this plan yet.
          </Typography>
          <Button
            label="Add Medication"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            sx={{ mt: 2 }}
          />
        </Paper>

        <AddMedicationDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          planId={record.id}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">
          Medications ({record.medications.length})
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            component="a"
            href={`#/medication-plans/${record.id}/board`}
            variant="contained"
            color="primary"
          >
            Open Med Board
          </Button>
          <Button
            label="Add Medication"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          />
        </Box>
      </Box>
      {(() => {
        const rxOrder = prescriptions.map((p) => p.id);
        const prescriptionById = new Map(prescriptions.map((p) => [p.id, p]));
        const groups = groupByPrescription(record.medications, rxOrder);
        return groups.map((group) => {
          const rx =
            group.prescriptionId != null
              ? prescriptionById.get(group.prescriptionId)
              : undefined;
          const date = rx?.date
            ? new Date(rx.date).toLocaleDateString()
            : undefined;
          const doctor = rx?.prescriptor_name || rx?.prescriptor?.name;
          return (
            <Box key={group.prescriptionId ?? "none"}>
              <PrescriptionGroupHeader
                prescriptionId={group.prescriptionId}
                date={date}
                doctor={doctor}
                count={group.medications.length}
              />
              {group.medications.map((medication) => (
                <MedicationCard
                  key={medication.id}
                  medication={medication}
                  planId={record.id}
                />
              ))}
            </Box>
          );
        });
      })()}

      <AddMedicationDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        planId={record.id}
      />
    </Box>
  );
};

export const MedicationPlanShow = () => (
  <Show>
    <SimpleShowLayout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Medication Plan Details
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="text.secondary">
            Patient
          </Typography>
          <ReferenceField source="patient_id" reference="patients" link="show">
            <TextField source="name" />
          </ReferenceField>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="text.secondary">
            Status
          </Typography>
          <StatusChip />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary">
            Description
          </Typography>
          <TextField source="description" />
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" color="text.secondary">
            Start Date
          </Typography>
          <DateField source="plan_start_date" />
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" color="text.secondary">
            End Date
          </Typography>
          <FunctionField
            render={(record: MedicationPlan) =>
              record.plan_end_date ? (
                <DateField source="plan_end_date" record={record} />
              ) : (
                <Typography variant="body2">Ongoing</Typography>
              )
            }
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" color="text.secondary">
            Last Updated
          </Typography>
          <DateField source="updated_at" showTime />
        </Grid>
      </Grid>

      <MedicationsSection />
    </SimpleShowLayout>
  </Show>
);
