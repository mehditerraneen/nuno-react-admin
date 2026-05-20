import {
  List,
  Datagrid,
  TextField,
  DateField,
  FunctionField,
  SearchInput,
  SelectInput,
  TopToolbar,
  FilterButton,
  ExportButton,
} from "react-admin";
import { Box, Chip, LinearProgress, Tooltip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

const FALL_RISK_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  LOW: "success",
  MODERATE: "warning",
  HIGH: "error",
};

const FALL_RISK_LABEL: Record<string, string> = {
  LOW: "Faible",
  MODERATE: "Modéré",
  HIGH: "Élevé",
};

const filters = [
  <SearchInput key="search" source="search" alwaysOn placeholder="Rechercher (nom, prénom, matricule)" />,
  <SelectInput
    key="fall_risk_level"
    source="fall_risk_level"
    label="Risque de chute"
    choices={[
      { id: "LOW", name: "Faible" },
      { id: "MODERATE", name: "Modéré" },
      { id: "HIGH", name: "Élevé" },
    ]}
  />,
];

const Actions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
);

const CompletionCell = ({ value }: { value: number }) => {
  const pct = Math.max(0, Math.min(100, value));
  const color: "error" | "warning" | "success" =
    pct < 40 ? "error" : pct < 75 ? "warning" : "success";
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 140 }}>
      <Box sx={{ flexGrow: 1 }}>
        <LinearProgress variant="determinate" value={pct} color={color} />
      </Box>
      <Box sx={{ minWidth: 36, textAlign: "right" }}>{pct.toFixed(0)}%</Box>
    </Box>
  );
};

export const PatientAnamnesisList = () => (
  <List
    filters={filters}
    actions={<Actions />}
    sort={{ field: "updated_on", order: "DESC" }}
    perPage={25}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="patient_name" label="Patient" />
      <TextField source="patient_code_sn" label="Matricule" />
      <FunctionField
        label="Complétude"
        source="completion_percentage"
        render={(record: any) => (
          <CompletionCell value={record.completion_percentage ?? 0} />
        )}
      />
      <FunctionField
        label="Risque de chute"
        source="fall_risk_level"
        render={(record: any) => {
          if (!record.fall_risk_level) {
            return <Chip label="—" size="small" variant="outlined" />;
          }
          return (
            <Tooltip title={`Score Morse : ${record.fall_risk_score ?? "—"}`}>
              <Chip
                label={FALL_RISK_LABEL[record.fall_risk_level] || record.fall_risk_level}
                color={FALL_RISK_COLOR[record.fall_risk_level] || "default"}
                size="small"
              />
            </Tooltip>
          );
        }}
      />
      <FunctionField
        label="Directives anticipées"
        source="has_anticipated_directives"
        render={(record: any) =>
          record.has_anticipated_directives ? (
            <CheckCircleIcon color="success" fontSize="small" />
          ) : (
            <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
          )
        }
      />
      <DateField source="contract_start_date" label="Début contrat" />
      <DateField source="updated_on" label="Mis à jour" showTime />
    </Datagrid>
  </List>
);
