import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Box,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Title, useDataProvider, useGetList, useNotify } from "react-admin";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";
import type {
  EventClickArg,
  EventChangeArg,
  EventInput,
  EventSourceFuncArg,
} from "@fullcalendar/core";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light.css";
import type { MyDataProvider, CalendarEventRead } from "./dataProvider";

// Event states (mirrors invoices/events.py Event.STATES)
const STATE_LABELS: Record<number, string> = {
  1: "En attente de validation",
  2: "Valide",
  3: "Fait",
  4: "Ignoré",
  5: "Non fait",
  6: "Annulé",
};

// event_type_enum short labels (mirrors invoices/enums/event.py EventTypeEnum)
const EVENT_TYPE_LABELS: Record<string, string> = {
  BIRTHDAY: "Anniversaire",
  CARE: "Soin",
  ASS_DEP: "Assurance dépendance",
  GENERIC: "Générique (patient)",
  GNRC_EMPL: "Générique (employé)",
  EMPL_TRNG: "Formation",
  SUB_CARE: "Soin sous-traité",
  HET_PLAN: "Plan canicule",
  MEDS: "Distribution médicaments",
  MEDS_MGT: "Gestion médicaments",
  OVERNIGHT: "Nuit",
  FIRST_VISIT: "Première visite",
  PAUSE: "Pause",
};

const pad = (n: number) => String(n).padStart(2, "0");
/** Format a Date as a plain "YYYY-MM-DD" (the range the endpoint filters on). */
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );

const titleOf = (e: CalendarEventRead) =>
  e.patient_name || e.employee_name || e.notes || `Événement #${e.id}`;

const toFcEvent = (e: CalendarEventRead): EventInput => {
  const hasTime = !!e.time_start_event;
  return {
    id: String(e.id),
    title: titleOf(e),
    start: hasTime ? `${e.day}T${e.time_start_event}` : e.day,
    end: e.time_end_event ? `${e.day}T${e.time_end_event}` : undefined,
    allDay: !hasTime,
    backgroundColor: e.color || "#83f321",
    borderColor: e.color || "#83f321",
    textColor: e.textColor || "#ffffff",
    extendedProps: e,
  };
};

/** Rich HTML hover box (avatar + details) shown via tippy. */
const tooltipHtml = (e: CalendarEventRead) => {
  const time = `${(e.time_start_event || "").slice(0, 5)}–${(
    e.time_end_event || ""
  ).slice(0, 5)}`;
  const avatar = e.employee_avatar
    ? `<img src="${e.employee_avatar}" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex:0 0 auto"/>`
    : "";
  const rows = [
    time.length > 1 ? `🕐 ${escapeHtml(time)}` : "",
    e.employee_name ? `👤 ${escapeHtml(e.employee_name)}` : "",
    `● ${escapeHtml(STATE_LABELS[e.state] ?? String(e.state))}`,
    e.event_type_enum
      ? `▸ ${escapeHtml(EVENT_TYPE_LABELS[e.event_type_enum] ?? e.event_type_enum)}`
      : "",
    e.notes ? `📝 ${escapeHtml(e.notes)}` : "",
  ]
    .filter(Boolean)
    .join("<br/>");
  return (
    `<div style="display:flex;gap:8px;align-items:flex-start;text-align:left;max-width:260px">` +
    avatar +
    `<div><strong>${escapeHtml(titleOf(e))}</strong><br/>${rows}</div>` +
    `</div>`
  );
};

