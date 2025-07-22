import React from "react";
import {
  List,
  Datagrid,
  TextField,
  DateField,
  SelectField,
  ReferenceField,
  EditButton,
  DeleteButton,
  Edit,
  SimpleForm,
  DateInput,
  TextInput,
  SelectInput,
  ReferenceInput,
  Create,
  Filter,
  FunctionField,
} from "react-admin";
import { Chip } from "@mui/material";
import { EVENT_STATES, EVENT_TYPES, type Event } from "../../types/tours";

export const EventFilters = (props: any) => (
  <Filter {...props}>
    <DateInput source="date" label="Date" />
    <ReferenceInput source="employee_id" reference="employees">
      <SelectInput optionText="name" />
    </ReferenceInput>
    <ReferenceInput source="patient_id" reference="patients">
      <SelectInput optionText="name" />
    </ReferenceInput>
    <SelectInput source="state" choices={EVENT_STATES} />
    <SelectInput
      source="event_type"
      choices={EVENT_TYPES.map((type) => ({
        id: type,
        name: type.replace("_", " ").toUpperCase(),
      }))}
    />
  </Filter>
);

export const EventList = (props: any) => (
  <List
    {...props}
    filters={<EventFilters />}
    sort={{ field: "date", order: "DESC" }}
  >
    <Datagrid>
      <DateField source="date" />
      <FunctionField
        source="time_start"
        label="Time"
        render={(record: Event) => `${record.time_start} - ${record.time_end}`}
      />
      <ReferenceField source="patient_id" reference="patients" link="show">
        <TextField source="name" />
      </ReferenceField>
      <ReferenceField source="employee_id" reference="employees" link={false}>
        <TextField source="name" />
      </ReferenceField>
      <SelectField source="state" choices={EVENT_STATES} />
      <FunctionField
        source="event_type"
        label="Type"
        render={(record: Event) => (
          <Chip
            label={record.event_type ? record.event_type.replace("_", " ").toUpperCase() : "N/A"}
            size="small"
            variant="outlined"
          />
        )}
      />
      <FunctionField
        source="duration"
        label="Duration"
        render={(record: Event) => {
          if (record.real_start && record.real_end) {
            const start = new Date(`2000-01-01T${record.real_start}`);
            const end = new Date(`2000-01-01T${record.real_end}`);
            const diff = Math.round(
              (end.getTime() - start.getTime()) / (1000 * 60),
            );
            return `${diff} min (actual)`;
          }
          const start = new Date(`2000-01-01T${record.time_start}`);
          const end = new Date(`2000-01-01T${record.time_end}`);
          const diff = Math.round(
            (end.getTime() - start.getTime()) / (1000 * 60),
          );
          return `${diff} min (planned)`;
        }}
      />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const EventEdit = (props: any) => (
  <Edit {...props}>
    <SimpleForm>
      <DateInput source="date" />
      <TextInput source="time_start" type="time" />
      <TextInput source="time_end" type="time" />
      <ReferenceInput 
        source="patient_id" 
        reference="patients"
        perPage={1000}
        sort={{ field: 'name', order: 'ASC' }}
      >
        <SelectInput optionText={(record) => `${record.first_name} ${record.name}`} />
      </ReferenceInput>
      <ReferenceInput 
        source="employee_id" 
        reference="employees"
        perPage={100}
        sort={{ field: 'name', order: 'ASC' }}
      >
        <SelectInput optionText="name" />
      </ReferenceInput>
      <SelectInput source="state" choices={EVENT_STATES} />
      <SelectInput
        source="event_type"
        choices={EVENT_TYPES.map((type) => ({
          id: type,
          name: type.replace("_", " ").toUpperCase(),
        }))}
      />
      <TextInput source="notes" multiline rows={3} fullWidth />
      <TextInput source="event_address" fullWidth />
      <TextInput source="real_start" type="time" label="Actual Start Time" />
      <TextInput source="real_end" type="time" label="Actual End Time" />
    </SimpleForm>
  </Edit>
);

export const EventCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm>
      <DateInput
        source="date"
        defaultValue={new Date().toISOString().split("T")[0]}
      />
      <TextInput source="time_start" type="time" defaultValue="08:00" />
      <TextInput source="time_end" type="time" defaultValue="09:00" />
      <ReferenceInput 
        source="patient_id" 
        reference="patients"
        perPage={1000}
        sort={{ field: 'name', order: 'ASC' }}
      >
        <SelectInput optionText={(record) => `${record.first_name} ${record.name}`} />
      </ReferenceInput>
      <ReferenceInput 
        source="employee_id" 
        reference="employees"
        perPage={100}
        sort={{ field: 'name', order: 'ASC' }}
      >
        <SelectInput optionText="name" />
      </ReferenceInput>
      <SelectInput source="state" choices={EVENT_STATES} defaultValue={1} />
      <SelectInput
        source="event_type"
        choices={EVENT_TYPES.map((type) => ({
          id: type,
          name: type.replace("_", " ").toUpperCase(),
        }))}
        defaultValue="assessment"
      />
      <TextInput source="notes" multiline rows={3} fullWidth />
      <TextInput source="event_address" fullWidth />
    </SimpleForm>
  </Create>
);
