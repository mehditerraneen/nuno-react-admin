import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Box,
  Typography,
  Chip,
  IconButton,
  Button,
  Paper,
  Avatar,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Add as AddIcon,
  Person,
  Schedule,
  Route as RouteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { useDataProvider, useNotify } from "react-admin";
import { useNavigate } from "react-router-dom";
import { Tour, Employee } from "../../types/tours";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
} from "date-fns";

interface WeeklyTourCalendarProps {
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
}

export const WeeklyTourCalendar: React.FC<WeeklyTourCalendarProps> = ({
  selectedDate = new Date(),
  onDateChange,
}) => {
  const [currentWeek, setCurrentWeek] = useState(selectedDate);
  const [tours, setTours] = useState<Tour[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start week on Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    loadWeeklyData();
  }, [currentWeek]);

  const loadWeeklyData = async () => {
    setLoading(true);
    try {
      const [toursResponse, employeesResponse] = await Promise.all([
        dataProvider.getList("tours", {
          pagination: { page: 1, perPage: 1000 },
          sort: { field: "date", order: "ASC" },
          filter: {
            date_gte: format(weekStart, "yyyy-MM-dd"),
            date_lte: format(weekEnd, "yyyy-MM-dd"),
          },
        }),
        dataProvider.getList("employees", {
          pagination: { page: 1, perPage: 100 },
          sort: { field: "name", order: "ASC" },
          filter: {},
        }),
      ]);

      setTours(toursResponse.data);
      setEmployees(employeesResponse.data);
    } catch (error) {
      notify("Failed to load weekly tour data", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newWeek =
      direction === "prev"
        ? subWeeks(currentWeek, 1)
        : addWeeks(currentWeek, 1);
    setCurrentWeek(newWeek);
    onDateChange?.(newWeek);
  };

  const getToursByDay = (day: Date) => {
    return tours.filter((tour) => isSameDay(new Date(tour.date), day));
  };

  const getToursByEmployee = (employeeId: number, day: Date) => {
    return getToursByDay(day).filter((tour) => tour.employee_id === employeeId);
  };

  const getEmployeeColor = (employeeId: number) => {
    const colors = [
      "#1976d2",
      "#388e3c",
      "#f57c00",
      "#7b1fa2",
      "#d32f2f",
      "#0097a7",
    ];
    const employee = employees.find((e) => e.id === employeeId);
    return employee?.color || colors[employeeId % colors.length];
  };

  const handleCreateTour = (date: Date, employeeId?: number) => {
    const params = new URLSearchParams({
      date: format(date, "yyyy-MM-dd"),
      ...(employeeId && { employee_id: employeeId.toString() }),
    });
    navigate(`/tours/create?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h5">
              Week of {format(weekStart, "MMM d")} -{" "}
              {format(weekEnd, "MMM d, yyyy")}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton onClick={() => navigateWeek("prev")}>
                <ChevronLeft />
              </IconButton>
              <Button
                variant="outlined"
                onClick={() => {
                  setCurrentWeek(new Date());
                  onDateChange?.(new Date());
                }}
              >
                Today
              </Button>
              <IconButton onClick={() => navigateWeek("next")}>
                <ChevronRight />
              </IconButton>
            </Box>
          </Box>
        }
      />
      <CardContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Week Overview Stats */}
        <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Chip
            icon={<Schedule />}
            label={`${tours.length} Tours This Week`}
            color="primary"
          />
          <Chip
            icon={<Person />}
            label={`${new Set(tours.map((t) => t.employee_id)).size} Active Employees`}
            color="secondary"
          />
          <Chip
            icon={<RouteIcon />}
            label={`${tours.reduce((sum, t) => sum + (t.events?.length || 0), 0)} Total Events`}
            color="info"
          />
        </Box>

        {/* Calendar Grid */}
        <Grid container spacing={1}>
          {/* Employee Column */}
          <Grid item xs={2}>
            <Paper
              sx={{
                p: 1,
                height: 60,
                display: "flex",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography variant="h6" color="primary">
                Employees
              </Typography>
            </Paper>
            {employees.map((employee) => (
              <Paper
                key={employee.id}
                sx={{
                  p: 2,
                  mb: 1,
                  minHeight: 100,
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#f8f9fa",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Avatar
                    sx={{
                      bgcolor: getEmployeeColor(employee.id),
                      width: 32,
                      height: 32,
                      fontSize: "0.875rem",
                    }}
                  >
                    {employee.name.substring(0, 2).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {employee.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {
                        tours.filter((t) => t.employee_id === employee.id)
                          .length
                      }{" "}
                      tours
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Grid>

          {/* Day Columns */}
          {weekDays.map((day) => (
            <Grid item xs={10 / 7} key={day.toISOString()}>
              {/* Day Header */}
              <Paper
                sx={{
                  p: 1,
                  height: 60,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {format(day, "EEE")}
                </Typography>
                <Typography
                  variant="h6"
                  color={isSameDay(day, new Date()) ? "primary" : "inherit"}
                >
                  {format(day, "d")}
                </Typography>
              </Paper>

              {/* Employee Tours for this day */}
              {employees.map((employee) => {
                const employeeTours = getToursByEmployee(employee.id, day);
                return (
                  <Paper
                    key={`${employee.id}-${day.toISOString()}`}
                    sx={{
                      p: 1,
                      mb: 1,
                      minHeight: 100,
                      position: "relative",
                      backgroundColor:
                        employeeTours.length > 0 ? "#fff" : "#fafafa",
                      border:
                        employeeTours.length > 0
                          ? `2px solid ${getEmployeeColor(employee.id)}20`
                          : "1px dashed #ccc",
                    }}
                  >
                    {employeeTours.length === 0 ? (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          cursor: "pointer",
                          "&:hover": { backgroundColor: "#f0f0f0" },
                        }}
                        onClick={() => handleCreateTour(day, employee.id)}
                      >
                        <Tooltip title="Create tour">
                          <AddIcon color="action" />
                        </Tooltip>
                      </Box>
                    ) : (
                      employeeTours.map((tour) => (
                        <Box
                          key={tour.id}
                          sx={{
                            mb: 1,
                            p: 1,
                            borderRadius: 1,
                            backgroundColor:
                              getEmployeeColor(employee.id) + "10",
                            border: `1px solid ${getEmployeeColor(employee.id)}40`,
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor:
                                getEmployeeColor(employee.id) + "20",
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              mb: 1,
                            }}
                          >
                            <Typography
                              variant="caption"
                              fontWeight="bold"
                              noWrap
                            >
                              {tour.name || `Tour ${tour.id}`}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 0.5 }}>
                              <Tooltip title="View">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/tours/${tour.id}/show`);
                                  }}
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/tours/${tour.id}`);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>

                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                          >
                            {tour.time_start && tour.time_end
                              ? `${tour.time_start} - ${tour.time_end}`
                              : "Time TBD"}
                          </Typography>

                          <Box
                            sx={{
                              display: "flex",
                              gap: 0.5,
                              mt: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <Chip
                              size="small"
                              label={`${tour.events?.length || 0} events`}
                              sx={{ fontSize: "0.625rem", height: 16 }}
                            />
                            <Chip
                              size="small"
                              label={tour.optimization_status || "pending"}
                              color={
                                tour.optimization_status === "optimized"
                                  ? "success"
                                  : tour.optimization_status === "manual"
                                    ? "info"
                                    : "warning"
                              }
                              sx={{ fontSize: "0.625rem", height: 16 }}
                            />
                          </Box>
                        </Box>
                      ))
                    )}
                  </Paper>
                );
              })}
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};
