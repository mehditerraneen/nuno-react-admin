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
  TopToolbar,
  EditButton,
  ListButton,
} from "react-admin";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
  Divider,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
import { ScheduleRuleRecap } from "./ScheduleRuleRecap";
import { WriteOnly } from "../auth/WriteOnly";

const StatusChip = () => {
  const record = useRecordContext<MedicationPlan>();
  const translate = useTranslate();
  if (!record) return null;

  return (
    <Chip
      label={translate(
        record.status === "in_progress"
          ? "medication_plan_show.status_active"
          : "medication_plan_show.status_archived",
      )}
      color={record.status === "in_progress" ? "success" : "default"}
      sx={{ fontWeight: "bold" }}
    />
  );
};

const MedicationCard = ({
  medication,
  planId,
}: {
  medication: Medication;
  planId: number;
}) => {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const translate = useTranslate();
  const rules = medication.schedule_rules ?? [];

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h6" component="div">
            {medication.medicine_abbreviated_name}
          </Typography>
          {medication.date_ended ? (
            <Chip
              label={translate("medication_plan_show.med.ended")}
              size="small"
              color="default"
            />
          ) : (
            <Chip
              label={translate("medication_plan_show.med.active")}
              size="small"
              color="success"
            />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {medication.medicine_name}
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2">
              <strong>{translate("medication_plan_show.med.dosage")}:</strong>{" "}
              {medication.dosage}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2">
              <strong>{translate("medication_plan_show.med.started")}:</strong>{" "}
              {new Date(medication.date_started).toLocaleDateString()}
            </Typography>
          </Grid>
          {medication.date_ended && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2">
                <strong>
                  {translate("medication_plan_show.med.ended_label")}:
                </strong>{" "}
                {new Date(medication.date_ended).toLocaleDateString()}
              </Typography>
            </Grid>
          )}
        </Grid>

        <Divider sx={{ my: 2 }} />

        {medication.prescription_id && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {translate("medication_plan_show.med.prescription_auth")}
            </Typography>
            <ReferenceField
              source="prescription_id"
              reference="prescriptions"
              link="show"
              record={medication}
            >
              <Chip
                icon={<DescriptionIcon />}
                label={translate("medication_plan_show.med.view_prescription")}
                size="small"
                color="primary"
                clickable
                component="a"
              />
            </ReferenceField>
          </Box>
        )}

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="subtitle2">
            {rules.length > 0
              ? translate("medication_plan_show.med.rules_count", {
                  count: rules.length,
                })
              : translate("medication_plan_show.med.admin_schedule")}
          </Typography>
          <WriteOnly>
            <Button
              size="small"
              startIcon={<CalendarMonthIcon />}
              onClick={() => setScheduleDialogOpen(true)}
              variant="outlined"
              label={translate("medication_plan_show.med.manage_schedule")}
            />
          </WriteOnly>
        </Box>

        {rules.length > 0 ? (
          <Box sx={{ mb: 2 }}>
            {rules.map((rule, index) => (
              <ScheduleRuleRecap key={rule.id ?? index} rule={rule} />
            ))}
          </Box>
        ) : (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
            {medication.morning && (
              <Chip
                label={`${translate("med_schedule_rules.part.morning")}: ${medication.morning_dose || "✓"}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {medication.noon && (
              <Chip
                label={`${translate("med_schedule_rules.part.noon")}: ${medication.noon_dose || "✓"}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {medication.evening && (
              <Chip
                label={`${translate("med_schedule_rules.part.evening")}: ${medication.evening_dose || "✓"}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {medication.night && (
              <Chip
                label={`${translate("med_schedule_rules.part.night")}: ${medication.night_dose || "✓"}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        )}

        {medication.remarks && (
          <Box sx={{ mt: 2, p: 1, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>{translate("medication_plan_show.med.remarks")}:</strong>{" "}
              {medication.remarks}
            </Typography>
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

const PrescriptionGroupHeaderInner: React.FC<{
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
    <Box
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 1,
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
    </Box>
  );
};

const MedicationsSection = () => {
  const record = useRecordContext<MedicationPlan>();
  const translate = useTranslate();
  const dataProvider = useDataProvider();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [prescriptions, setPrescriptions] = useState<RawPrescription[]>([]);
  const [scheduleDialogFor, setScheduleDialogFor] = useState<Medication | null>(
    null,
  );

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
          {translate("medication_plan_show.medications_header", { count: 0 })}
        </Typography>
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {translate("medication_plan_show.no_meds")}
          </Typography>
          <WriteOnly>
            <Button
              label={translate("medication_plan_show.add_medication")}
              startIcon={<AddIcon />}
              onClick={() => setAddDialogOpen(true)}
              sx={{ mt: 2 }}
            />
          </WriteOnly>
        </Paper>

        <AddMedicationDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          planId={record.id}
          patientId={record.patient_id}
          onCreated={(m) => setScheduleDialogFor(m)}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">
          {translate("medication_plan_show.medications_header", {
            count: record.medications.length,
          })}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            component="a"
            href={`#/medication-plans/${record.id}/board`}
            variant="contained"
            color="primary"
            label={translate("medication_plan_show.open_board")}
          />
          <WriteOnly>
            <Button
              label={translate("medication_plan_show.add_medication")}
              startIcon={<AddIcon />}
              onClick={() => setAddDialogOpen(true)}
            />
          </WriteOnly>
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
          const s = prescriptionStyle(group.prescriptionId);
          return (
            <Accordion
              key={group.prescriptionId ?? "none"}
              defaultExpanded
              sx={{
                mt: 2,
                mb: 1,
                "&::before": { display: "none" },
                borderLeft: `5px solid ${s.main}`,
                backgroundColor: s.soft,
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: s.text }} />}
                sx={{ backgroundColor: s.soft }}
              >
                <PrescriptionGroupHeaderInner
                  prescriptionId={group.prescriptionId}
                  date={date}
                  doctor={doctor}
                  count={group.medications.length}
                />
              </AccordionSummary>
              <AccordionDetails sx={{ backgroundColor: "white" }}>
                {group.medications.map((medication) => (
                  <MedicationCard
                    key={medication.id}
                    medication={medication}
                    planId={record.id}
                  />
                ))}
              </AccordionDetails>
            </Accordion>
          );
        });
      })()}

      <AddMedicationDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        planId={record.id}
        patientId={record.patient_id}
        onCreated={(m) => setScheduleDialogFor(m)}
      />

      {scheduleDialogFor && (
        <ScheduleRulesDialog
          open
          onClose={() => setScheduleDialogFor(null)}
          medication={scheduleDialogFor}
          planId={record.id}
        />
      )}
    </Box>
  );
};

const MedicationPlanShowLayout = () => {
  const translate = useTranslate();
  return (
    <SimpleShowLayout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {translate("medication_plan_show.title")}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {translate("medication_plan_show.patient")}
          </Typography>
          <ReferenceField source="patient_id" reference="patients" link="show">
            <TextField source="name" />
          </ReferenceField>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {translate("medication_plan_show.status")}
          </Typography>
          <StatusChip />
        </Grid>

        <Grid size={12}>
          <Typography variant="subtitle2" color="text.secondary">
            {translate("medication_plan_show.description")}
          </Typography>
          <TextField source="description" />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {translate("medication_plan_show.plan_start")}
          </Typography>
          <DateField source="plan_start_date" />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {translate("medication_plan_show.plan_end")}
          </Typography>
          <FunctionField
            render={(record: MedicationPlan) =>
              record.plan_end_date ? (
                <DateField source="plan_end_date" record={record} />
              ) : (
                <Typography variant="body2">
                  {translate("medication_plan_show.ongoing")}
                </Typography>
              )
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {translate("medication_plan_show.last_updated")}
          </Typography>
          <DateField source="updated_at" showTime />
        </Grid>
      </Grid>

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
            {translate("medication_plan_show.created")}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DateField source="created_at" showTime />
            <TextField source="created_by" emptyText="—" />
          </Box>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {translate("medication_plan_show.updated_by_label")}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DateField source="updated_at" showTime />
            <TextField source="updated_by" emptyText="—" />
          </Box>
        </Box>
      </Box>

      <MedicationsSection />
    </SimpleShowLayout>
  );
};

const MedicationPlanShowActions = () => (
  <TopToolbar>
    <ListButton />
    <WriteOnly>
      <EditButton />
    </WriteOnly>
  </TopToolbar>
);

export const MedicationPlanShow = () => (
  <Show actions={<MedicationPlanShowActions />}>
    <MedicationPlanShowLayout />
  </Show>
);