export const PlanningCalendar: React.FC = () => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const notify = useNotify();
  const calendarRef = useRef<FullCalendar | null>(null);
  const [selected, setSelected] = useState<CalendarEventRead | null>(null);

  // Employee filter (client-side: /events has no employee param, we already
  // load the whole visible range).
  const [employeeFilter, setEmployeeFilter] = useState<number | "">("");
  const employeeFilterRef = useRef<number | "">("");
  employeeFilterRef.current = employeeFilter;

  const { data: employees } = useGetList("employees", {
    pagination: { page: 1, perPage: 500 },
    sort: { field: "name", order: "ASC" },
  });
  const employeeChoices = useMemo(
    () =>
      (employees || [])
        .map((e) => ({
          id: e.id as number,
          name: (e.name as string) || (e.abbreviation as string) || `#${e.id}`,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [employees],
  );

  const loadEvents = useCallback(
    (
      info: EventSourceFuncArg,
      success: (events: EventInput[]) => void,
      failure: (error: Error) => void,
    ) => {
      dataProvider
        .getCalendarEvents({
          start: toDateStr(info.start),
          end: toDateStr(info.end),
        })
        .then((events) => {
          const empId = employeeFilterRef.current;
          const filtered = empId
            ? events.filter((e) => e.employee_id === empId)
            : events;
          success(filtered.map(toFcEvent));
        })
        .catch((error: Error) => {
          notify(`Impossible de charger les événements : ${error.message}`, {
            type: "error",
          });
          failure(error);
        });
    },
    [dataProvider, notify],
  );

  const onEmployeeFilterChange = useCallback((value: number | "") => {
    setEmployeeFilter(value);
    calendarRef.current?.getApi().refetchEvents();
  }, []);

  const eventClassNames = useCallback(
    (arg: { event: { extendedProps: Partial<CalendarEventRead> } }) => {
      const stateId = arg.event.extendedProps.state;
      const classes: string[] = [];
      if (stateId === 1) classes.push("evt-waiting");
      if (stateId === 4 || stateId === 6) classes.push("evt-cancelled");
      return classes;
    },
    [],
  );

  const handleEventClick = useCallback((arg: EventClickArg) => {
    setSelected(arg.event.extendedProps as CalendarEventRead);
  }, []);

  // Rich hover box via tippy (with avatar when available).
  const handleEventDidMount = useCallback(
    (arg: { event: { extendedProps: CalendarEventRead }; el: HTMLElement }) => {
      tippy(arg.el, {
        content: tooltipHtml(arg.event.extendedProps),
        allowHTML: true,
        placement: "top",
        theme: "light",
        delay: [120, 0],
        maxWidth: 280,
      });
    },
    [],
  );

  const handleEventWillUnmount = useCallback(
    (arg: { el: HTMLElement & { _tippy?: { destroy: () => void } } }) => {
      arg.el._tippy?.destroy();
    },
    [],
  );

  // Drag/drop + resize → persist the new schedule; revert on server failure.
  const handleEventChange = useCallback(
    async (arg: EventChangeArg) => {
      const { event } = arg;
      if (!event.start) {
        arg.revert();
        return;
      }
      try {
        await dataProvider.updateEventSchedule(event.id, {
          day: toDateStr(event.start),
          time_start: toTimeStr(event.start),
          time_end: event.end ? toTimeStr(event.end) : undefined,
        });
        notify("Horaire mis à jour", { type: "info", autoHideDuration: 1500 });
      } catch (error) {
        notify(`Échec : ${(error as Error).message}`, { type: "error" });
        arg.revert();
      }
    },
    [dataProvider, notify],
  );

  return (
    <Card sx={{ p: 2, mt: 1 }}>
      <Title title="Planning (calendrier)" />
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Typography variant="h6">Planning — calendrier</Typography>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="emp-filter-label">Employé</InputLabel>
          <Select
            labelId="emp-filter-label"
            label="Employé"
            value={employeeFilter}
            onChange={(e) =>
              onEmployeeFilterChange(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
          >
            <MenuItem value="">
              <em>Tous les employés</em>
            </MenuItem>
            {employeeChoices.map((emp) => (
              <MenuItem key={emp.id} value={emp.id}>
                {emp.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Box
        sx={{
          "& .fc": { fontSize: "0.8rem" },
          "& .fc .evt-waiting": { opacity: 0.6, fontStyle: "italic" },
          "& .fc .evt-cancelled .fc-event-title": {
            textDecoration: "line-through",
          },
        }}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={frLocale}
          firstDay={1}
          height="80vh"
          nowIndicator
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          slotDuration="00:15:00"
          scrollTime="07:00:00"
          allDaySlot
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridWeek,timeGridDay,dayGridMonth",
          }}
          businessHours={{
            startTime: "06:00",
            endTime: "22:30",
            daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
          }}
          events={loadEvents}
          // Keep same-employee events side-by-side when they overlap in time.
          eventOrder="employee_id,start,-duration,title"
          eventClassNames={eventClassNames}
          eventClick={handleEventClick}
          eventDidMount={handleEventDidMount}
          eventWillUnmount={handleEventWillUnmount}
          eventDrop={handleEventChange}
          eventResize={handleEventChange}
          editable
          selectable={false}
        />
      </Box>

      <EventDetailDialog event={selected} onClose={() => setSelected(null)} />
    </Card>
  );
};

const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({
  label,
  value,
}) =>
  value ? (
    <Box sx={{ display: "flex", gap: 1 }}>
      <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 130 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  ) : null;

const EventDetailDialog: React.FC<{
  event: CalendarEventRead | null;
  onClose: () => void;
}> = ({ event, onClose }) => {
  if (!event) return null;
  const fmtTime = (t?: string | null) => (t ? t.slice(0, 5) : "—");
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", pr: 1 }}>
        <Box sx={{ flexGrow: 1 }}>{titleOf(event)}</Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          <DetailRow label="Patient" value={event.patient_name} />
          <DetailRow label="Employé" value={event.employee_name} />
          <DetailRow label="Jour" value={event.day} />
          <DetailRow
            label="Horaire"
            value={`${fmtTime(event.time_start_event)} – ${fmtTime(
              event.time_end_event,
            )}`}
          />
          <DetailRow
            label="État"
            value={STATE_LABELS[event.state] ?? String(event.state)}
          />
          <DetailRow
            label="Type"
            value={
              event.event_type_enum
                ? EVENT_TYPE_LABELS[event.event_type_enum] ??
                  event.event_type_enum
                : undefined
            }
          />
          {event.notes ? (
            <>
              <Divider />
              <DetailRow label="Notes" value={event.notes} />
            </>
          ) : null}
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 2, fontStyle: "italic" }}
        >
          Lecture seule — l'édition sera activée à la prochaine étape.
        </Typography>
      </DialogContent>
    </Dialog>
  );
};
