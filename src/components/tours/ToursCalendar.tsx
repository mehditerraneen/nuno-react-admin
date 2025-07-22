import React, { useState, useMemo } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Paper, Box, Typography, Chip, Tooltip } from "@mui/material";
import { Event, Employee } from "../../types/tours";

const localizer = momentLocalizer(moment);

interface ToursCalendarProps {
  events: Event[];
  employees: Employee[];
  onEventSelect?: (event: Event) => void;
  onDateSelect?: (slotInfo: { start: Date; end: Date }) => void;
}

export const ToursCalendar: React.FC<ToursCalendarProps> = ({
  events,
  employees,
  onEventSelect,
  onDateSelect,
}) => {
  const [view, setView] = useState(Views.DAY);
  const [date, setDate] = useState(new Date());

  const eventStyleGetter = (event: any) => {
    const employee = employees.find((emp) => emp.id === event.employee_id);
    const backgroundColor = employee?.color || "#3174ad";

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  const calendarEvents = useMemo(() => {
    return events.map((event) => ({
      ...event,
      title: `Patient: ${event.patient_id} | ${event.event_type.replace("_", " ")}`,
      start: new Date(`${event.date}T${event.time_start}`),
      end: new Date(`${event.date}T${event.time_end}`),
      resource: event,
    }));
  }, [events]);

  const EventComponent = ({ event }: { event: any }) => {
    const employee = employees.find((emp) => emp.id === event.employee_id);

    return (
      <Tooltip
        title={`Employee: ${employee?.name || "Unassigned"} | Notes: ${event.notes || "No notes"}`}
      >
        <Box>
          <Typography
            variant="body2"
            style={{ fontSize: "0.75rem", fontWeight: "bold" }}
          >
            {event.title}
          </Typography>
          {event.state && (
            <Chip
              label={getStateLabel(event.state)}
              size="small"
              style={{
                fontSize: "0.6rem",
                height: "16px",
                backgroundColor: "rgba(255,255,255,0.3)",
              }}
            />
          )}
        </Box>
      </Tooltip>
    );
  };

  const getStateLabel = (state: number) => {
    const stateMap: { [key: number]: string } = {
      1: "Waiting",
      2: "Valid",
      3: "Done",
      4: "Ignored",
      5: "Not Done",
      6: "Cancelled",
    };
    return stateMap[state] || "Unknown";
  };

  return (
    <Paper sx={{ p: 2, height: "600px" }}>
      <Box mb={2}>
        <Typography variant="h6" gutterBottom>
          Healthcare Visit Calendar
        </Typography>
      </Box>

      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        onSelectEvent={(event) =>
          onEventSelect && onEventSelect(event.resource)
        }
        onSelectSlot={onDateSelect}
        selectable
        views={[Views.DAY, Views.WEEK, Views.AGENDA]}
        view={view}
        onView={(newView) => setView(newView)}
        date={date}
        onNavigate={(newDate) => setDate(newDate)}
        eventPropGetter={eventStyleGetter}
        components={{
          event: EventComponent,
        }}
        step={15}
        timeslots={4}
        min={new Date(2000, 1, 1, 6, 0, 0)}
        max={new Date(2000, 1, 1, 20, 0, 0)}
        dayLayoutAlgorithm="overlap"
      />

      {/* Legend */}
      <Box mt={2} display="flex" flexWrap="wrap" gap={1}>
        <Typography variant="body2" sx={{ mr: 2, fontWeight: "bold" }}>
          Employees:
        </Typography>
        {employees.map((employee) => (
          <Chip
            key={employee.id}
            label={employee.name}
            size="small"
            style={{ backgroundColor: employee.color, color: "white" }}
          />
        ))}
      </Box>
    </Paper>
  );
};
