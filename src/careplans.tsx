import { Box, Button, Chip, Stack, Tooltip, Typography } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  List,
  Datagrid,
  TextField,
  DateField,
  BooleanField,
  NumberField,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  DateInput,
  BooleanInput,
  NumberInput,
  EditButton,
  ShowButton,
  ReferenceField,
  ReferenceInput,
  AutocompleteInput,
  Link,
  FunctionField,
  RaRecord,
  useDataProvider,
  useNotify,
  Identifier,
  TopToolbar,
  FilterButton,
  CreateButton,
  ExportButton,
} from "react-admin";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { type MyDataProvider } from "./dataProvider";
import { WriteOnly } from "./components/auth/WriteOnly";

// Define Patient interface based on used fields and API response
interface Patient extends RaRecord<number> {
  // id is inherited from RaRecord<number>
  name: string;
  first_name: string;
  code_sn: string;
}

const carePlanFilters = [
  <ReferenceInput
    key="patient_id"
    source="patient_id"
    label="Patient"
    reference="patients"
    alwaysOn
    filter={{ has_careplan: "true" }}
  >
    <AutocompleteInput
      optionText={(choice) =>
        choice
          ? `${choice.name} ${choice.first_name} (${choice.code_sn})`
          : ""
      }
      filterToQuery={(searchText) => ({ q: searchText, has_careplan: "true" })}
    />
  </ReferenceInput>,
  <BooleanInput key="patient_is_active" source="patient_is_active" label="Active Patients Only" />,
  <NumberInput key="plan_number" source="plan_number" label="Plan Number" />,
  <DateInput key="plan_start_date_gte" source="plan_start_date_gte" label="Start Date From" />,
  <DateInput key="plan_start_date_lte" source="plan_start_date_lte" label="Start Date To" />,
  <BooleanInput key="last_valid_plan" source="last_valid_plan" label="Last Valid Plan Only" />,
];

const TRIGGER_KIND_ICON: Record<string, string> = {
  fall: "🦴",
  prescription: "💊",
  cns_plan: "📋",
  hospitalization: "🏥",
  wound: "🩹",
};

interface TriggerSummaryItem {
  kind: string;
  summary: string;
}

const RelativeUpdatedField = ({ record }: { record: any }) => {
  const iso: string | null = record?.updated_on || null;
  if (!iso) return <span>—</span>;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return <span>—</span>;
  const relative = formatDistanceToNow(d, { addSuffix: true, locale: fr });
  const absolute = d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <Tooltip title={absolute} arrow>
      <span style={{ whiteSpace: "nowrap" }}>{relative}</span>
    </Tooltip>
  );
};

const TriggerSummaryField = ({ record }: { record: any }) => {
  const items: TriggerSummaryItem[] = record?.triggers_summary || [];
  if (!items.length) return <span style={{ color: "#999" }}>—</span>;

  // Group by kind, keep order of first appearance, count + collect summaries.
  const groups = new Map<string, { count: number; summaries: string[] }>();
  for (const t of items) {
    const g = groups.get(t.kind) || { count: 0, summaries: [] };
    g.count += 1;
    if (t.summary) g.summaries.push(t.summary);
    groups.set(t.kind, g);
  }

  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
      {Array.from(groups.entries()).map(([kind, g]) => {
        const icon = TRIGGER_KIND_ICON[kind] || "•";
        const tooltip = (
          <Box sx={{ minWidth: 200, maxWidth: 360 }}>
            {g.summaries.slice(0, 8).map((s, i) => (
              <Typography
                key={i}
                variant="caption"
                component="div"
                sx={{ lineHeight: 1.5 }}
              >
                {icon} {s}
              </Typography>
            ))}
            {g.summaries.length > 8 && (
              <Typography variant="caption" component="div" sx={{ opacity: 0.7 }}>
                … +{g.summaries.length - 8}
              </Typography>
            )}
          </Box>
        );
        return (
          <Tooltip key={kind} title={tooltip} arrow placement="top">
            <Chip
              label={`${icon} ${g.count}`}
              size="small"
              variant="outlined"
              sx={{ cursor: "default" }}
            />
          </Tooltip>
        );
      })}
    </Stack>
  );
};

const PlanNumberWithReplaces = ({ record }: { record: any }) => {
  const n = record?.plan_number;
  const replaces = record?.replace_plan_number;
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {n}
      </Typography>
      {replaces ? (
        <Tooltip title={`Remplace le plan n°${replaces}`} arrow>
          <Chip
            label={`← n°${replaces}`}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: 11 }}
          />
        </Tooltip>
      ) : null}
    </Stack>
  );
};

const CarePlanListActions = () => (
  <TopToolbar>
    <FilterButton />
    <Button
      component={Link}
      to="/careplan-overlaps"
      startIcon={<CompareArrowsIcon />}
      size="small"
      color="warning"
    >
      Chevauchements
    </Button>
    <WriteOnly>
      <CreateButton />
    </WriteOnly>
    <ExportButton />
  </TopToolbar>
);

