import React from "react";
import {
  List,
  Datagrid,
  TextField,
  BooleanField,
  FunctionField,
  EditButton,
  DeleteButton,
  Edit,
  SimpleForm,
  TextInput,
  BooleanInput,
  Create,
} from "react-admin";
import { Chip, Box } from "@mui/material";
import { Employee } from "../../types/tours";

export const EmployeeList = (props: any) => (
  <List {...props} sort={{ field: "name", order: "ASC" }}>
    <Datagrid>
      <TextField source="name" />
      <TextField source="abbreviation" />
      <FunctionField
        source="color"
        label="Color"
        render={(record: Employee) => (
          <Box
            sx={{
              display: "inline-block",
              width: 20,
              height: 20,
              backgroundColor: record.color,
              borderRadius: "50%",
              border: "1px solid #ccc",
            }}
          />
        )}
      />
      <BooleanField source="active" />
      <FunctionField
        source="daily_events_count"
        label="Daily Visits"
        render={(record: Employee) =>
          record.daily_events_count ? (
            <Chip
              label={`${record.daily_events_count} visits`}
              color="primary"
              size="small"
            />
          ) : (
            <Chip label="0 visits" color="default" size="small" />
          )
        }
      />
      <FunctionField
        source="estimated_duration"
        label="Daily Duration"
        render={(record: Employee) =>
          record.estimated_duration ? (
            <Chip
              label={`${Math.round(record.estimated_duration / 60)}h ${record.estimated_duration % 60}m`}
              color="secondary"
              size="small"
              variant="outlined"
            />
          ) : (
            <Chip
              label="0h 0m"
              color="default"
              size="small"
              variant="outlined"
            />
          )
        }
      />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const EmployeeEdit = (props: any) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="name" validate={[]} />
      <TextInput source="abbreviation" validate={[]} />
      <TextInput
        source="color"
        type="color"
        helperText="Choose a color for calendar display"
      />
      <BooleanInput source="active" />
    </SimpleForm>
  </Edit>
);

export const EmployeeCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="name" validate={[]} />
      <TextInput source="abbreviation" validate={[]} />
      <TextInput
        source="color"
        type="color"
        defaultValue="#3174ad"
        helperText="Choose a color for calendar display"
      />
      <BooleanInput source="active" defaultValue={true} />
    </SimpleForm>
  </Create>
);
