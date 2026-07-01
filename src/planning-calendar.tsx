import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Title, useDataProvider, useGetList, useNotify } from "react-admin";
import type { EventUpdatePayload } from "./dataProvider";
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
  const [editingId, setEditingId] = useState<number | null>(null);

  const refetch = useCallback(() => {
    calendarRef.current?.getApi().refetchEvents();
  }, []);

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
    setEditingId(Number(arg.event.id));
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

      {editingId != null && (
        <EventEditDialog
          eventId={editingId}
          employeeChoices={employeeChoices}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            refetch();
          }}
        />
      )}
    </Card>
  );
};

interface EmployeeChoice {
  id: number;
  name: string;
}

interface PatientOption {
  id: number;
  label: string;
}

// Searchable patient picker backed by /fast/patients (search endpoint).
const PatientAutocomplete: React.FC<{
  value: PatientOption | null;
  onChange: (v: PatientOption | null) => void;
}> = ({ value, onChange }) => {
  const dataProvider = useDataProvider();
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<PatientOption[]>([]);

  useEffect(() => {
    if (input.trim().length < 2) {
      setOptions(value ? [value] : []);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      dataProvider
        .getList("patients", {
          filter: { q: input },
          pagination: { page: 1, perPage: 20 },
          sort: { field: "name", order: "ASC" },
        })
        .then(({ data }) => {
          if (!active) return;
          setOptions(
            data.map((p: Record<string, unknown>) => ({
              id: p.id as number,
              label:
                `${(p.name as string) ?? ""} ${(p.first_name as string) ?? ""}`.trim() ||
                `#${p.id}`,
            })),
          );
        })
        .catch(() => undefined);
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [input, dataProvider, value]);

  return (
    <Autocomplete
      size="small"
      value={value}
      options={options}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      onInputChange={(_, v) => setInput(v)}
      onChange={(_, v) => onChange(v)}
      renderInput={(params) => <TextField {...params} label="Patient" />}
    />
  );
};

interface EventFormState {
  employee_id: number | "";
  patient_id: number | "";
  state: number;
  event_type_enum: string;
  time_start: string;
  time_end: string;
  notes: string;
  event_report: string;
  event_address: string;
}

const EventEditDialog: React.FC<{
  eventId: number;
  employeeChoices: EmployeeChoice[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ eventId, employeeChoices, onClose, onSaved }) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientOption, setPatientOption] = useState<PatientOption | null>(
    null,
  );
  const [form, setForm] = useState<EventFormState>({
    employee_id: "",
    patient_id: "",
    state: 2,
    event_type_enum: "",
    time_start: "",
    time_end: "",
    notes: "",
    event_report: "",
    event_address: "",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dataProvider
      .getEvent(eventId)
      .then((ev) => {
        if (cancelled) return;
        setPatientName(ev.patient_name || "");
        setPatientOption(
          ev.patient_id
            ? { id: ev.patient_id, label: ev.patient_name || `#${ev.patient_id}` }
            : null,
        );
        setForm({
          employee_id: ev.employee_id ?? "",
          patient_id: ev.patient_id ?? "",
          state: ev.state,
          event_type_enum: ev.event_type_enum || "",
          time_start: (ev.time_start_event || "").slice(0, 5),
          time_end: (ev.time_end_event || "").slice(0, 5),
          notes: ev.notes || "",
          event_report: ev.event_report || "",
          event_address: ev.event_address || "",
        });
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dataProvider, eventId]);

  const set = <K extends keyof EventFormState>(k: K, v: EventFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setError(null);
    // Quick client check; the server enforces the full admin-parity matrix.
    if (form.time_start && form.time_end && form.time_end <= form.time_start) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }
    setSaving(true);
    const payload: EventUpdatePayload = {
      employee_id: form.employee_id === "" ? null : Number(form.employee_id),
      patient_id: form.patient_id === "" ? undefined : Number(form.patient_id),
      state: form.state,
      event_type_enum: form.event_type_enum || null,
      time_start: form.time_start ? `${form.time_start}:00` : undefined,
      time_end: form.time_end ? `${form.time_end}:00` : undefined,
      notes: form.notes,
      event_report: form.event_report,
      event_address: form.event_address,
    };
    try {
      await dataProvider.updateEvent(eventId, payload);
      notify("Événement enregistré", { type: "success" });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", pr: 1 }}>
        <Box sx={{ flexGrow: 1 }}>
          Modifier l'événement{patientName ? ` — ${patientName}` : ""}
        </Box>
        <IconButton onClick={onClose} size="small" disabled={saving}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid size={12}>
                <PatientAutocomplete
                  value={patientOption}
                  onChange={(v) => {
                    setPatientOption(v);
                    set("patient_id", v ? v.id : "");
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Employé"
                  value={form.employee_id}
                  onChange={(e) =>
                    set(
                      "employee_id",
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                >
                  <MenuItem value="">
                    <em>Aucun</em>
                  </MenuItem>
                  {employeeChoices.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="État"
                  value={form.state}
                  onChange={(e) => set("state", Number(e.target.value))}
                >
                  {Object.entries(STATE_LABELS).map(([id, label]) => (
                    <MenuItem key={id} value={Number(id)}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  type="time"
                  fullWidth
                  size="small"
                  label="Début"
                  InputLabelProps={{ shrink: true }}
                  value={form.time_start}
                  onChange={(e) => set("time_start", e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  type="time"
                  fullWidth
                  size="small"
                  label="Fin"
                  InputLabelProps={{ shrink: true }}
                  value={form.time_end}
                  onChange={(e) => set("time_end", e.target.value)}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Type"
                  value={form.event_type_enum}
                  onChange={(e) => set("event_type_enum", e.target.value)}
                >
                  <MenuItem value="">
                    <em>—</em>
                  </MenuItem>
                  {Object.entries(EVENT_TYPE_LABELS).map(([id, label]) => (
                    <MenuItem key={id} value={id}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Adresse"
                  value={form.event_address}
                  onChange={(e) => set("event_address", e.target.value)}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Notes"
                  multiline
                  minRows={2}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Rapport de soin"
                  multiline
                  minRows={2}
                  value={form.event_report}
                  onChange={(e) => set("event_report", e.target.value)}
                  helperText="Requis pour passer l'état à « Fait » ou « Non fait »."
                />
              </Grid>
            </Grid>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading || saving}
        >
          {saving ? <CircularProgress size={22} /> : "Enregistrer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