export const CarePlanList = () => (
  <List
    filters={carePlanFilters}
    actions={<CarePlanListActions />}
    sort={{ field: "patient_id", order: "ASC" }}
  >
    <Datagrid
      rowClick="show"
      rowSx={(record) =>
        record.last_valid_plan
          ? {
              backgroundColor: "#e8f5e9",
              borderLeft: "4px solid #4caf50",
              "& td": { fontWeight: 600 },
            }
          : { borderLeft: "4px solid transparent" }
      }
    >
      <TextField source="id" />
      <ReferenceField source="patient_id" reference="patients" />
      <FunctionField
        source="plan_number"
        label="Plan n°"
        render={(record: any) => <PlanNumberWithReplaces record={record} />}
      />
      <DateField source="plan_start_date" label="Début" />
      <FunctionField
        source="last_valid_plan"
        label="Plan valide"
        render={(record: any) =>
          record.last_valid_plan ? (
            <Chip
              icon={<CheckCircleIcon />}
              label="Plan actif"
              color="success"
              size="small"
              variant="filled"
            />
          ) : null
        }
      />
      <FunctionField
        label="Motifs"
        render={(record: any) => <TriggerSummaryField record={record} />}
      />
      <FunctionField
        source="updated_on"
        label="Mis à jour"
        render={(record: any) => <RelativeUpdatedField record={record} />}
      />
      <TextField source="updated_by" label="Par" />
      <ShowButton />
      <WriteOnly>
        <EditButton />
      </WriteOnly>
    </Datagrid>
  </List>
);

interface CarePlanFormFieldsProps {
  isEdit?: boolean;
}

const CarePlanFormFields = ({ isEdit }: CarePlanFormFieldsProps) => {
  const { watch, setValue } = useFormContext();
  const dataProvider = useDataProvider<MyDataProvider>();
  const notify = useNotify();

  const selectedPatientId = watch("patient_id") as Identifier | undefined;
  const watchedCnsPlanId = watch("medical_care_summary_per_patient_id") as
    | Identifier
    | undefined;

  useEffect(() => {
    if (!isEdit && selectedPatientId) {
      dataProvider
        .getLatestCnsCarePlanForPatient(selectedPatientId)
        .then((response: { id: Identifier | null }) => {
          const cnsPlanId = response.id;
          setValue("medical_care_summary_per_patient_id", cnsPlanId, {
            shouldValidate: true,
            shouldDirty: true,
          });
          if (cnsPlanId === null) {
            notify("No linked CNS care plan found for this patient.", {
              type: "info",
            });
          }
        })
        .catch((error: Error) => {
          console.error("Failed to fetch latest CNS care plan:", error);
          setValue("medical_care_summary_per_patient_id", null, {
            shouldValidate: true,
            shouldDirty: true,
          });
          notify("Error fetching latest CNS care plan.", { type: "warning" });
        });
    } else if (!isEdit && !selectedPatientId) {
      // Clear the field if patient is deselected in create mode
      setValue("medical_care_summary_per_patient_id", null, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [selectedPatientId, isEdit, dataProvider, setValue, notify]);

  return (
    <>
      {!isEdit && (
        <ReferenceInput
          label="Patient"
          source="patient_id"
          reference="patients"
        >
          <AutocompleteInput />
        </ReferenceInput>
      )}
      <NumberInput source="plan_number" />
      <NumberInput source="replace_plan_number" />
      <Box
        display="flex"
        sx={{
          width: "100%",
          "& > .RaDateInput": { flex: 1, marginRight: "1rem" },
          "& > .RaDateInput:last-child": { marginRight: 0 },
        }}
      >
        <DateInput source="plan_start_date" />
        <DateInput source="plan_end_date" />
        <DateInput source="plan_decision_date" />
      </Box>
      <NumberInput source="medical_care_summary_per_patient_id" />
      {watchedCnsPlanId && (
        <Box sx={{ mt: 1, mb: 2 }}>
          <Link to={`/cnscareplans/${watchedCnsPlanId}/show`}>
            {"View Related CNS Care Plan (ID: "}
            {watchedCnsPlanId}
            {")"}
          </Link>
        </Box>
      )}
      <BooleanInput source="last_valid_plan" />
    </>
  );
};

export const CarePlanEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="id" disabled />
      {/* Patient display at the top */}
      <ReferenceField
        label="Patient"
        source="patient_id"
        reference="patients"
        link={false}
        sx={{ mb: 2 }} // Added margin for spacing
      >
        <FunctionField<Patient>
          render={(record?: Patient) => {
            if (!record) return null;
            return (
              <Box component="span" display="flex" alignItems="center">
                <PersonIcon sx={{ mr: 0.5, fontSize: "1.1rem" }} />
                <span style={{ fontWeight: "bold" }}>
                  {`${record.name} ${record.first_name} (${record.code_sn})`}
                </span>
              </Box>
            );
          }}
        />
      </ReferenceField>
      <CarePlanFormFields isEdit={true} />
    </SimpleForm>
  </Edit>
);

export const CarePlanCreate = () => (
  <Create
    redirect="show"
    mutationOptions={{
      onSuccess: (data) => {
        // This will trigger after successful creation and redirect
        console.log("Care plan created successfully:", data);
      },
    }}
  >
    <SimpleForm>
      <CarePlanFormFields isEdit={false} />
    </SimpleForm>
  </Create>
);
