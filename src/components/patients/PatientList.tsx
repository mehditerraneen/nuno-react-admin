import {
  List,
  Datagrid,
  TextField,
  FunctionField,
  SearchInput,
  TopToolbar,
  FilterButton,
  ExportButton,
} from "react-admin";

const filters = [
  <SearchInput
    key="q"
    source="q"
    alwaysOn
    placeholder="Rechercher (nom, prénom, matricule)"
  />,
];

const Actions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
);

export const PatientList = () => (
  <List
    filters={filters}
    actions={<Actions />}
    sort={{ field: "name", order: "ASC" }}
    perPage={25}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="name" label="Nom" />
      <TextField source="first_name" label="Prénom" />
      <TextField source="code_sn" label="Matricule" />
      <FunctionField
        label="Adresse"
        render={(r: any) => {
          const parts = [r.address, r.zipcode, r.city].filter(Boolean);
          return parts.join(" · ") || "—";
        }}
      />
      <FunctionField
        label="Contact"
        render={(r: any) =>
          r.phone_number || r.additional_phone_number || r.email_address || "—"
        }
      />
    </Datagrid>
  </List>
);
