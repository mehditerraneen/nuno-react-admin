import React, { useEffect, useState } from "react";
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
  NumberInput,
  SelectInput,
  Create,
  useDataProvider,
  useNotify,
  required,
} from "react-admin";
import {
  Box,
  Chip,
  Typography,
  IconButton,
  Button,
  Paper,
  Autocomplete,
  TextField as MuiTextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useFormContext } from "react-hook-form";

const SHIFT_CATEGORIES = [
  { id: "MORNING", name: "Morning" },
  { id: "EVENING", name: "Evening" },
  { id: "NIGHT", name: "Night" },
  { id: "OFF", name: "Off" },
  { id: "LEAVE", name: "Leave" },
  { id: "TRAINING", name: "Training" },
  { id: "OTHER", name: "Other" },
];

interface ActivityType {
  id: number;
  code: string;
  name: string;
  color_code: string;
  is_paid: boolean;
}

interface Segment {
  id?: number;
  activity_type: ActivityType;
  position: number;
  start_time: string;
  end_time: string;
  is_paid: boolean;
  label: string;
}

// Segments editor for composite shifts
const SegmentsInput = () => {
  const { watch, setValue } = useFormContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const isComposite = watch("is_composite");
  const segments: Segment[] = watch("segments") || [];

  useEffect(() => {
    // Fetch activity types for the dropdown
    const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL || "/fast/fast";
    const token = localStorage.getItem("auth_token");
    fetch(`${apiUrl}/planning/activity-types`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setActivityTypes(data.data || []);
      })
      .catch(() => notify("Failed to load activity types", { type: "warning" }));
  }, [notify]);

  if (!isComposite) return null;

  const addSegment = () => {
    const newPosition = segments.length + 1;
    setValue(
      "segments",
      [
        ...segments,
        {
          activity_type: activityTypes[0] || { id: 0, code: "", name: "", color_code: "#ccc", is_paid: true },
          position: newPosition,
          start_time: "08:00",
          end_time: "12:00",
          is_paid: true,
          label: "",
        },
      ],
      { shouldDirty: true }
    );
  };

  const removeSegment = (index: number) => {
    const updated = segments
      .filter((_, i) => i !== index)
      .map((seg, i) => ({ ...seg, position: i + 1 }));
    setValue("segments", updated, { shouldDirty: true });
  };

  const updateSegment = (index: number, field: string, value: any) => {
    const updated = [...segments];
    updated[index] = { ...updated[index], [field]: value };
    setValue("segments", updated, { shouldDirty: true });
  };

  return (
    <Paper sx={{ p: 2, mt: 2, mb: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1">Segments</Typography>
        <Button startIcon={<AddIcon />} onClick={addSegment} size="small" variant="outlined">
          Add Segment
        </Button>
      </Box>

      {segments.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No segments yet. Add segments to define the composite shift structure.
        </Typography>
      )}

      {segments.map((seg, index) => (
        <Paper key={index} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <Typography variant="caption" sx={{ minWidth: 20 }}>
              #{seg.position}
            </Typography>

            <Autocomplete
              size="small"
              sx={{ minWidth: 200 }}
              options={activityTypes}
              getOptionLabel={(opt) => `${opt.code} - ${opt.name}`}
              value={activityTypes.find((at) => at.id === seg.activity_type?.id) || null}
              onChange={(_, newVal) => {
                if (newVal) updateSegment(index, "activity_type", newVal);
              }}
              renderInput={(params) => <MuiTextField {...params} label="Activity Type" />}
            />

            <MuiTextField
              size="small"
              label="Start"
              type="time"
              value={seg.start_time || ""}
              onChange={(e) => updateSegment(index, "start_time", e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 130 }}
            />

            <MuiTextField
              size="small"
              label="End"
              type="time"
              value={seg.end_time || ""}
              onChange={(e) => updateSegment(index, "end_time", e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 130 }}
            />

            <MuiTextField
              size="small"
              label="Label"
              value={seg.label || ""}
              onChange={(e) => updateSegment(index, "label", e.target.value)}
              sx={{ width: 150 }}
            />

            <Box display="flex" alignItems="center" gap={0.5}>
              <input
                type="checkbox"
                checked={seg.is_paid}
                onChange={(e) => updateSegment(index, "is_paid", e.target.checked)}
              />
              <Typography variant="caption">Paid</Typography>
            </Box>

            <IconButton size="small" onClick={() => removeSegment(index)} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      ))}
    </Paper>
  );
};

export const ShiftTypeList = () => (
  <List
    sort={{ field: "code", order: "ASC" }}
    filter={{ active_only: false }}
  >
    <Datagrid>
      <FunctionField
        source="code"
        label="Code"
        render={(record: any) => (
          <Chip
            label={record.code}
            size="small"
            sx={{
              backgroundColor: record.color_code || "#ccc",
              color: "#fff",
              fontWeight: 600,
            }}
          />
        )}
      />
      <TextField source="name" />
      <FunctionField
        source="shift_category"
        label="Category"
        render={(record: any) => (
          <Chip
            label={record.shift_category}
            size="small"
            variant="outlined"
          />
        )}
      />
      <FunctionField
        source="hours"
        label="Hours"
        render={(record: any) => `${record.hours}h`}
      />
      <FunctionField
        source="start_time"
        label="Time Range"
        render={(record: any) =>
          record.start_time && record.end_time
            ? `${record.start_time.slice(0, 5)} - ${record.end_time.slice(0, 5)}`
            : "—"
        }
      />
      <FunctionField
        source="is_composite"
        label="Composite"
        render={(record: any) =>
          record.is_composite ? (
            <Chip label={`${record.segments?.length || 0} segments`} size="small" color="info" />
          ) : null
        }
      />
      <BooleanField source="is_active" label="Active" />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

const ShiftTypeForm = ({ isEdit = false }: { isEdit?: boolean }) => (
  <>
    <Box display="flex" gap={2} sx={{ "& > *": { flex: 1 } }}>
      <TextInput source="code" validate={required()} disabled={isEdit} />
      <TextInput source="name" validate={required()} />
    </Box>
    <Box display="flex" gap={2} sx={{ "& > *": { flex: 1 } }}>
      <SelectInput
        source="shift_category"
        choices={SHIFT_CATEGORIES}
        validate={required()}
      />
      <TextInput source="color_code" type="color" defaultValue="#CCCCCC" />
    </Box>
    <Box display="flex" gap={2} sx={{ "& > *": { flex: 1 } }}>
      <TextInput source="start_time" type="time" InputLabelProps={{ shrink: true }} />
      <TextInput source="end_time" type="time" InputLabelProps={{ shrink: true }} />
    </Box>
    <Box display="flex" gap={2} sx={{ "& > *": { flex: 1 } }}>
      <NumberInput source="hours" validate={required()} step={0.5} />
      <NumberInput source="break_minutes" defaultValue={0} />
    </Box>
    <BooleanInput source="is_active" defaultValue={true} />
    <BooleanInput source="is_composite" />
    <SegmentsInput />
  </>
);

export const ShiftTypeEdit = () => (
  <Edit
    mutationMode="pessimistic"
    transform={(data: any) => ({
      ...data,
      segments: data.segments || [],
    })}
  >
    <SimpleForm>
      <ShiftTypeForm isEdit />
    </SimpleForm>
  </Edit>
);

export const ShiftTypeCreate = () => (
  <Create
    redirect="list"
    transform={(data: any) => ({
      ...data,
      segments: data.segments || [],
    })}
  >
    <SimpleForm>
      <ShiftTypeForm />
    </SimpleForm>
  </Create>
);
