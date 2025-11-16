import React from "react";
import {
  List,
  Datagrid,
  TextField,
  DateField,
  FunctionField,
  EditButton,
  DeleteButton,
  Edit,
  SimpleForm,
  DateInput,
  TextInput,
  ReferenceInput,
  ReferenceField,
  SelectInput,
  Create,
  Show,
  SimpleShowLayout,
  ReferenceManyField,
  ChipField,
  Button,
  useRecordContext,
  useUpdate,
  useNotify,
  useRefresh,
} from "react-admin";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Grid,
  Paper,
} from "@mui/material";
import {
  Route as RouteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Schedule,
  Coffee,
} from "@mui/icons-material";
import { Tour } from "../../types/tours";

// Tours List Component
export const TourList = () => (
  <List
    sort={{ field: "date", order: "DESC" }}
    filters={[
      <DateInput source="date" label="Date" alwaysOn />,
      <ReferenceInput
        source="employee_id"
        reference="employees"
        label="Employee"
      >
        <SelectInput optionText="name" />
      </ReferenceInput>,
    ]}
  >
    <Datagrid>
      <TextField source="name" label="Tour Name" />
      <DateField source="date" />
      <ReferenceField source="employee_id" reference="employees" link={false}>
        <TextField source="name" />
      </ReferenceField>
      <FunctionField
        source="events"
        label="Events Count"
        render={(record: Tour) => (
          <Chip
            label={`${record.events?.length || 0} events`}
            color="primary"
            size="small"
          />
        )}
      />
      <FunctionField
        source="total_distance"
        label="Distance"
        render={(record: Tour) =>
          record.total_distance
            ? `${record.total_distance} km`
            : "Not calculated"
        }
      />
      <FunctionField
        source="estimated_duration"
        label="Duration"
        render={(record: Tour) => {
          if (!record.estimated_duration) return "Not calculated";
          const hours = Math.floor(record.estimated_duration / 60);
          const minutes = record.estimated_duration % 60;
          return `${hours}h ${minutes}m`;
        }}
      />
      <FunctionField
        source="optimization_status"
        label="Status"
        render={(record: Tour) => {
          const colors = {
            pending: "warning",
            optimized: "success",
            manual: "info",
          } as const;
          return (
            <Chip
              label={record.optimization_status || "pending"}
              color={colors[record.optimization_status] || "default"}
              size="small"
            />
          );
        }}
      />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

// Tour Optimization Button Component
const OptimizeTourButton = () => {
  const record = useRecordContext<Tour>();
  const [update] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();

  const handleOptimize = async () => {
    try {
      // Call the tour optimization endpoint
      await fetch(
        `${import.meta.env.VITE_SIMPLE_REST_URL}/tours/${record.id}/optimize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("auth_access_token") || "",
          },
        },
      );

      notify("Tour optimization started", { type: "info" });
      refresh();
    } catch (error) {
      notify("Tour optimization failed", { type: "error" });
    }
  };

  return (
    <Button
      onClick={handleOptimize}
      startIcon={<RouteIcon />}
      variant="contained"
      color="secondary"
      size="small"
    >
      Optimize Route
    </Button>
  );
};

// Tours Edit Component
export const TourEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput
        source="name"
        label="Tour Name"
        placeholder="e.g., Morning Route - North District"
        fullWidth
      />
      <DateInput source="date" />
      <ReferenceInput
        source="employee_id"
        reference="employees"
        sort={{ field: "name", order: "ASC" }}
        perPage={100}
      >
        <SelectInput optionText="name" />
      </ReferenceInput>

      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Route Optimization
        </Typography>
        <OptimizeTourButton />
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Assigned Events
        </Typography>
        <TourEventsManagement />
      </Box>
    </SimpleForm>
  </Edit>
);

// Tour Events Management Component
const TourEventsManagement = () => {
  const record = useRecordContext<Tour>();

  if (!record) return null;

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">Tour Events</Typography>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            href={`#/events/create?tour_id=${record.id}&date=${record.date}&employee_id=${record.employee_id}`}
          >
            Add Event
          </Button>
        </Box>

        <ReferenceManyField
          reference="events"
          target="tour_id"
          sort={{ field: "time_start", order: "ASC" }}
        >
          <Datagrid bulkActionButtons={false}>
            <TextField source="time_start" />
            <TextField source="time_end" />
            <ReferenceField
              source="patient_id"
              reference="patients"
              link={false}
            >
              <TextField source="first_name" />
            </ReferenceField>
            <TextField source="notes" />
            <FunctionField
              source="duration"
              label="Duration"
              render={(record: any) => {
                if (!record.time_start || !record.time_end) return "";
                const start = new Date(`2000-01-01T${record.time_start}`);
                const end = new Date(`2000-01-01T${record.time_end}`);
                const diff = Math.round(
                  (end.getTime() - start.getTime()) / (1000 * 60),
                );
                return `${diff} min`;
              }}
            />
            <EditButton />
          </Datagrid>
        </ReferenceManyField>
      </CardContent>
    </Card>
  );
};

// Tours Create Component
export const TourCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput
        source="name"
        label="Tour Name"
        placeholder="e.g., Morning Route - North District"
        fullWidth
      />
      <DateInput
        source="date"
        defaultValue={new Date().toISOString().split("T")[0]}
      />
      <ReferenceInput
        source="employee_id"
        reference="employees"
        sort={{ field: "name", order: "ASC" }}
        perPage={100}
      >
        <SelectInput optionText="name" />
      </ReferenceInput>

      <Box sx={{ display: "flex", gap: 2 }}>
        <TextInput
          source="time_start"
          label="Start Time"
          type="time"
          defaultValue="08:00"
        />
        <TextInput
          source="time_end"
          label="End Time"
          type="time"
          defaultValue="17:00"
        />
      </Box>

      <TextInput
        source="break_duration"
        label="Break Duration (minutes)"
        type="number"
        defaultValue={30}
      />

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        After creating the tour, you can add events and optimize the route.
      </Typography>
    </SimpleForm>
  </Create>
);

// Tours Show Component (Detailed View)
export const TourShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="name" label="Tour Name" />
      <DateField source="date" />
      <ReferenceField source="employee_id" reference="employees">
        <TextField source="name" />
      </ReferenceField>

      <FunctionField
        source="schedule"
        label="Schedule"
        render={(record: Tour) => (
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            {record.time_start && record.time_end ? (
              <>
                <Chip
                  icon={<Schedule />}
                  label={`${record.time_start} - ${record.time_end}`}
                  color="primary"
                />
                {record.break_duration && (
                  <Chip
                    icon={<Coffee />}
                    label={`${record.break_duration} min break`}
                    color="secondary"
                    variant="outlined"
                  />
                )}
              </>
            ) : (
              <Chip label="Schedule TBD" color="default" />
            )}
          </Box>
        )}
      />

      <FunctionField
        source="optimization_status"
        label="Optimization Status"
        render={(record: Tour) => (
          <Chip
            label={record.optimization_status || "pending"}
            color={
              record.optimization_status === "optimized"
                ? "success"
                : record.optimization_status === "manual"
                  ? "info"
                  : "warning"
            }
          />
        )}
      />

      <FunctionField
        source="total_distance"
        label="Total Distance"
        render={(record: Tour) =>
          record.total_distance
            ? `${record.total_distance} km`
            : "Not calculated"
        }
      />

      <FunctionField
        source="estimated_duration"
        label="Estimated Duration"
        render={(record: Tour) => {
          if (!record.estimated_duration) return "Not calculated";
          const hours = Math.floor(record.estimated_duration / 60);
          const minutes = record.estimated_duration % 60;
          return `${hours}h ${minutes}m`;
        }}
      />

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Tour Events (Ordered by Time)
        </Typography>
        <ReferenceManyField
          reference="events"
          target="tour_id"
          sort={{ field: "time_start", order: "ASC" }}
        >
          <Datagrid bulkActionButtons={false}>
            <TextField source="time_start" />
            <TextField source="time_end" />
            <ReferenceField source="patient_id" reference="patients">
              <FunctionField
                render={(record: any) => `${record.first_name} ${record.name}`}
              />
            </ReferenceField>
            <TextField source="event_address" />
            <TextField source="notes" />
            <EditButton />
          </Datagrid>
        </ReferenceManyField>
      </Box>

      <Box sx={{ mt: 2 }}>
        <OptimizeTourButton />
      </Box>
    </SimpleShowLayout>
  </Show>
);
