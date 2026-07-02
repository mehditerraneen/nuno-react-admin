import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import LinkIcon from "@mui/icons-material/Link";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ScheduleIcon from "@mui/icons-material/Schedule";
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
import type {
  MyDataProvider,
  CalendarEventRead,
  AevPlan,
  AevMutatePayload,
  SeriesAction,
  TravelWarning,
  EventActivity,
  EventReportRow,
} from "./dataProvider";
import {
  CARE_TYPES,
  getSectionPolicy,
  getFieldRequirements,
  missingRequiredFields,
  type Aspect,
  type EventSectionPolicy,
} from "./eventPolicy";

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

// Vital-parameter types + requirement reasons (mirror invoices/events.py)
const PARAM_TYPES: Record<string, string> = {
  temperature: "Température",
  blood_pressure: "Tension artérielle",
  heart_rate: "Pouls",
  weight: "Poids",
  pain_level: "Douleur (EVA)",
  oxygen_saturation: "Saturation O2",
  blood_sugar: "Glycémie",
  stools: "Selles",
};
const PARAM_REASONS: Record<string, string> = {
  FALL: "Suite à une chute",
  DOCTOR_REQUEST: "Sur demande du médecin",
  FAMILY_REQUEST: "Sur demande de la famille",
  NURSE_OBSERVATION: "Observation infirmière",
  ROUTINE_MONTHLY: "Contrôle mensuel",
  OTHER: "Autre",
};

