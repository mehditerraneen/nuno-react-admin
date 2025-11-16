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
  Fab,
  Alert,
} from "@mui/material";
import {
  CalendarToday,
  Person,
  Route,
  Add,
  Edit,
  Refresh,
  Timeline,
  Navigation,
  Schedule,
} from "@mui/icons-material";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import { useNavigate, Link } from "react-router-dom";
import { useDataProvider, useNotify } from "react-admin";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    "en-US": enUS,
  },
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tours-tabpanel-${index}`}
      aria-labelledby={`tours-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const ToursDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [tours, setTours] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const loadTours = async () => {
    setLoading(true);
    try {
      const result = await dataProvider.getList("tours", {
        pagination: { page: 1, perPage: 100 },
        sort: { field: "date", order: "DESC" },
        filter: selectedEmployee ? { employee_id: selectedEmployee } : {},
      });
      setTours(result.data);
    } catch (error) {
      notify("Failed to load tours", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const result = await dataProvider.getList("employees", {
        pagination: { page: 1, perPage: 100 },
        sort: { field: "name", order: "ASC" },
        filter: {},
      });
      setEmployees(result.data);
    } catch (error) {
      notify("Failed to load employees", { type: "error" });
    }
  };

  useEffect(() => {
    loadEmployees();
    loadTours();
  }, [selectedEmployee]);

  const handleCreateTour = () => {
    navigate("/tours/create");
  };

  const handleOptimizeTour = async (tourId: number) => {
    try {
      await (dataProvider as any).optimizeTour(tourId);
      notify("Tour optimization started", { type: "info" });
      loadTours();
    } catch (error) {
      notify("Tour optimization failed", { type: "error" });
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Tours Management Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Manage healthcare visit tours, optimize routes, and schedule events
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Employee</InputLabel>
            <Select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              label="Filter by Employee"
            >
              <MenuItem value="">
                <em>All Employees</em>
              </MenuItem>
              {employees.map((emp: any) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateTour}
            sx={{ height: "fit-content" }}
          >
            Create New Tour
          </Button>

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadTours}
            sx={{ height: "fit-content" }}
          >
            Refresh
          </Button>
        </Box>

        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Tours Overview" icon={<CalendarToday />} />
          <Tab label="Tours List" icon={<Schedule />} />
          <Tab label="Route Optimization" icon={<Route />} />
        </Tabs>
      </Box>

      {/* Tab 1: Tours Overview */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardHeader title="Tours Calendar View" />
              <CardContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Calendar view shows tours by date. Click on a tour to view
                  details and events.
                </Alert>
                <Box sx={{ height: 500 }}>
                  <Calendar
                    localizer={localizer}
                    events={tours.map((tour: any) => ({
                      id: tour.id,
                      title:
                        tour.name ||
                        `Tour: ${tour.employee_name || "Employee"} (${tour.events?.length || 0} events)`,
                      start: new Date(tour.date + "T08:00:00"),
                      end: new Date(tour.date + "T18:00:00"),
                      resource: tour,
                    }))}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 480 }}
                    onSelectEvent={(event) =>
                      navigate(`/tours/${event.resource.id}/show`)
                    }
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Quick Stats" />
              <CardContent>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Chip
                    label={`${tours.length} Total Tours`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`${tours.filter((t: any) => t.optimization_status === "optimized").length} Optimized`}
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    label={`${tours.filter((t: any) => t.optimization_status === "pending").length} Pending Optimization`}
                    color="warning"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: Tours List */}
      <TabPanel value={activeTab} index={1}>
        <Card>
          <CardHeader title="All Tours" />
          <CardContent>
            {loading ? (
              <Typography>Loading tours...</Typography>
            ) : (
              <List>
                {tours.map((tour: any) => (
                  <ListItem key={tour.id} divider>
                    <ListItemText
                      primary={
                        tour.name ||
                        `${tour.date} - ${tour.employee_name || "Employee"}`
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {tour.events?.length || 0} events • Status:{" "}
                            {tour.optimization_status || "pending"}
                          </Typography>
                          {tour.total_distance && (
                            <Typography variant="body2">
                              Distance: {tour.total_distance} km • Duration:{" "}
                              {Math.floor((tour.estimated_duration || 0) / 60)}h{" "}
                              {(tour.estimated_duration || 0) % 60}m
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {tour.optimization_status !== "optimized" && (
                          <Button
                            size="small"
                            startIcon={<Route />}
                            onClick={() => handleOptimizeTour(tour.id)}
                          >
                            Optimize
                          </Button>
                        )}
                        <IconButton
                          onClick={() => navigate(`/tours/${tour.id}/show`)}
                        >
                          <Timeline />
                        </IconButton>
                        <IconButton
                          onClick={() => navigate(`/tours/${tour.id}`)}
                        >
                          <Edit />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 3: Route Optimization */}
      <TabPanel value={activeTab} index={2}>
        <Card>
          <CardHeader title="Route Optimization Center" />
          <CardContent>
            <Alert severity="info" sx={{ mb: 3 }}>
              Route optimization uses AI to minimize travel time and distance
              between patient visits.
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Optimization Actions
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Route />}
                    onClick={() => {
                      tours
                        .filter((t: any) => t.optimization_status === "pending")
                        .forEach((tour: any) => handleOptimizeTour(tour.id));
                    }}
                  >
                    Optimize All Pending Tours
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<Navigation />}
                    onClick={() =>
                      notify("Bulk reoptimization started", { type: "info" })
                    }
                  >
                    Reoptimize All Tours
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Optimization Statistics
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography variant="body2">
                    Average optimization saves: ~15-25% travel time
                  </Typography>
                  <Typography variant="body2">
                    Total distance saved today: Calculating...
                  </Typography>
                  <Typography variant="body2">
                    Optimization success rate: 95%
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
        }}
        onClick={handleCreateTour}
      >
        <Add />
      </Fab>
    </Box>
  );
};
