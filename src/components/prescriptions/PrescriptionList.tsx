import {
  List,
  Datagrid,
  TextField,
  DateField,
  ReferenceInput,
  SearchInput,
  DateInput,
  BooleanField,
  FunctionField,
  ChipField,
} from "react-admin";
import { Chip } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import type { PrescriptionListItem } from "../../types/prescriptions";

const prescriptionFilters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <ReferenceInput key="patient" source="patient_id" reference="patients">
    <TextField source="name" />
  </ReferenceInput>,
  <DateInput key="date_from" source="date_from" label="From Date" />,
  <DateInput key="date_to" source="date_to" label="To Date" />,
];

export const PrescriptionList = () => (
  <List
    filters={prescriptionFilters}
    sort={{ field: "date", order: "DESC" }}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="id" />
      <FunctionField
        label="Patient"
        render={(record: PrescriptionListItem) =>
          `${record.patient_name} ${record.patient_first_name}`
        }
      />
      <FunctionField
        label="Prescriptor"
        render={(record: PrescriptionListItem) => (
          <div>
            <div>{`Dr. ${record.prescriptor_name} ${record.prescriptor_first_name}`}</div>
            {record.prescriptor_specialty && (
              <Chip
                label={record.prescriptor_specialty}
                size="small"
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            )}
          </div>
        )}
      />
      <DateField source="date" label="Date" />
      <DateField source="end_date" label="End Date" />
      <FunctionField
        label="File"
        render={(record: PrescriptionListItem) =>
          record.has_file ? (
            <Chip
              icon={<AttachFileIcon />}
              label="Attached"
              size="small"
              color="primary"
              variant="outlined"
            />
          ) : (
            <Chip label="No File" size="small" variant="outlined" />
          )
        }
      />
      <TextField source="note" label="Note" />
    </Datagrid>
  </List>
);
