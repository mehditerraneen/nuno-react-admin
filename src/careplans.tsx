import { Box } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
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
  Link, // Added for linking to related CNS Care Plan
  FunctionField, // Added for custom rendering in ReferenceField
  RaRecord, // Import RaRecord for proper typing
  useDataProvider,
  useNotify,
  Identifier,
} from "react-admin";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { type MyDataProvider } from "./dataProvider"; // Import custom data provider type

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
    filter={{ has_careplan: true }}
  >
    <AutocompleteInput />
  </ReferenceInput>,
];

export const CarePlanList = () => (
  <List filters={carePlanFilters}>
    <Datagrid rowClick="show">
      <TextField source="id" />
      <ReferenceField source="patient_id" reference="patients" />
      <NumberField source="plan_number" />
      <DateField source="plan_start_date" />
      <BooleanField source="last_valid_plan" />
      <ShowButton />
      <EditButton />
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
        console.log('Care plan created successfully:', data);
      }
    }}
  >
    <SimpleForm>
      <CarePlanFormFields isEdit={false} />
    </SimpleForm>
  </Create>
);
