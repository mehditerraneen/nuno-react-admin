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
        source="total_distance_km"
        label="Distance"
        render={(record: Tour) =>
          record.total_distance_km
            ? `${record.total_distance_km} km`
            : "Not calculated"
        }
      />
      <FunctionField
        source="total_travel_time_minutes"
        label="Travel Time"
        render={(record: Tour) => {
          if (!record.total_travel_time_minutes) return "Not calculated";
          const hours = Math.floor(record.total_travel_time_minutes / 60);
          const minutes = record.total_travel_time_minutes % 60;
          return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}min`;
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

// Gantt-style timeline bar for the Tour Show view
const TourTimeline = () => {
  const record = useRecordContext<any>();
  if (!record) return null;

  const events: any[] = record.events || [];
  const travelSegments: any[] = record.travel_segments || [];
  const tourStart = record.time_start || record.planned_start || "06:00";
  const tourEnd = record.time_end || record.planned_end || "20:00";

  const toMin = (t: string) => {
    if (!t) return 0;
    const parts = t.split(":");
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  const startMin = toMin(tourStart);
  const endMin = toMin(tourEnd);
  const totalMin = Math.max(endMin - startMin, 1);

  const sorted = [...events]
    .filter((e) => e.time_start && e.time_end)
    .sort((a, b) => (a.time_start > b.time_start ? 1 : -1));

  // Build travel lookup: from_event_id → segment
  const travelMap: { [key: string]: any } = {};
  travelSegments.forEach((s: any) => {
    travelMap[`${s.from_event?.id || s.from_event_id}`] = s;
  });

  const colors = [
    "#1976d2", "#388e3c", "#f57c00", "#7b1fa2", "#c62828",
    "#00838f", "#4e342e", "#283593", "#558b2f", "#ad1457",
  ];

  // Hour markers
  const hours: number[] = [];
  for (let h = Math.floor(startMin / 60); h <= Math.ceil(endMin / 60); h++) {
    if (h * 60 >= startMin && h * 60 <= endMin) hours.push(h);
  }

  // Stats
  const totalCare = sorted.reduce((sum, e) => sum + (toMin(e.time_end) - toMin(e.time_start)), 0);
  const totalTravel = travelSegments.reduce(
    (sum: number, s: any) => sum + (s.duration_minutes || 0),
    0
  );
  const totalDist = travelSegments.reduce(
    (sum: number, s: any) => sum + (s.distance_km ? parseFloat(s.distance_km) : 0),
    0
  );

  return (
    <Box>
      {/* Header stats */}
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Chip icon={<Schedule />} label={`${tourStart} - ${tourEnd}`} color="primary" />
        {record.break_duration && (
          <Chip icon={<Coffee />} label={`${record.break_duration}min break`} variant="outlined" />
        )}
        <Chip label={`${sorted.length} events`} color="info" variant="outlined" />
        <Chip label={`${totalCare}min care`} color="success" variant="outlined" />
        {totalTravel > 0 && <Chip label={`${totalTravel}min travel`} color="warning" variant="outlined" />}
        {totalDist > 0 && <Chip label={`${totalDist.toFixed(1)}km`} color="secondary" variant="outlined" />}
        <Chip
          label={record.optimization_status || "pending"}
          color={record.optimization_status === "optimized" ? "success" : "warning"}
          size="small"
        />
      </Box>

      {/* Timeline header with hour markers */}
      <Box sx={{ position: "relative", height: 24, mb: 0.5, ml: "180px" }}>
        {hours.map((h) => {
          const left = ((h * 60 - startMin) / totalMin) * 100;
          return (
            <Typography
              key={h}
              variant="caption"
              sx={{
                position: "absolute",
                left: `${left}%`,
                transform: "translateX(-50%)",
                color: "text.secondary",
                fontSize: "0.7rem",
              }}
            >
              {`${h}:00`}
            </Typography>
          );
        })}
      </Box>

      {/* Event bars */}
      {sorted.map((evt, idx) => {
        const evtStart = toMin(evt.time_start);
        const evtEnd = toMin(evt.time_end);
        const left = ((evtStart - startMin) / totalMin) * 100;
        const width = ((evtEnd - evtStart) / totalMin) * 100;
        const dur = evtEnd - evtStart;
        const color = colors[idx % colors.length];

        // Find travel to next event
        const nextEvt = sorted[idx + 1];
        let travelLeft = 0;
        let travelWidth = 0;
        const travelSeg = travelSegments.find(
          (s: any) => s.from_event_id === evt.id || (nextEvt && s.to_event_id === nextEvt.id && s.from_event_id === evt.id)
        );
        if (nextEvt && travelSeg) {
          travelLeft = ((evtEnd - startMin) / totalMin) * 100;
          const travelEnd = Math.min(toMin(nextEvt.time_start), endMin);
          travelWidth = ((travelEnd - evtEnd) / totalMin) * 100;
        }

        return (
          <Box
            key={evt.id}
            sx={{ display: "flex", alignItems: "center", mb: 0.75, height: 36 }}
          >
            {/* Patient label */}
            <Box sx={{ width: 180, flexShrink: 0, pr: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: "bold",
                  fontSize: "0.7rem",
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "block",
                }}
                title={evt.patient_name}
              >
                {evt.patient_name}
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontSize: "0.6rem", color: "text.secondary" }}
              >
                {evt.time_start?.slice(0, 5)} - {evt.time_end?.slice(0, 5)} ({dur}min)
              </Typography>
            </Box>

            {/* Bar area */}
            <Box
              sx={{
                flex: 1,
                position: "relative",
                height: "100%",
                bgcolor: "#f5f5f5",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              {/* Hour grid lines */}
              {hours.map((h) => {
                const x = ((h * 60 - startMin) / totalMin) * 100;
                return (
                  <Box
                    key={h}
                    sx={{
                      position: "absolute",
                      left: `${x}%`,
                      top: 0,
                      bottom: 0,
                      width: "1px",
                      bgcolor: "#e0e0e0",
                    }}
                  />
                );
              })}

              {/* Event bar */}
              <Box
                sx={{
                  position: "absolute",
                  left: `${Math.max(left, 0)}%`,
                  width: `${Math.min(width, 100 - left)}%`,
                  top: 2,
                  bottom: 2,
                  bgcolor: color,
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  px: 0.5,
                  overflow: "hidden",
                  cursor: "default",
                }}
                title={`${evt.patient_name}\n${evt.time_start?.slice(0, 5)} - ${evt.time_end?.slice(0, 5)} (${dur}min)\n${evt.notes || ""}`}
              >
                <Typography
                  sx={{
                    color: "white",
                    fontSize: "0.6rem",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {width > 8 ? evt.patient_name?.split(" ")[0] : ""}{" "}
                  {width > 15 ? `(${dur}′)` : ""}
                </Typography>
              </Box>

              {/* Travel bar */}
              {travelWidth > 0.2 && (
                <Box
                  sx={{
                    position: "absolute",
                    left: `${travelLeft}%`,
                    width: `${travelWidth}%`,
                    top: "30%",
                    bottom: "30%",
                    bgcolor: "#ffcc80",
                    borderRadius: 0.5,
                    opacity: 0.7,
                  }}
                  title={`Travel: ${travelSeg?.duration_minutes || "?"}min • ${travelSeg?.distance_km ? parseFloat(travelSeg.distance_km).toFixed(1) : "?"}km`}
                />
              )}
            </Box>
          </Box>
        );
      })}

      {/* Legend */}
      {sorted.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No events assigned to this tour yet.
        </Typography>
      )}

      {/* Notes section */}
      {sorted.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Notes</Typography>
          {sorted.filter((e) => e.notes).map((e) => (
            <Typography key={e.id} variant="caption" display="block" sx={{ mb: 0.5, color: "text.secondary" }}>
              <strong>{e.patient_name}</strong>: {e.notes}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
};

// Tours Show Component (Detailed View)
export const TourShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="name" label="Tour Name" />
      <DateField source="date" />
      <ReferenceField source="employee_id" reference="employees">
        <TextField source="name" />
      </ReferenceField>

      <TourTimeline />

      <Box sx={{ mt: 2 }}>
        <OptimizeTourButton />
      </Box>
    </SimpleShowLayout>
  </Show>
);