const pad = (n: number) => String(n).padStart(2, "0");
/** Format a Date as a plain "YYYY-MM-DD" (the range the endpoint filters on). */
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
/** Add minutes to an "HH:MM" string, returning "HH:MM" (same day, capped 23:59). */
const addMinutes = (hhmm: string, mins: number): string => {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const total = Math.min(23 * 60 + 59, h * 60 + m + mins);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

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
  const collab = e.additional_employee_ids?.length ? "🤝 " : "";
  return {
    id: String(e.id),
    title: collab + titleOf(e),
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
  const realStart = (e.real_time_start_event || "").slice(0, 5);
  const realEnd = (e.real_time_end_event || "").slice(0, 5);
  const pointe =
    realStart || realEnd
      ? `🕒 pointé ${escapeHtml(realStart || "…")}–${escapeHtml(realEnd || "…")}`
      : "";
  const rows = [
    time.length > 1 ? `🕐 ${escapeHtml(time)}` : "",
    e.employee_name ? `👤 ${escapeHtml(e.employee_name)}` : "",
    e.additional_employee_ids?.length
      ? `🤝 ${e.additional_employee_ids.length} collaborateur(s)`
      : "",
    `● ${escapeHtml(STATE_LABELS[e.state] ?? String(e.state))}`,
    e.event_type_enum
      ? `▸ ${escapeHtml(EVENT_TYPE_LABELS[e.event_type_enum] ?? e.event_type_enum)}`
      : "",
    e.report_count ? `📋 ${e.report_count} rapport(s)` : "",
    pointe,
    e.series_id ? `🔗 Série ${escapeHtml(String(e.series_id).slice(0, 8))}` : "",
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
  const [seriesFilter, setSeriesFilter] = useState<string | null>(null);
  const seriesFilterRef = useRef<string | null>(null);
  seriesFilterRef.current = seriesFilter;
  const [seriesDates, setSeriesDates] = useState<string[]>([]);

  // Refetch whenever a client-side filter changes (after the refs are updated).
  useEffect(() => {
    calendarRef.current?.getApi().refetchEvents();
  }, [employeeFilter, seriesFilter]);

  // When a series is filtered, load all its occurrence dates (across weeks).
  useEffect(() => {
    if (!seriesFilter) {
      setSeriesDates([]);
      return;
    }
    let cancelled = false;
    dataProvider
      .getSeriesEvents(seriesFilter)
      .then((evs) => {
        if (cancelled) return;
        setSeriesDates(
          Array.from(new Set(evs.map((e) => e.day))).sort(),
        );
      })
      .catch(() => {
        if (!cancelled) setSeriesDates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [seriesFilter, dataProvider]);

  // Multi-select (bulk assign / duplicate)
  const [multiSelect, setMultiSelect] = useState(false);
  const multiSelectRef = useRef(false);
  multiSelectRef.current = multiSelect;
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const selectedIdsRef = useRef<Set<number>>(selectedIds);
  selectedIdsRef.current = selectedIds;
  const [bulkEmployee, setBulkEmployee] = useState<number | "">("");
  const [bulkDate, setBulkDate] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [travelWarnings, setTravelWarnings] = useState<TravelWarning[] | null>(
    null,
  );

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
          encodesClinical: (e.encodes_clinical_data as boolean) ?? true,
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
          const ser = seriesFilterRef.current;
          let filtered = events;
          if (empId) filtered = filtered.filter((e) => e.employee_id === empId);
          if (ser) filtered = filtered.filter((e) => e.series_id === ser);
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
  }, []);

  const eventClassNames = useCallback(
    (arg: {
      event: { id: string; extendedProps: Partial<CalendarEventRead> };
    }) => {
      const props = arg.event.extendedProps;
      const classes: string[] = [];
      if (props.state === 1) classes.push("evt-waiting");
      if (props.state === 4 || props.state === 6) classes.push("evt-cancelled");
      if (props.has_aev_or_care_codes === false) classes.push("evt-no-aev");
      if (props.series_id) classes.push("evt-series");
      if (selectedIdsRef.current.has(Number(arg.event.id)))
        classes.push("evt-selected");
      return classes;
    },
    [],
  );

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const id = Number(arg.event.id);
    if (multiSelectRef.current) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      arg.el.classList.toggle("evt-selected");
    } else {
      setEditingId(id);
    }
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

  const toggleMultiSelect = useCallback(() => {
    setMultiSelect((v) => {
      if (v) {
        setSelectedIds(new Set());
        setTimeout(() => calendarRef.current?.getApi().refetchEvents(), 0);
      }
      return !v;
    });
  }, []);

  const performBulkAssign = useCallback(async () => {
    setTravelWarnings(null);
    setBulkBusy(true);
    let ok = 0;
    const errors: string[] = [];
    for (const id of selectedIds) {
      try {
        await dataProvider.updateEvent(id, {
          employee_id: Number(bulkEmployee),
        });
        ok++;
      } catch (e) {
        errors.push(`#${id}: ${(e as Error).message}`);
      }
    }
    setBulkBusy(false);
    notify(
      `Assignation : ${ok} ok${errors.length ? `, ${errors.length} échec(s)` : ""}`,
      { type: errors.length ? "warning" : "success" },
    );
    setSelectedIds(new Set());
    setMultiSelect(false);
    calendarRef.current?.getApi().refetchEvents();
  }, [bulkEmployee, selectedIds, dataProvider, notify]);

  const bulkAssign = useCallback(async () => {
    if (bulkEmployee === "" || selectedIds.size === 0) return;
    // Advisory travel-time check first; on warnings, ask before assigning.
    setBulkBusy(true);
    try {
      const res = await dataProvider.checkTravelTime({
        employee_id: Number(bulkEmployee),
        event_ids: [...selectedIds],
      });
      setBulkBusy(false);
      if (res.warnings.length > 0) {
        setTravelWarnings(res.warnings);
        return;
      }
    } catch {
      setBulkBusy(false); // travel check failed → proceed anyway (advisory)
    }
    performBulkAssign();
  }, [bulkEmployee, selectedIds, dataProvider, performBulkAssign]);

  const bulkDuplicate = useCallback(async () => {
    if (!bulkDate || selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const res = await dataProvider.bulkDuplicateEvents({
        event_ids: [...selectedIds],
        target_date: bulkDate,
      });
      notify(
        `Duplication : ${res.created_count} créé(s)${res.skipped_count ? `, ${res.skipped_count} ignoré(s)` : ""}`,
        { type: "success" },
      );
      setSelectedIds(new Set());
      setMultiSelect(false);
      calendarRef.current?.getApi().refetchEvents();
    } catch (e) {
      notify(`Duplication : ${(e as Error).message}`, { type: "error" });
    } finally {
      setBulkBusy(false);
    }
  }, [bulkDate, selectedIds, dataProvider, notify]);

  return (
    <Card sx={{ p: 2, mt: 1 }}>
      <Title title="Planning (calendrier)" />
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h6">Planning — calendrier</Typography>
          {seriesFilter && (
            <Chip
              color="secondary"
              size="small"
              label={`Série ${seriesFilter.slice(0, 8)}…`}
              onDelete={() => setSeriesFilter(null)}
            />
          )}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant={multiSelect ? "contained" : "outlined"}
            onClick={toggleMultiSelect}
          >
            {multiSelect ? "Quitter la sélection" : "Sélection multiple"}
          </Button>
          <FormControl size="small" sx={{ minWidth: 200 }}>
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
      </Stack>

      {seriesFilter && seriesDates.length > 0 && (
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            flexWrap: "wrap",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            {seriesDates.length} occurrence(s) — aller à :
          </Typography>
          {seriesDates.map((d) => (
            <Chip
              key={d}
              size="small"
              variant="outlined"
              label={d.slice(5)}
              onClick={() => calendarRef.current?.getApi().gotoDate(d)}
            />
          ))}
        </Box>
      )}

      <Box
        sx={{
          "& .fc": { fontSize: "0.8rem" },
          "& .fc .evt-waiting": { opacity: 0.6, fontStyle: "italic" },
          "& .fc .evt-cancelled .fc-event-title": {
            textDecoration: "line-through",
          },
          "& .fc .evt-no-aev": { borderLeft: "4px solid #f0ad4e !important" },
          "& .fc .evt-series": { boxShadow: "inset 3px 0 0 0 #6f42c1" },
          "& .fc .evt-selected": {
            outline: "2px solid #1976d2",
            outlineOffset: "-2px",
          },
          "& .fc .fc-event": {
            cursor: multiSelect ? "copy" : "pointer",
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

      {multiSelect && (
        <Paper
          elevation={4}
          sx={{
            position: "sticky",
            bottom: 8,
            mt: 1,
            p: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
            zIndex: 5,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {selectedIds.size} sélectionné(s)
          </Typography>
          <Divider orientation="vertical" flexItem />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="bulk-emp">Employé</InputLabel>
            <Select
              labelId="bulk-emp"
              label="Employé"
              value={bulkEmployee}
              onChange={(e) =>
                setBulkEmployee(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            >
              <MenuItem value="">
                <em>—</em>
              </MenuItem>
              {employeeChoices.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            size="small"
            variant="contained"
            disabled={bulkBusy || bulkEmployee === "" || selectedIds.size === 0}
            onClick={bulkAssign}
          >
            Assigner
          </Button>
          <Divider orientation="vertical" flexItem />
          <TextField
            size="small"
            type="date"
            label="Dupliquer vers"
            InputLabelProps={{ shrink: true }}
            value={bulkDate}
            onChange={(e) => setBulkDate(e.target.value)}
          />
          <Button
            size="small"
            variant="outlined"
            disabled={bulkBusy || !bulkDate || selectedIds.size === 0}
            onClick={bulkDuplicate}
          >
            Dupliquer
          </Button>
          {bulkBusy && <CircularProgress size={20} />}
        </Paper>
      )}

      <Dialog
        open={travelWarnings !== null}
        onClose={() => setTravelWarnings(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Temps de trajet — vérification</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {(travelWarnings ?? []).map((w, i) => (
              <Alert
                key={i}
                severity={
                  w.severity === "error"
                    ? "error"
                    : w.severity === "warning"
                      ? "warning"
                      : "info"
                }
                sx={{ py: 0 }}
              >
                <Typography variant="caption">
                  {w.date} · {w.message}
                  {w.suggested_start
                    ? ` — début conseillé ${w.suggested_start}`
                    : ""}
                </Typography>
              </Alert>
            ))}
          </Stack>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 2, fontStyle: "italic" }}
          >
            Avertissements indicatifs — vous pouvez assigner quand même.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setTravelWarnings(null)} disabled={bulkBusy}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={performBulkAssign}
            disabled={bulkBusy}
          >
            Assigner quand même
          </Button>
        </DialogActions>
      </Dialog>

      {editingId != null && (
        <EventEditDialog
          eventId={editingId}
          employeeChoices={employeeChoices}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            refetch();
          }}
          onFilterSeries={(sid) => {
            setSeriesFilter(sid);
            setEditingId(null);
          }}
        />
      )}
    </Card>
  );
};

interface EmployeeChoice {
  id: number;
  name: string;
  encodesClinical: boolean;
}

interface PatientOption {
  id: number;
  label: string;
}

// Searchable patient picker backed by /fast/patients (search endpoint).
const PatientAutocomplete: React.FC<{
  value: PatientOption | null;
  onChange: (v: PatientOption | null) => void;
  required?: boolean;
}> = ({ value, onChange, required }) => {
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
      renderInput={(params) => (
        <TextField {...params} label="Patient" required={required} />
      )}
    />
  );
};

interface EventFormState {
  employee_id: number | "";
  additional_employee_ids: number[];
  patient_id: number | "";
  state: number;
  event_type_enum: string;
  time_start: string;
  time_end: string;
  notes: string;
  event_report: string;
  event_address: string;
  requires_parameters: boolean;
  required_parameter_types: string[];
  parameter_requirement_reason: string;
  parameter_requirement_notes: string;
}

// Resolve a Django media path (/media/...) against the backend origin.
const mediaUrl = (fileUrl: string) => {
  if (/^https?:\/\//.test(fileUrl)) return fileUrl;
  const api = (import.meta.env.VITE_SIMPLE_REST_URL as string) || "";
  return `${api.replace(/\/fast\/?$/, "")}${fileUrl}`;
};

// Worked-time seconds → "1h05" / "45 min".
const fmtDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
};

const PROXIMITY: Record<
  string,
  { label: string; color: "success" | "warning" | "default" }
> = {
  ok: { label: "sur place", color: "success" },
  far: { label: "éloigné", color: "warning" },
  no_gps: { label: "sans GPS", color: "default" },
  no_coord: { label: "sans repère", color: "default" },
};

// A single report card (primary caregiver or a collaborator).
const ReportCard: React.FC<{
  name: string;
  isPrimary: boolean;
  report?: EventReportRow;
}> = ({ name, isPrimary, report }) => (
  <Box sx={{ p: 1, bgcolor: "action.hover", borderRadius: 1 }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
      <Chip
        size="small"
        color={isPrimary ? "primary" : "default"}
        label={report?.author_abbr || name.slice(0, 3).toUpperCase()}
      />
      <Typography variant="caption" sx={{ flex: 1 }}>
        {name} · {isPrimary ? "soignant principal" : "collaborateur"}
      </Typography>
      {report?.updated_on && (
        <Typography variant="caption" color="text.secondary">
          {new Date(report.updated_on).toLocaleString("fr-FR", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </Typography>
      )}
    </Box>
    {report && report.text ? (
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
        {report.text}
      </Typography>
    ) : (
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontStyle: "italic" }}
      >
        Pas encore de rapport.
      </Typography>
    )}
  </Box>
);

// One clock leg (arrival or departure): time + GPS map link + distance + proximity.
const ClockLeg: React.FC<{
  label: string;
  time: string | null;
  lat: number | null;
  lng: number | null;
  distance: number | null;
  proximity: string | null;
}> = ({ label, time, lat, lng, distance, proximity }) => {
  if (!time) return null;
  const prox = proximity ? PROXIMITY[proximity] : null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Typography variant="caption" sx={{ minWidth: 52, color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography variant="caption">
        {new Date(time).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Typography>
      {lat != null && lng != null && (
        <Button
          size="small"
          component="a"
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noopener"
          sx={{ minWidth: 0, p: 0.25 }}
        >
          📍 carte
        </Button>
      )}
      {distance != null && (
        <Typography variant="caption" color="text.secondary">
          {Math.round(distance)} m
        </Typography>
      )}
      {prox && (
        <Chip
          size="small"
          variant="outlined"
          label={prox.label}
          color={prox.color === "default" ? undefined : prox.color}
        />
      )}
    </Box>
  );
};

// Section accordion that shows a disabled state + reason instead of hiding,
// driven by the event policy (single source of truth in eventPolicy.ts).
const SectionAccordion: React.FC<{
  title: React.ReactNode;
  aspect: Aspect;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}> = ({ title, aspect, defaultExpanded, children }) => (
  <Accordion
    disableGutters
    defaultExpanded={aspect.enabled && defaultExpanded}
    sx={{
      boxShadow: "none",
      "&:before": { display: "none" },
      opacity: aspect.enabled ? 1 : 0.65,
    }}
  >
    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
      <Typography
        variant="subtitle2"
        color={aspect.enabled ? "textPrimary" : "text.disabled"}
      >
        {aspect.enabled ? "" : "🔒 "}
        {title}
      </Typography>
    </AccordionSummary>
    <AccordionDetails sx={{ px: 0, pt: 0 }}>
      {aspect.enabled ? (
        children
      ) : (
        <Alert severity="info" sx={{ py: 0 }}>
          <Typography variant="caption">{aspect.reason}</Typography>
        </Alert>
      )}
    </AccordionDetails>
  </Accordion>
);

// Searchable CareCode picker (adds a care code to the event).
const CareCodePicker: React.FC<{
  disabled: boolean;
  onPick: (id: number) => void;
}> = ({ disabled, onPick }) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<
    Array<{ id: number; code: string; name: string }>
  >([]);
  useEffect(() => {
    if (input.trim().length < 2) {
      setOptions([]);
      return;
    }
    let active = true;
    const t = setTimeout(() => {
      dataProvider
        .getCareCodes(input)
        .then((r) => active && setOptions(Array.isArray(r) ? r : []))
        .catch(() => undefined);
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [input, dataProvider]);
  return (
    <Autocomplete
      size="small"
      value={null}
      options={Array.isArray(options) ? options : []}
      getOptionLabel={(o) => `${o.code} — ${o.name}`}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      onInputChange={(_, v) => setInput(v)}
      onChange={(_, v) => v && onPick(v.id)}
      disabled={disabled}
      renderInput={(params) => (
        <TextField {...params} label="Ajouter un code de soin" />
      )}
    />
  );
};

// Picker of the patient's prescriptions (attaches one to the event).
const PrescriptionPicker: React.FC<{
  patientId: number | null;
  disabled: boolean;
  onPick: (id: number) => void;
}> = ({ patientId, disabled, onPick }) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const [options, setOptions] = useState<
    Array<{ id: number; date: string; prescriptor_name: string }>
  >([]);
  useEffect(() => {
    if (!patientId) {
      setOptions([]);
      return;
    }
    let active = true;
    dataProvider
      .getPatientPrescriptions(patientId)
      .then((r: unknown) => {
        if (!active) return;
        // Endpoint returns { data: [...], total }; be tolerant of a bare array.
        const list = Array.isArray(r)
          ? r
          : ((r as { data?: unknown })?.data ?? []);
        setOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [patientId, dataProvider]);
  if (!patientId) return null;
  return (
    <Autocomplete
      size="small"
      value={null}
      options={Array.isArray(options) ? options : []}
      getOptionLabel={(o) =>
        `${o.date ?? ""} — ${o.prescriptor_name ?? ""}`.trim()
      }
      isOptionEqualToValue={(o, v) => o.id === v.id}
      onChange={(_, v) => v && onPick(v.id)}
      disabled={disabled}
      renderInput={(params) => (
        <TextField {...params} label="Attacher une ordonnance" />
      )}
    />
  );
};

// AEV / care codes panel — suggestions from the patient's established plan,
// attached acts with quota usage, minutes budget, add/remove.
const AevPanel: React.FC<{
  eventId: number;
  startTime: string;
  currentEnd: string;
  section: EventSectionPolicy;
  onAdaptEnd: (hhmm: string) => void;
}> = ({ eventId, startTime, currentEnd, section, onAdaptEnd }) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const notify = useNotify();
  const [plan, setPlan] = useState<AevPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addQty, setAddQty] = useState<Record<number, number>>({});
  const [newGenLabel, setNewGenLabel] = useState("");
  const [newGenMin, setNewGenMin] = useState<number | "">("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    dataProvider
      .getEventAev(eventId)
      .then(setPlan)
      .catch((e: Error) => notify(`AEV : ${e.message}`, { type: "error" }))
      .finally(() => setLoading(false));
  }, [dataProvider, eventId, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const mutate = async (payload: AevMutatePayload) => {
    setBusy(true);
    try {
      await dataProvider.aevMutate(eventId, payload);
      load();
    } catch (e) {
      notify(`AEV : ${(e as Error).message}`, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const attachedCount = plan?.attached.length ?? 0;
  const actsMin = plan?.timing?.acts_min ?? 0;
  // Suggested end time = event start + total minutes of the attached acts.
  const suggestedEnd =
    startTime && actsMin > 0 ? addMinutes(startTime, actsMin) : null;

  const accSx = { boxShadow: "none", "&:before": { display: "none" } } as const;

  return (
    <>
    {/* AEV plan codes: only for Assurance Dépendance — disabled + reason
        for other types instead of being hidden. */}
    <SectionAccordion
      title={
        <>
          Codes AEV (selon le plan établi)
          {attachedCount > 0 ? ` — ${attachedCount} attaché(s)` : ""}
        </>
      }
      aspect={section.aevPlan}
    >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={22} />
          </Box>
        ) : !plan ? null : !plan.patient_id ? (
          <Typography variant="caption" color="text.secondary">
            Aucun patient — pas de plan AEV.
          </Typography>
        ) : (
          <>
            {plan.minutes && (
              <Alert
                severity={plan.minutes.over ? "warning" : "info"}
                sx={{ py: 0, mb: 1 }}
              >
                <Typography variant="caption">
                  Forfait {plan.minutes.forfait_code ?? "—"} :{" "}
                  {plan.minutes.consumed ?? 0}/{plan.minutes.budget ?? "?"} min
                  cette semaine{plan.minutes.over ? " — dépassé" : ""}
                </Typography>
              </Alert>
            )}

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 1,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Actes : {actsMin} min · Séance : {plan.timing?.current_min ?? 0}{" "}
                min
              </Typography>
              {suggestedEnd && suggestedEnd !== currentEnd && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ScheduleIcon fontSize="small" />}
                  onClick={() => onAdaptEnd(suggestedEnd)}
                >
                  Adapter la fin à {suggestedEnd}
                </Button>
              )}
            </Box>

            {plan.attached.length > 0 && (
        <Stack spacing={0.5} sx={{ mb: 1 }}>
          {plan.attached.map((a) => (
            <Box
              key={a.link_id}
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Chip size="small" color="info" label={a.code ?? "?"} />
              <Typography variant="caption" sx={{ flex: 1 }}>
                {a.label}
                {a.allocated != null
                  ? ` — ${a.consumed}/${a.allocated}/${a.period_label}`
                  : ""}
              </Typography>
              {/* Quantity stepper (aev-mutate action=update) */}
              <IconButton
                size="small"
                disabled={busy || a.quantity <= 1}
                onClick={() =>
                  mutate({
                    action: "update",
                    link_id: a.link_id,
                    quantity: a.quantity - 1,
                  })
                }
              >
                <RemoveIcon fontSize="inherit" />
              </IconButton>
              <Typography
                variant="caption"
                sx={{ minWidth: 18, textAlign: "center", fontWeight: 600 }}
              >
                {a.quantity}
              </Typography>
              <IconButton
                size="small"
                disabled={busy}
                onClick={() =>
                  mutate({
                    action: "update",
                    link_id: a.link_id,
                    quantity: a.quantity + 1,
                  })
                }
              >
                <AddIcon fontSize="inherit" />
              </IconButton>
              <Button
                size="small"
                color="error"
                disabled={busy}
                onClick={() => mutate({ action: "remove", link_id: a.link_id })}
              >
                Retirer
              </Button>
            </Box>
          ))}
        </Stack>
      )}

      <Divider sx={{ my: 1 }} />
      <Typography variant="caption" color="text.secondary">
        Suggestions du plan
      </Typography>
      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
        {plan.suggestions.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            {plan.has_active_plan
              ? "Aucune suggestion pour ce créneau."
              : "Pas de plan actif pour ce patient."}
          </Typography>
        )}
        {plan.suggestions.map((s) => (
          <Box
            key={s.item_id}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              opacity: s.status === "on_event" ? 0.5 : 1,
            }}
          >
            <Chip size="small" variant="outlined" label={s.code} />
            <Typography variant="caption" sx={{ flex: 1 }}>
              {s.label}
              {s.remaining != null
                ? ` — reste ${s.remaining}/${s.allocated}`
                : s.status === "no_alloc"
                  ? " — hors forfait"
                  : ""}
            </Typography>
            {s.status === "on_event" ? (
              <Chip size="small" color="success" label="ajouté" />
            ) : (
              <>
                <TextField
                  type="number"
                  size="small"
                  value={addQty[s.item_id] ?? 1}
                  onChange={(e) =>
                    setAddQty((q) => ({
                      ...q,
                      [s.item_id]: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  inputProps={{ min: 1 }}
                  sx={{ width: 56 }}
                  disabled={busy || s.status === "exhausted"}
                />
                <Button
                  size="small"
                  disabled={
                    busy || !s.cns_detail_id || s.status === "exhausted"
                  }
                  onClick={() =>
                    s.cns_detail_id &&
                    mutate({
                      action: "add",
                      detail_id: s.cns_detail_id,
                      quantity: addQty[s.item_id] ?? 1,
                    })
                  }
                >
                  {s.status === "exhausted" ? "épuisé" : "Ajouter"}
                </Button>
              </>
            )}
          </Box>
        ))}
            </Stack>

            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="text.secondary">
              Tâches (durée libre)
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {plan.generic.map((g) => (
                <Box
                  key={g.id}
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Typography variant="caption" sx={{ flex: 1 }}>
                    {g.label}
                  </Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${g.minutes} min`}
                  />
                  <Button
                    size="small"
                    color="error"
                    disabled={busy}
                    onClick={() =>
                      mutate({ action: "remove_generic", id: g.id })
                    }
                  >
                    Retirer
                  </Button>
                </Box>
              ))}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  size="small"
                  label="Tâche"
                  value={newGenLabel}
                  onChange={(e) => setNewGenLabel(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  type="number"
                  label="min"
                  value={newGenMin}
                  onChange={(e) =>
                    setNewGenMin(
                      e.target.value === ""
                        ? ""
                        : Math.max(0, Number(e.target.value) || 0),
                    )
                  }
                  inputProps={{ min: 0 }}
                  sx={{ width: 74 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  disabled={busy || !newGenLabel.trim()}
                  onClick={async () => {
                    await mutate({
                      action: "add_generic",
                      label: newGenLabel.trim(),
                      minutes: typeof newGenMin === "number" ? newGenMin : 0,
                    });
                    setNewGenLabel("");
                    setNewGenMin("");
                  }}
                >
                  Ajouter tâche
                </Button>
              </Box>
            </Stack>
          </>
        )}
    </SectionAccordion>

    <SectionAccordion
      title={
        <>
          Codes de soins
          {plan?.care_codes?.length ? ` (${plan.care_codes.length})` : ""}
        </>
      }
      aspect={section.careCodes}
    >
      {plan && plan.patient_id ? (
            <Stack spacing={0.5}>
              {plan.care_codes.map((c) => (
                <Box
                  key={c.link_id}
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Chip size="small" color="primary" label={c.code} />
                  <Typography variant="caption" sx={{ flex: 1 }}>
                    {c.name}
                  </Typography>
                  <Button
                    size="small"
                    color="error"
                    disabled={busy}
                    onClick={() =>
                      mutate({ action: "remove_care_code", link_id: c.link_id })
                    }
                  >
                    Retirer
                  </Button>
                </Box>
              ))}
              <CareCodePicker
                disabled={busy}
                onPick={(id) =>
                  mutate({ action: "add_care_code", care_code_id: id })
                }
              />
            </Stack>
      ) : null}
    </SectionAccordion>

    <SectionAccordion
      title={
        <>
          Ordonnances
          {plan?.prescriptions?.length
            ? ` (${plan.prescriptions.length})`
            : ""}
        </>
      }
      aspect={section.prescriptions}
    >
      {plan && plan.patient_id ? (
        <Stack spacing={0.5}>
            {plan.prescriptions.map((p) => (
              <Box
                key={p.link_id}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Chip size="small" variant="outlined" label={p.label} />
                <Box sx={{ flex: 1 }} />
                {p.file_url && (
                  <Button
                    size="small"
                    onClick={() => setPreviewUrl(mediaUrl(p.file_url!))}
                  >
                    Aperçu
                  </Button>
                )}
                <Button
                  size="small"
                  color="error"
                  disabled={busy}
                  onClick={() =>
                    mutate({
                      action: "detach_prescription",
                      link_id: p.link_id,
                    })
                  }
                >
                  Détacher
                </Button>
              </Box>
            ))}
            <PrescriptionPicker
              patientId={plan.patient_id}
              disabled={busy}
              onPick={(id) =>
                mutate({ action: "attach_prescription", prescription_id: id })
              }
            />
        </Stack>
      ) : null}
    </SectionAccordion>

    <Dialog
      open={!!previewUrl}
      onClose={() => setPreviewUrl(null)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", pr: 1 }}>
        <Box sx={{ flexGrow: 1 }}>Aperçu de l'ordonnance</Box>
        {previewUrl && (
          <Button
            size="small"
            component="a"
            href={previewUrl}
            target="_blank"
            rel="noopener"
          >
            Ouvrir dans un onglet
          </Button>
        )}
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, height: "70vh" }}>
        {previewUrl &&
          (/\.pdf($|\?)/i.test(previewUrl) ? (
            <iframe
              src={previewUrl}
              title="Ordonnance"
              style={{ width: "100%", height: "100%", border: 0 }}
            />
          ) : (
            <img
              src={previewUrl}
              alt="Ordonnance"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          ))}
      </DialogContent>
    </Dialog>
    </>
  );
};

const EventEditDialog: React.FC<{
  eventId: number;
  employeeChoices: EmployeeChoice[];
  onClose: () => void;
  onSaved: () => void;
  onFilterSeries: (seriesId: string) => void;
}> = ({ eventId, employeeChoices, onClose, onSaved, onFilterSeries }) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientOption, setPatientOption] = useState<PatientOption | null>(
    null,
  );
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [seriesAction, setSeriesAction] = useState<SeriesAction>("single");
  const [encodesClinical, setEncodesClinical] = useState(true);
  const [activity, setActivity] = useState<EventActivity | null>(null);
  const [form, setForm] = useState<EventFormState>({
    employee_id: "",
    additional_employee_ids: [],
    patient_id: "",
    state: 2,
    event_type_enum: "",
    time_start: "",
    time_end: "",
    notes: "",
    event_report: "",
    event_address: "",
    requires_parameters: false,
    required_parameter_types: [],
    parameter_requirement_reason: "",
    parameter_requirement_notes: "",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dataProvider
      .getEvent(eventId)
      .then((ev) => {
        if (cancelled) return;
        setPatientName(ev.patient_name || "");
        setSeriesId(ev.series_id ?? null);
        setPatientOption(
          ev.patient_id
            ? { id: ev.patient_id, label: ev.patient_name || `#${ev.patient_id}` }
            : null,
        );
        setForm({
          employee_id: ev.employee_id ?? "",
          additional_employee_ids: ev.additional_employee_ids ?? [],
          patient_id: ev.patient_id ?? "",
          state: ev.state,
          event_type_enum: ev.event_type_enum || "",
          time_start: (ev.time_start_event || "").slice(0, 5),
          time_end: (ev.time_end_event || "").slice(0, 5),
          notes: ev.notes || "",
          event_report: ev.event_report || "",
          event_address: ev.event_address || "",
          requires_parameters: ev.requires_parameters ?? false,
          required_parameter_types: ev.required_parameter_types ?? [],
          parameter_requirement_reason: ev.parameter_requirement_reason ?? "",
          parameter_requirement_notes: ev.parameter_requirement_notes ?? "",
        });
        setEncodesClinical(ev.employee_encodes_clinical_data ?? true);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
        // Reports + GPS clock sessions (non-blocking, resilient).
        dataProvider
          .getEventActivity(eventId)
          .then((a) => !cancelled && setActivity(a))
          .catch(() => !cancelled && setActivity(null));
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
    // Conditional mandatory fields (mirror of the backend validators).
    const req = getFieldRequirements({
      eventType: form.event_type_enum,
      state: form.state,
      hasPatient: form.patient_id !== "",
      hasEmployee: form.employee_id !== "",
      employeeEncodesClinical: true,
    });
    const missing = missingRequiredFields(req, {
      employee_id: form.employee_id,
      patient_id: form.patient_id,
      event_report: form.event_report,
      notes: form.notes,
      time_start: form.time_start,
      time_end: form.time_end,
    });
    if (missing.length) {
      setError(`Champs obligatoires manquants : ${missing.join(", ")}.`);
      return;
    }
    setSaving(true);
    const payload: EventUpdatePayload = {
      employee_id: form.employee_id === "" ? null : Number(form.employee_id),
      additional_employee_ids: form.additional_employee_ids,
      patient_id: form.patient_id === "" ? undefined : Number(form.patient_id),
      state: form.state,
      event_type_enum: form.event_type_enum || null,
      time_start: form.time_start ? `${form.time_start}:00` : undefined,
      time_end: form.time_end ? `${form.time_end}:00` : undefined,
      notes: form.notes,
      event_report: form.event_report,
      event_address: form.event_address,
      requires_parameters: form.requires_parameters,
      required_parameter_types: form.required_parameter_types,
      parameter_requirement_reason:
        form.parameter_requirement_reason || null,
      parameter_requirement_notes: form.parameter_requirement_notes,
    };
    try {
      await dataProvider.updateEvent(
        eventId,
        payload,
        seriesId ? seriesAction : "single",
      );
      notify("Événement enregistré", { type: "success" });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const scope: SeriesAction = seriesId ? seriesAction : "single";
    const msg =
      seriesId && scope !== "single"
        ? scope === "all"
          ? "Supprimer TOUTE la série ? Action irréversible."
          : "Supprimer cette séance et les suivantes de la série ?"
        : "Supprimer cet événement ?";
    if (!window.confirm(msg)) return;
    setError(null);
    setDeleting(true);
    try {
      await dataProvider.deleteCalendarEvent(eventId, scope);
      notify("Événement supprimé", { type: "success" });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  // Reactive clinical flag: follows the currently selected employee (falls back
  // to the event's loaded flag when none is selected).
  const selectedEmp = employeeChoices.find((c) => c.id === form.employee_id);
  const employeeEncodesClinical = selectedEmp
    ? selectedEmp.encodesClinical
    : encodesClinical;

  // Single source of truth for section enablement + mandatory fields.
  const policyCtx = {
    eventType: form.event_type_enum,
    state: form.state,
    hasPatient: form.patient_id !== "",
    hasEmployee: form.employee_id !== "",
    employeeEncodesClinical,
  };
  const sectionPolicy = getSectionPolicy(policyCtx);
  const fieldReq = getFieldRequirements(policyCtx);

  const onEmployeePicked = (value: number | "") => {
    const emp = employeeChoices.find((c) => c.id === value);
    const nextClinical = emp ? emp.encodesClinical : encodesClinical;
    set("employee_id", value);
    if (nextClinical !== employeeEncodesClinical) {
      notify(
        nextClinical
          ? "Employé soignant : la zone « Paramètres vitaux » est activée."
          : "Employé non‑clinique : la zone « Paramètres vitaux » est désactivée (validation ignorée pour cet employé).",
        { type: "info", autoHideDuration: 5000 },
      );
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
                  required={fieldReq.patient}
                  onChange={(v) => {
                    setPatientOption(v);
                    set("patient_id", v ? v.id : "");
                  }}
                />
              </Grid>
              {seriesId && (
                <Grid size={12}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Chip
                      size="small"
                      color="secondary"
                      icon={<LinkIcon fontSize="small" />}
                      label={`Série ${seriesId.slice(0, 8)}…`}
                    />
                    <Button
                      size="small"
                      onClick={() => onFilterSeries(seriesId)}
                    >
                      Voir la série
                    </Button>
                  </Box>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Appliquer à (série récurrente)"
                    value={seriesAction}
                    onChange={(e) =>
                      setSeriesAction(e.target.value as SeriesAction)
                    }
                    helperText="État et rapport restent propres à cette séance."
                  >
                    <MenuItem value="single">Cette séance uniquement</MenuItem>
                    <MenuItem value="following">
                      Celle-ci et les suivantes
                    </MenuItem>
                    <MenuItem value="all">Toute la série</MenuItem>
                  </TextField>
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Employé"
                  required={fieldReq.employee}
                  value={form.employee_id}
                  onChange={(e) =>
                    onEmployeePicked(
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
              <Grid size={12}>
                <FormControl fullWidth size="small">
                  <InputLabel id="collab-label">
                    Collaborateurs (🤝)
                  </InputLabel>
                  <Select
                    labelId="collab-label"
                    label="Collaborateurs (🤝)"
                    multiple
                    value={form.additional_employee_ids}
                    onChange={(e) =>
                      set(
                        "additional_employee_ids",
                        (e.target.value as number[]).filter(
                          (v) => typeof v === "number",
                        ),
                      )
                    }
                    renderValue={(sel) =>
                      employeeChoices
                        .filter((c) => (sel as number[]).includes(c.id))
                        .map((c) => c.name)
                        .join(", ")
                    }
                  >
                    {employeeChoices
                      .filter((c) => c.id !== form.employee_id)
                      .map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  type="time"
                  fullWidth
                  size="small"
                  label="Début"
                  required={fieldReq.timeStart}
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
                  required={fieldReq.timeEnd}
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
                  required={fieldReq.notes}
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
                  required={fieldReq.report}
                  multiline
                  minRows={2}
                  value={form.event_report}
                  onChange={(e) => set("event_report", e.target.value)}
                  helperText="Requis pour passer l'état à « Fait » ou « Non fait »."
                />
              </Grid>
            </Grid>

            {form.patient_id !== "" && (
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ mb: 1.5 }} />
                <AevPanel
                  eventId={eventId}
                  startTime={form.time_start}
                  currentEnd={form.time_end}
                  section={sectionPolicy}
                  onAdaptEnd={(v) => set("time_end", v)}
                />
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <SectionAccordion
                title="📊 Paramètres vitaux requis (avancé)"
                aspect={sectionPolicy.vitalParams}
              >
                    <Stack spacing={1.5}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={form.requires_parameters}
                            onChange={(e) =>
                              set("requires_parameters", e.target.checked)
                            }
                          />
                        }
                        label="Paramètres quotidiens requis"
                      />
                      <FormControl fullWidth size="small">
                        <InputLabel id="ptypes-label">
                          Types de paramètres
                        </InputLabel>
                        <Select
                          labelId="ptypes-label"
                          label="Types de paramètres"
                          multiple
                          value={form.required_parameter_types}
                          onChange={(e) =>
                            set(
                              "required_parameter_types",
                              e.target.value as string[],
                            )
                          }
                          renderValue={(sel) =>
                            (sel as string[])
                              .map((t) => PARAM_TYPES[t] ?? t)
                              .join(", ")
                          }
                        >
                          {Object.entries(PARAM_TYPES).map(([k, v]) => (
                            <MenuItem key={k} value={k}>
                              {v}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Raison"
                        value={form.parameter_requirement_reason}
                        onChange={(e) =>
                          set("parameter_requirement_reason", e.target.value)
                        }
                      >
                        <MenuItem value="">
                          <em>—</em>
                        </MenuItem>
                        {Object.entries(PARAM_REASONS).map(([k, v]) => (
                          <MenuItem key={k} value={k}>
                            {v}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        minRows={2}
                        label="Notes paramètres"
                        value={form.parameter_requirement_notes}
                        onChange={(e) =>
                          set("parameter_requirement_notes", e.target.value)
                        }
                      />
                      <Alert severity="info" sx={{ py: 0 }}>
                        <Typography variant="caption">
                          Infos techniques : validé au passage à « Fait »
                          (état 3) pour les patients sous assurance‑dépendance
                          (paramètres mensuels + quotidiens après chute). Zone
                          désactivée pour le personnel non‑clinique.
                        </Typography>
                      </Alert>
                    </Stack>
              </SectionAccordion>
            </Box>

            {activity &&
              (activity.primary_employee_id ||
                (activity.reports?.length ?? 0) > 0) &&
              (() => {
                const reports = activity.reports || [];
                const primaryReport = reports.find(
                  (r) => r.author_id === activity.primary_employee_id,
                );
                const collabReports = reports.filter(
                  (r) => r.author_id !== activity.primary_employee_id,
                );
                return (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Rapports ({reports.length})
                    </Typography>
                    <Stack spacing={1}>
                      <ReportCard
                        name={
                          activity.primary_employee_name ||
                          "Soignant principal"
                        }
                        isPrimary
                        report={primaryReport}
                      />
                      {collabReports.map((r, i) => (
                        <ReportCard
                          key={r.author_id ?? i}
                          name={r.author_name || "Collaborateur"}
                          isPrimary={false}
                          report={r}
                        />
                      ))}
                    </Stack>
                  </Box>
                );
              })()}

            {activity &&
              ((activity.sessions?.length ?? 0) > 0 ||
                activity.real_time_start ||
                activity.total_duration_seconds) && (
                <Box sx={{ mt: 2 }}>
                  <Accordion
                    disableGutters
                    defaultExpanded={false}
                    sx={{ boxShadow: "none", "&:before": { display: "none" } }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ px: 0 }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        🛰️ Pointages GPS & temps (admin)
                        {activity.total_duration_seconds
                          ? ` · ${fmtDuration(activity.total_duration_seconds)}`
                          : ""}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 0 }}>
                      <Stack spacing={1}>
                        <Typography variant="caption" color="text.secondary">
                          Temps réel : {activity.real_time_start || "—"} →{" "}
                          {activity.real_time_end || "—"}
                        </Typography>
                        {(activity.sessions?.length ?? 0) === 0 && (
                          <Typography variant="caption" color="text.secondary">
                            Aucun pointage enregistré.
                          </Typography>
                        )}
                        {(activity.sessions || []).map((s) => (
                          <Box
                            key={s.id}
                            sx={{
                              p: 1,
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 1,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 0.5,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ flex: 1, fontWeight: 600 }}
                              >
                                {s.employee_name || `#${s.employee_id}`}
                              </Typography>
                              {s.duration_seconds != null && (
                                <Chip
                                  size="small"
                                  label={fmtDuration(s.duration_seconds)}
                                />
                              )}
                            </Box>
                            <ClockLeg
                              label="Arrivée"
                              time={s.start_time}
                              lat={s.start_lat}
                              lng={s.start_lng}
                              distance={s.start_distance_m}
                              proximity={s.start_proximity}
                            />
                            <ClockLeg
                              label="Départ"
                              time={s.stop_time}
                              lat={s.stop_lat}
                              lng={s.stop_lng}
                              distance={s.stop_distance_m}
                              proximity={s.stop_proximity}
                            />
                          </Box>
                        ))}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDelete}
          disabled={loading || saving || deleting}
        >
          {deleting ? <CircularProgress size={22} /> : "Supprimer"}
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} disabled={saving || deleting}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading || saving || deleting}
        >
          {saving ? <CircularProgress size={22} /> : "Enregistrer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
