import {
  List,
  Datagrid,
  TextField,
  DateField,
  ReferenceField,
  FunctionField,
  FilterButton,
  TopToolbar,
  CreateButton,
  SelectInput,
  ReferenceInput,
  AutocompleteInput,
  DateInput,
  useRecordContext,
  ShowButton,
  EditButton,
  DeleteButton,
} from 'react-admin';
import { Chip, Box } from '@mui/material';
import { STATUS_LABELS, type WoundStatus, BODY_AREAS } from '../../types/wounds';

// Color mapping for status badges
const statusColors: Record<WoundStatus, 'warning' | 'success' | 'error' | 'default'> = {
  ACTIVE: 'warning',
  HEALED: 'success',
  INFECTED: 'error',
  ARCHIVED: 'default',
};

// List actions toolbar
const WoundListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
  </TopToolbar>
);

// Filters for the wound list
const woundFilters = [
  <ReferenceInput source="patient" reference="patients" alwaysOn key="patient">
    <AutocompleteInput
      optionText={(record) => `${record.name} ${record.first_name} (${record.code_sn})`}
      label="Patient"
    />
  </ReferenceInput>,
  <SelectInput
    source="status"
    choices={Object.entries(STATUS_LABELS).map(([value, label]) => ({ id: value, name: label }))}
    key="status"
    label="Statut"
  />,
  <SelectInput
    source="body_area"
    choices={Object.entries(BODY_AREAS).map(([code, label]) => ({ id: code, name: label }))}
    key="body_area"
    label="Zone corporelle"
  />,
  <DateInput source="date_created_gte" label="Créé après" key="date_from" />,
  <DateInput source="date_created_lte" label="Créé avant" key="date_to" />,
];

/**
 * Wound List Component
 *
 * Displays a table of wounds with:
 * - Patient reference
 * - Body area
 * - Status with color-coded badge
 * - Creation date
 * - Evolution count
 * - Quick actions (show, edit, delete)
 */
export const WoundList = () => (
  <List
    filters={woundFilters}
    actions={<WoundListActions />}
    sort={{ field: 'date_created', order: 'DESC' }}
    perPage={25}
  >
    <Datagrid
      rowClick="show"
      bulkActionButtons={false}
      sx={{
        '& .RaDatagrid-rowCell': {
          padding: '12px 16px',
        },
      }}
    >
      <TextField source="id" label="ID" />

      <ReferenceField source="patient" reference="patients" label="Patient" link="show">
        <FunctionField
          render={(record: any) =>
            record ? `${record.name} ${record.first_name || ''}` : '-'
          }
        />
      </ReferenceField>

      <FunctionField
        label="Zone corporelle"
        render={(record: any) => {
          const bodyArea = BODY_AREAS[record.body_area as keyof typeof BODY_AREAS];
          return (
            <Box>
              <div style={{ fontWeight: 500 }}>{bodyArea || record.body_area}</div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>
                Vue: {record.body_view === 'FRONT' ? 'Face' : record.body_view === 'BACK' ? 'Dos' : 'Latérale'}
              </div>
            </Box>
          );
        }}
      />

      <FunctionField
        label="Statut"
        render={(record: any) => (
          <Chip
            label={STATUS_LABELS[record.status as WoundStatus]}
            color={statusColors[record.status as WoundStatus]}
            size="small"
            sx={{ fontWeight: 500 }}
          />
        )}
      />

      <DateField source="date_created" label="Date création" showTime />

      <FunctionField
        label="Évolutions"
        render={(record: any) => (
          <Chip
            label={record.evolution_count || 0}
            size="small"
            variant="outlined"
            color={record.evolution_count > 0 ? 'primary' : 'default'}
          />
        )}
      />

      <TextField source="description" label="Description" />

      <Box>
        <ShowButton />
        <EditButton />
        <DeleteButton />
      </Box>
    </Datagrid>
  </List>
);
