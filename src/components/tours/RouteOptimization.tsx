import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Chip,
  Divider,
} from "@mui/material";
import {
  Route as RouteIcon,
  AccessTime,
  LocationOn,
  Person,
  TrendingUp,
  Speed,
  Timer,
} from "@mui/icons-material";
import { useDataProvider, useNotify } from "react-admin";
import { Event, Employee } from "../../types/tours";

interface RouteOptimizationProps {
  onOptimizationComplete?: () => void;
}

export const RouteOptimization: React.FC<RouteOptimizationProps> = ({
  onOptimizationComplete,
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<number | "">("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [tourEvents, setTourEvents] = useState<Event[]>([]);

  const dataProvider = useDataProvider();
  const notify = useNotify();

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

  const loadTourEvents = async () => {
    if (!selectedEmployee) return;

    try {
      const { data } = await dataProvider.getDailyEvents(
        selectedDate,
        selectedEmployee as number,
      );
      const employeeEvents = data.filter(
        (event: Event) => event.employee_id === selectedEmployee,
      );
      setTourEvents(employeeEvents);
    } catch (error) {
      notify("Failed to load tour events", { type: "error" });
    }
  };

  const handleOptimize = async () => {
    if (!selectedEmployee) {
      notify("Please select an employee to optimize their tour", {
        type: "warning",
      });
      return;
    }

    setOptimizing(true);
    try {
      const result = await dataProvider.optimizeTour(
        selectedEmployee as number,
        selectedDate,
      );
      setOptimizationResult(result);
      notify("Tour optimized successfully");

      // Reload tour events to show optimized order
      await loadTourEvents();

      if (onOptimizationComplete) {
        onOptimizationComplete();
      }
    } catch (error) {
      notify("Failed to optimize tour", { type: "error" });
    } finally {
      setOptimizing(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    loadTourEvents();
  }, [selectedEmployee, selectedDate]);

  const calculateTourStats = () => {
    if (tourEvents.length === 0) return null;

    let totalTravelTime = 0;
    let totalVisitTime = 0;

    tourEvents.forEach((event) => {
      const start = new Date(`2000-01-01T${event.time_start}`);
      const end = new Date(`2000-01-01T${event.time_end}`);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutes
      totalVisitTime += duration;
    });

    // Estimate travel time between visits (simplified calculation)
    if (tourEvents.length > 1) {
      totalTravelTime = (tourEvents.length - 1) * 15; // 15 minutes average between visits
    }

    return {
      totalEvents: tourEvents.length,
      totalVisitTime,
      totalTravelTime,
      totalDuration: totalVisitTime + totalTravelTime,
      efficiency: (totalVisitTime / (totalVisitTime + totalTravelTime)) * 100,
    };
  };

  const tourStats = calculateTourStats();

  return (
    <Card>
      <CardHeader title="Route Optimization" avatar={<RouteIcon />} />
      <CardContent>
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: "10px", minWidth: "150px" }}
          />

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Employee</InputLabel>
            <Select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              label="Employee"
            >
              <MenuItem value="">Select Employee</MenuItem>
              {employees.map((employee) => (
                <MenuItem key={employee.id} value={employee.id}>
                  {employee.name} ({employee.abbreviation})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            onClick={handleOptimize}
            disabled={optimizing || !selectedEmployee}
            startIcon={
              optimizing ? <CircularProgress size={20} /> : <TrendingUp />
            }
          >
            {optimizing ? "Optimizing..." : "Optimize Route"}
          </Button>
        </Box>

        {/* Tour Statistics */}
        {tourStats && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tour Statistics
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Chip
                icon={<Person />}
                label={`${tourStats.totalEvents} visits`}
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<AccessTime />}
                label={`${Math.round(tourStats.totalVisitTime / 60)}h ${tourStats.totalVisitTime % 60}m visits`}
                color="secondary"
                variant="outlined"
              />
              <Chip
                icon={<Speed />}
                label={`${Math.round(tourStats.totalTravelTime / 60)}h ${tourStats.totalTravelTime % 60}m travel`}
                color="warning"
                variant="outlined"
              />
              <Chip
                icon={<Timer />}
                label={`${Math.round(tourStats.totalDuration / 60)}h ${tourStats.totalDuration % 60}m total`}
                color="info"
                variant="outlined"
              />
              <Chip
                label={`${Math.round(tourStats.efficiency)}% efficiency`}
                color={
                  tourStats.efficiency > 75
                    ? "success"
                    : tourStats.efficiency > 50
                      ? "warning"
                      : "error"
                }
                variant="filled"
              />
            </Box>
          </Paper>
        )}

        {/* Optimization Result */}
        {optimizationResult && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: "#f5f5f5" }}>
            <Typography variant="h6" gutterBottom color="success.main">
              ✅ Optimization Complete
            </Typography>
            <Typography variant="body2">
              Route has been optimized for{" "}
              {employees.find((e) => e.id === selectedEmployee)?.name}
            </Typography>
            {optimizationResult.saved_time && (
              <Typography variant="body2" color="success.main">
                Estimated time saved: {optimizationResult.saved_time} minutes
              </Typography>
            )}
            {optimizationResult.total_distance && (
              <Typography variant="body2">
                Total distance: {optimizationResult.total_distance} km
              </Typography>
            )}
          </Paper>
        )}

        {/* Tour Events List */}
        {tourEvents.length > 0 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Optimized Route ({selectedDate})
            </Typography>
            <List>
              {tourEvents
                .sort((a, b) => a.time_start.localeCompare(b.time_start))
                .map((event, index) => (
                  <React.Fragment key={event.id}>
                    <ListItem>
                      <ListItemIcon>
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            backgroundColor: "primary.main",
                            color: "white",
                            fontSize: "0.875rem",
                            fontWeight: "bold",
                          }}
                        >
                          {index + 1}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <AccessTime fontSize="small" />
                            <Typography variant="body1">
                              {event.time_start} - {event.time_end}
                            </Typography>
                            <Chip
                              label={event.event_type.replace("_", " ")}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              Patient ID: {event.patient_id}
                            </Typography>
                            {event.event_address && (
                              <Box
                                display="flex"
                                alignItems="center"
                                gap={0.5}
                                mt={0.5}
                              >
                                <LocationOn fontSize="small" />
                                <Typography
                                  variant="body2"
                                  color="textSecondary"
                                >
                                  {event.event_address}
                                </Typography>
                              </Box>
                            )}
                            {event.notes && (
                              <Typography
                                variant="body2"
                                color="textSecondary"
                                sx={{ mt: 0.5 }}
                              >
                                Notes: {event.notes}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < tourEvents.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
            </List>
          </Paper>
        )}

        {selectedEmployee && tourEvents.length === 0 && (
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="body1" color="textSecondary">
              No visits scheduled for{" "}
              {employees.find((e) => e.id === selectedEmployee)?.name} on{" "}
              {selectedDate}
            </Typography>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
};
