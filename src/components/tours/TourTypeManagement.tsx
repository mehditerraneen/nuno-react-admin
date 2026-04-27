import React, { useState, useEffect } from "react";
import {
  List,
  Datagrid,
  TextField,
  FunctionField,
  EditButton,
  DeleteButton,
  Edit,
  SimpleForm,
  TextInput,
  Create,
  useDataProvider,
  useNotify,
  useRecordContext,
} from "react-admin";
import { useFormContext } from "react-hook-form";
import {
  Chip,
  Box,
  Autocomplete,
  TextField as MuiTextField,
  CircularProgress,
} from "@mui/material";
import { TourType, LongTermPackageRef } from "../../types/tours";
import { WriteOnly } from "../auth/WriteOnly";

export const TourTypeList = (props: any) => (
  <List {...props} sort={{ field: "name", order: "ASC" }}>
    <Datagrid>
      <TextField source="name" />
      <TextField source="description" />
      <FunctionField
        label="Packages"
        render={(record: TourType) =>
          record.long_term_packages && record.long_term_packages.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {record.long_term_packages.map((pkg) => (
                <Chip
                  key={pkg.id}
                  label={pkg.code}
                  size="small"
                  title={pkg.description}
                />
              ))}
            </Box>
          ) : (
            <Chip label="No packages" color="default" size="small" />
          )
        }
      />
      <WriteOnly>
        <EditButton />
        <DeleteButton />
      </WriteOnly>
    </Datagrid>
  </List>
);

const LongTermPackageInput = () => {
  const [options, setOptions] = useState<LongTermPackageRef[]>([]);
  const [selected, setSelected] = useState<LongTermPackageRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const record = useRecordContext<TourType>();
  const { setValue } = useFormContext();

  useEffect(() => {
    const loadPackages = async () => {
      setLoading(true);
      try {
        const response = await dataProvider.getList("long-term-packages", {
          pagination: { page: 1, perPage: 500 },
          sort: { field: "code", order: "ASC" },
          filter: {},
        });
        setOptions(response.data as LongTermPackageRef[]);
      } catch (error) {
        notify("Failed to load long-term packages", { type: "error" });
      } finally {
        setLoading(false);
      }
    };
    loadPackages();
  }, [dataProvider, notify]);

  // Initialize from record when editing
  useEffect(() => {
    if (record?.long_term_packages && !initialized && options.length > 0) {
      setSelected(record.long_term_packages);
      setValue(
        "long_term_package_ids",
        record.long_term_packages.map((pkg) => pkg.id),
      );
      setInitialized(true);
    }
  }, [record, initialized, options, setValue]);

  const handleChange = (newValue: LongTermPackageRef[]) => {
    setSelected(newValue);
    setValue(
      "long_term_package_ids",
      newValue.map((pkg) => pkg.id),
    );
  };

  return (
    <Box sx={{ width: "100%", mb: 2 }}>
      <Autocomplete
        multiple
        options={options}
        value={selected}
        onChange={(_, newValue) => handleChange(newValue)}
        getOptionLabel={(option) => `${option.code} - ${option.description}`}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        loading={loading}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              label={option.code}
              size="small"
              title={option.description}
              {...getTagProps({ index })}
              key={option.id}
            />
          ))
        }
        renderInput={(params) => (
          <MuiTextField
            {...params}
            label="Long-Term Packages"
            helperText="Select long-term care packages associated with this tour type"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </Box>
  );
};

const transformTourType = (data: any) => ({
  name: data.name,
  description: data.description || "",
  long_term_package_ids: data.long_term_package_ids || [],
});

export const TourTypeEdit = (props: any) => (
  <Edit {...props} transform={transformTourType}>
    <SimpleForm>
      <TextInput
        source="name"
        validate={[(v: any) => (v ? undefined : "Required")]}
        fullWidth
      />
      <TextInput source="description" multiline fullWidth />
      <LongTermPackageInput />
    </SimpleForm>
  </Edit>
);

export const TourTypeCreate = (props: any) => (
  <Create {...props} transform={transformTourType}>
    <SimpleForm>
      <TextInput
        source="name"
        validate={[(v: any) => (v ? undefined : "Required")]}
        fullWidth
      />
      <TextInput source="description" multiline fullWidth />
      <LongTermPackageInput />
    </SimpleForm>
  </Create>
);
