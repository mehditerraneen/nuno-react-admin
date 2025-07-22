import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Tab,
  Tabs,
} from "@mui/material";
import {
  CalendarToday,
  Person,
  Route,
  Add,
  Edit,
  Refresh,
  Dashboard,
  Timeline,
} from "@mui/icons-material";
import { useDataProvider, useNotify } from "react-admin";
import { Event, Employee, Tour } from "../../types/tours";
import { ToursCalendar } from "./ToursCalendar";
import { RouteOptimization } from "./RouteOptimization";

export const ToursDashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedEmployee, setSelectedEmployee] = useState<number | "">("");
  const [events, setEvents] = useState<Event[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const dataProvider = useDataProvider();
  const notify = useNotify();

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params: any = { date: selectedDate };
      if (selectedEmployee) params.employee_id = selectedEmployee;

      const { data } = await dataProvider.getDailyEvents(
        selectedDate,
        selectedEmployee || undefined,
      );
      setEvents(data);
    } catch (error) {
      notify("Failed to load events", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data } = await dataProvider.getList("employees", {
        pagination: { page: 1, perPage: 100 },
        sort: { field: "name", order: "ASC" },
        filter: { active: true },
      });
      setEmployees(data);
    } catch (error) {
      notify("Failed to load employees", { type: "error" });
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [selectedDate, selectedEmployee]);

  const groupedEvents = employees.map((employee) => ({
    employee,
    events: events.filter((event) => event.employee_id === employee.id),
    totalDuration: events
      .filter((event) => event.employee_id === employee.id)
      .reduce((total, event) => {
        const start = new Date(`2000-01-01T${event.time_start}`);
        const end = new Date(`2000-01-01T${event.time_end}`);
        return (
          total + Math.round((end.getTime() - start.getTime()) / (1000 * 60))
        );
      }, 0),
  }));

  const unassignedEvents = events.filter((event) => !event.employee_id);

  const handleEventSelect = (event: Event) => {
    window.location.href = `#/events/${event.id}`;
  };

  const handleDateSelect = (slotInfo: { start: Date; end: Date }) => {
    const date = slotInfo.start.toISOString().split("T")[0];
    const time = slotInfo.start.toTimeString().substring(0, 5);
    window.location.href = `#/events/create?date=${date}&time_start=${time}`;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <Grid container spacing={3}>
            {/* Calendar View */}
            <Grid item xs={12} lg={8}>
              <ToursCalendar
                events={events}
                employees={employees}
                onEventSelect={handleEventSelect}
                onDateSelect={handleDateSelect}
              />
            </Grid>

            {/* Side Panel */}
            <Grid item xs={12} lg={4}>
              {/* Unassigned Events */}
              <Card sx={{ mb: 2 }}>
                <CardHeader title="Unassigned Events" />
                <CardContent>
                  {unassignedEvents.length === 0 ? (
                    <Typography color="textSecondary">
                      No unassigned events
                    </Typography>
                  ) : (
                    <List>
                      {unassignedEvents.map((event) => (
                        <ListItem key={event.id}>
                          <ListItemText
                            primary={`${event.time_start} - ${event.time_end}`}
                            secondary={`Patient: ${event.patient_id} | ${event.event_type}`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              href={`#/events/${event.id}`}
                              size="small"
                            >
                              <Edit />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>

              {/* Daily Summary */}
              <Card>
                <CardHeader title="Daily Summary" />
                <CardContent>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Total Events:</Typography>
                      <Typography>{events.length}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Assigned:</Typography>
                      <Typography>
                        {events.filter((e) => e.employee_id).length}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Unassigned:</Typography>
                      <Typography>{unassignedEvents.length}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Active Employees:</Typography>
                      <Typography>
                        {employees.filter((e) => e.active).length}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            {/* Employee List View */}
            <Grid item xs={12}>
              {groupedEvents.map(
                ({ employee, events: employeeEvents, totalDuration }) => (
                  <Paper key={employee.id} sx={{ mb: 2, p: 2 }}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={1}
                    >
                      <Typography
                        variant="h6"
                        style={{ color: employee.color }}
                      >
                        <Person /> {employee.name} ({employee.abbreviation})
                      </Typography>
                      <Chip
                        label={`${employeeEvents.length} visits - ${Math.round(totalDuration / 60)}h ${totalDuration % 60}m`}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                    <List dense>
                      {employeeEvents.length === 0 ? (
                        <ListItem>
                          <ListItemText primary="No visits scheduled" />
                        </ListItem>
                      ) : (
                        employeeEvents
                          .sort((a, b) =>
                            a.time_start.localeCompare(b.time_start),
                          )
                          .map((event) => (
                            <ListItem key={event.id}>
                              <ListItemText
                                primary={`${event.time_start} - ${event.time_end}`}
                                secondary={`Patient: ${event.patient_id} | Type: ${event.event_type}`}
                              />
                              <ListItemSecondaryAction>
                                <IconButton
                                  href={`#/events/${event.id}`}
                                  size="small"
                                >
                                  <Edit />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))
                      )}
                    </List>
                  </Paper>
                ),
              )}
            </Grid>
          </Grid>
        );

      case 2:
        return <RouteOptimization onOptimizationComplete={loadEvents} />;

      default:
        return null;
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Tours Dashboard
      </Typography>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: "10px", width: "100%" }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Employee</InputLabel>
                <Select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                >
                  <MenuItem value="">All Employees</MenuItem>
                  {employees.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={loadEvents}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<Add />}
                  href="#/events/create"
                >
                  New Event
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab icon={<CalendarToday />} label="Calendar View" />
            <Tab icon={<Dashboard />} label="Schedule List" />
            <Tab icon={<Timeline />} label="Route Optimization" />
          </Tabs>
        </Box>
        <CardContent>{renderTabContent()}</CardContent>
      </Card>
    </Box>
  );
};
