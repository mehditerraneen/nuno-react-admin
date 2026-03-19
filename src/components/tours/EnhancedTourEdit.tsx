import React, { useState, useEffect, useCallback } from "react";
import {
  Edit,
  SimpleForm,
  DateInput,
  TextInput,
  ReferenceInput,
  SelectInput,
  useRecordContext,
  useDataProvider,
  useNotify,
  useRefresh,
  Button,
  required,
} from "react-admin";

// CSS for spinner animation
const spinnerStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .spinner {
    animation: spin 1s linear infinite;
  }
`;
import { useFormContext } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Box,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  DragIndicator,
  Schedule,
  Person,
  Route as RouteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  AccessTime,
  Coffee,
  SwapHoriz,
  Refresh as RefreshIcon,
  CheckCircle,
  Error,
  Warning,
  DirectionsCar,
  LocationOn,
  MoreTime,
  Circle,
  ArrowUpward,
  ArrowDownward,
} from "@mui/icons-material";
import { Tour, Event, TourType } from "../../types/tours";
import { EventProximityResponse } from "../../dataProvider";

interface AvailableEvent extends Event {
  assigned_to_tour?: number;
  is_available: boolean;
  patient_name?: string;
}

// Validation interfaces
interface ValidationError {
  type: string;
  severity: string;
  message: string;
  event_ids?: number[];
  suggested_fix?: string;
}

interface ValidationWarning {
  type: string;
  severity: string;
  message: string;
  event_ids?: number[];
  suggested_fix?: string;
}

interface TourStatistics {
  total_events: number;
  total_care_time_minutes: number;
  total_travel_time_minutes: number;
  total_tour_duration_minutes: number;
  total_distance_km: number;
  efficiency_score: number;
  utilization_rate: number;
  longest_gap_minutes: number;
  shortest_buffer_minutes: number;
}

interface OptimizationSuggestion {
  type: string;
  description: string;
  impact: string;
  estimated_savings_minutes: number;
  suggested_action: string;
}

interface TravelSegment {
  from_event_id: number;
  to_event_id: number;
  estimated_distance_km: number;
  estimated_duration_minutes: number;
  from_location: string;
  to_location: string;
  departure_time: string;
  arrival_time: string;
  buffer_time_minutes: number;
}

interface ValidationState {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  statistics: TourStatistics | null;
  optimizationSuggestions: OptimizationSuggestion[];
  travelSegments: TravelSegment[];
}

const EnhancedTourEditForm = () => {
  const record = useRecordContext<Tour>();
  const formContext = useFormContext();
  const [availableEvents, setAvailableEvents] = useState<AvailableEvent[]>([]);
  const [assignedEvents, setAssignedEvents] = useState<Event[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [draggedEvent, setDraggedEvent] = useState<AvailableEvent | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    toAssign: number[];
    toRemove: number[];
  }>({ toAssign: [], toRemove: [] });
  const [pendingTimeChanges, setPendingTimeChanges] = useState<{
    [eventId: number]: {
      time_start: string;
      time_end: string;
      originalStart: string;
      originalEnd: string;
    };
  }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Validation state
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true,
    errors: [],
    warnings: [],
    statistics: null,
    optimizationSuggestions: [],
    travelSegments: [],
  });
  const [isValidating, setIsValidating] = useState(false);

  // State to track form changes that require refresh
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [originalFormValues, setOriginalFormValues] = useState<{
    date?: string;
    time_start?: string;
    time_end?: string;
    break_duration?: number;
  }>({});

  // NEW: Proximity highlighting state
  const [proximityHighlights, setProximityHighlights] = useState<{
    [eventId: number]: {
      rank: number;
      distance: number;
      duration: number;
      timeGap: number;
      color: string;
    }
  }>({});
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [lastDroppedEventId, setLastDroppedEventId] = useState<number | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [tourMode, setTourMode] = useState<"events" | "careplans">("events");
  const [tourTypes, setTourTypes] = useState<TourType[]>([]);
  const [selectedTourTypeId, setSelectedTourTypeId] = useState<number | null>(null);
  const [tourBreaks, setTourBreaks] = useState<Array<{
    id: number; break_type: string; start_time: string; end_time: string;
    duration_minutes?: number; location?: string; notes?: string;
  }>>([]);

  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();

  // Debounced validation function
  const debouncedValidate = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (events: Event[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          await validateProposedTour(events);
        }, 500);
      };
    })(),
    [record],
  );

  useEffect(() => {
    if (record) {
      loadEmployees();
      loadPatients();
      loadEventTypes();
      loadTourTypes();
      if (tourMode === "careplans") {
        loadCarePlanEvents();
      } else {
        loadAvailableEvents();
      }
      setAssignedEvents(record.events || []);
      setTourBreaks(record.breaks || []);
      setSelectedTourTypeId(record.tour_type_id ?? null);

      // Store original form values for comparison
      setOriginalFormValues({
        date: record.date,
        time_start: record.time_start,
        time_end: record.time_end,
        break_duration: record.break_duration,
      });
      setNeedsRefresh(false);
    }
  }, [record]);

  // Trigger validation when assigned events change
  useEffect(() => {
    const assignedEvents = availableEvents.filter(
      (e) => e.assigned_to_tour === record?.id,
    );
    if (assignedEvents.length > 0) {
      debouncedValidate(assignedEvents);
    } else {
      setValidationState({
        isValid: true,
        errors: [],
        warnings: [],
        statistics: null,
        optimizationSuggestions: [],
        travelSegments: [],
      });
    }
  }, [availableEvents, record?.id, debouncedValidate]);

  // Watch for form value changes to show refresh indicator
  useEffect(() => {
    if (!record || !formContext) return;

    const checkForChanges = () => {
      const currentValues = getCurrentFormValues();

      const hasChanges =
        currentValues.date !== originalFormValues.date ||
        currentValues.time_start !== originalFormValues.time_start ||
        currentValues.time_end !== originalFormValues.time_end ||
        currentValues.break_duration !== originalFormValues.break_duration;

      setNeedsRefresh(hasChanges);
    };

    // Check immediately
    checkForChanges();

    // Set up interval to check periodically
    const interval = setInterval(checkForChanges, 500);

    return () => clearInterval(interval);
  }, [formContext, originalFormValues, record]);

  const getCurrentFormValues = () => {
    try {
      const currentValues = formContext?.getValues();
      return {
        date: currentValues?.date || record?.date,
        time_start: currentValues?.time_start || record?.time_start,
        time_end: currentValues?.time_end || record?.time_end,
        employee_id: currentValues?.employee_id || record?.employee_id,
        name: currentValues?.name || record?.name,
      };
    } catch (error) {
      return {
        date: record?.date,
        time_start: record?.time_start,
        time_end: record?.time_end,
        employee_id: record?.employee_id,
        name: record?.name,
      };
    }
  };

  // Helper function to get patient address
  const getPatientAddress = (patientId: number): string => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient?.address) {
      return patient.address;
    }
    // Fallback to a default or construct from available fields
    return patient
      ? `${patient.street || ""} ${patient.house_number || ""}, ${patient.city || "Luxembourg"}`.trim()
      : "Address not available";
  };

  // Helper function to calculate duration in minutes
  const calculateDuration = (timeStart: string, timeEnd: string): number => {
    const start = new Date(`2000-01-01 ${timeStart}`);
    const end = new Date(`2000-01-01 ${timeEnd}`);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  };

  // Real-time validation function
  const validateProposedTour = async (events: Event[]) => {
    if (events.length === 0) {
      setValidationState({
        isValid: true,
        errors: [],
        warnings: [],
        statistics: null,
        optimizationSuggestions: [],
        travelSegments: [],
      });
      return;
    }

    setIsValidating(true);
    const currentFormValues = getCurrentFormValues();

    try {
      const proposedData = {
        events: events.map((event, index) => ({
          id: event.id,
          patient_id: event.patient_id,
          patient_name: getPatientName(event.patient_id),
          patient_address: getPatientAddress(event.patient_id),
          time_start: event.time_start,
          time_end: event.time_end,
          duration_minutes: calculateDuration(event.time_start, event.time_end),
          sequence: index + 1,
          state: event.state || 1,
        })),
        planned_start_time: currentFormValues.time_start || record?.time_start || "08:00",
        planned_end_time: currentFormValues.time_end || record?.time_end || "17:00",
        employee_id: currentFormValues.employee_id || record?.employee_id || 1,
        tour_date:
          currentFormValues.date || record?.date || new Date().toISOString().split("T")[0],
        tour_name: currentFormValues.name || record?.name || "Untitled Tour",
        include_travel_calculation: true,
        include_optimization_suggestions: true,
      };

      console.log("🔍 Validating proposed tour:", proposedData);
      const response = await (dataProvider as any).validateProposedTour(
        proposedData,
      );

      setValidationState({
        isValid: response.is_valid,
        errors: response.validation_errors || [],
        warnings: response.warnings || [],
        statistics: response.statistics,
        optimizationSuggestions: response.optimization_suggestions || [],
        travelSegments: response.travel_segments || [],
      });

      // Show efficiency feedback
      if (response.statistics?.efficiency_score) {
        const score = response.statistics.efficiency_score;
        if (score >= 80) {
          notify(`Excellent tour efficiency: ${score.toFixed(1)}%`, {
            type: "success",
          });
        } else if (score >= 60) {
          notify(`Good tour efficiency: ${score.toFixed(1)}%`, {
            type: "info",
          });
        } else {
          notify(`Tour efficiency could be improved: ${score.toFixed(1)}%`, {
            type: "warning",
          });
        }
      }
    } catch (error) {
      console.error("Validation failed:", error);
      notify("Validation failed - check network connection", { type: "error" });
      setValidationState({
        isValid: false,
        errors: [
          {
            type: "network",
            severity: "error",
            message: "Validation service unavailable",
          },
        ],
        warnings: [],
        statistics: null,
        optimizationSuggestions: [],
        travelSegments: [],
      });
    } finally {
      setIsValidating(false);
    }
  };

  const loadAvailableEvents = async (customDate?: string) => {
    const dateToUse = customDate || record?.date;
    if (!dateToUse) {
      return;
    }

    setEventsLoading(true);

    try {
      // Get current form values for time filtering
      const formValues = getCurrentFormValues();

      // Build filter with date and time constraints
      const filter: any = { date: dateToUse };

      // Add time filtering if tour has start/end times
      if (formValues.time_start) {
        filter.time_start_gte = formValues.time_start;
      }
      if (formValues.time_end) {
        filter.time_end_lte = formValues.time_end;
      }

      // Load events for the tour date and time window
      const response = await dataProvider.getList("events", {
        pagination: { page: 1, perPage: 100 },
        sort: { field: "time_start", order: "ASC" },
        filter: filter,
      });

      const events = response.data.map((event: Event) => ({
        ...event,
        is_available: !event.tour_id || event.tour_id === record?.id,
        assigned_to_tour: event.tour_id,
      }));

      setAvailableEvents(events);
      notify(`Loaded ${events.length} events for ${dateToUse}`, {
        type: "info",
      });
    } catch (error) {
      notify("Failed to load available events", { type: "error" });
    } finally {
      setEventsLoading(false);
    }
  };

  const loadCarePlanEvents = async (customDate?: string) => {
    const dateToUse = customDate || record?.date;
    if (!dateToUse) return;

    setEventsLoading(true);
    try {
      // Determine day of week for the tour date (0=Mon..6=Sun)
      const d = new Date(dateToUse);
      const jsDow = d.getDay(); // 0=Sun..6=Sat
      const dow = jsDow === 0 ? 6 : jsDow - 1; // convert to 0=Mon..6=Sun
      const dowStr = String(dow);

      // Fetch active care plans (last valid)
      const cpResponse = await dataProvider.getList("careplans", {
        pagination: { page: 1, perPage: 200 },
        sort: { field: "id", order: "ASC" },
        filter: { last_valid_plan: true, patient_is_active: true },
      });

      // Filter by validity: plan must cover the tour date
      const validPlans = cpResponse.data.filter((cp: any) => {
        if (cp.plan_start_date && cp.plan_start_date > dateToUse) return false;
        if (cp.plan_end_date && cp.plan_end_date < dateToUse) return false;
        return true;
      });

      const virtualEvents: AvailableEvent[] = [];
      let virtualId = -1;

      for (const cp of validPlans) {
        const details = await (dataProvider as any).getCarePlanDetails(cp.id);

        for (const detail of details) {
          // Check if this detail is scheduled for this day of week
          const occs = detail.params_occurrence || [];
          const isActiveDay =
            occs.some((o: any) => o.value === "*") ||
            occs.some((o: any) => o.value === dowStr);
          if (!isActiveDay) continue;

          const timeStart = detail.time_start?.substring(0, 5) || "";
          const timeEnd = detail.time_end?.substring(0, 5) || "";
          if (!timeStart || !timeEnd) continue;

          // Filter by tour time window
          const formValues = getCurrentFormValues();
          const tourStart = formValues.time_start || record?.time_start || "00:00";
          const tourEnd = formValues.time_end || record?.time_end || "23:59";
          if (timeStart < tourStart || timeEnd > tourEnd) continue;

          const codes = (detail.longtermcareitemquantity_set || []).map(
            (item: any) => item.long_term_care_item?.code,
          ).filter(Boolean);

          virtualEvents.push({
            id: virtualId--,
            patient_id: cp.patient_id,
            date: dateToUse,
            time_start: timeStart,
            time_end: timeEnd,
            state: 1 as any,
            notes: detail.care_actions || "",
            event_type: "CARE_PLAN",
            care_codes: codes,
            is_available: true,
            assigned_to_tour: undefined,
            patient_name: undefined,
          });
        }
      }

      const dayName = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][dow];
      setAvailableEvents(virtualEvents);
      notify(
        `${virtualEvents.length} sessions from ${validPlans.length} valid plans for ${dayName} ${dateToUse}`,
        { type: "info" },
      );
    } catch (error) {
      notify("Failed to load care plan events", { type: "error" });
    } finally {
      setEventsLoading(false);
    }
  };

  const loadEventsByMode = (dateOverride?: string) => {
    if (tourMode === "careplans") {
      loadCarePlanEvents(dateOverride);
    } else {
      loadAvailableEvents(dateOverride);
    }
  };

  const refreshEventsWithCurrentForm = () => {
    const formValues = getCurrentFormValues();

    if (!formValues.date || formValues.date === record?.date) {
      try {
        const dateInput = document.querySelector(
          'input[name="date"]',
        ) as HTMLInputElement;
        const domDate = dateInput?.value || record?.date;
        loadEventsByMode(domDate);

        setOriginalFormValues({
          date: formValues.date,
          time_start: formValues.time_start,
          time_end: formValues.time_end,
          break_duration: formValues.break_duration,
        });
        setNeedsRefresh(false);
        return;
      } catch (error) {
        // Silently fallback to record date
      }
    }

    loadEventsByMode(formValues.date);

    setOriginalFormValues({
      date: formValues.date,
      time_start: formValues.time_start,
      time_end: formValues.time_end,
      break_duration: formValues.break_duration,
    });
    setNeedsRefresh(false);
  };

  const loadEmployees = async () => {
    try {
      const response = await dataProvider.getList("employees", {
        pagination: { page: 1, perPage: 100 },
        sort: { field: "name", order: "ASC" },
        filter: {},
      });
      setEmployees(response.data);
    } catch (error) {
      notify("Failed to load employees", { type: "error" });
    }
  };

  const loadPatients = async () => {
    try {
      const response = await dataProvider.getList("patients", {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "name", order: "ASC" },
        filter: {},
      });
      setPatients(response.data);
    } catch (error) {
      notify("Failed to load patients", { type: "error" });
    }
  };

  const loadEventTypes = async () => {
    try {
      const response = await dataProvider.getList("event-types", {
        pagination: { page: 1, perPage: 100 },
        sort: { field: "name", order: "ASC" },
        filter: {},
      });
      setEventTypes(response.data);
    } catch (error) {
      notify("Failed to load event types", { type: "error" });
    }
  };

  const loadTourTypes = async () => {
    try {
      const response = await dataProvider.getList("tour-types", {
        pagination: { page: 1, perPage: 100 },
        sort: { field: "name", order: "ASC" },
        filter: {},
      });
      setTourTypes(response.data as TourType[]);
    } catch (error) {
      console.error("Failed to load tour types:", error);
    }
  };

  const getPatientName = (patientId: number) => {
    const patient = patients.find((p) => p.id === patientId);
    return patient
      ? `${patient.first_name} ${patient.name}`
      : `Patient ${patientId}`;
  };

  const getEventTypeName = (eventTypeId: string | null | undefined) => {
    if (!eventTypeId) return "Unknown Type";
    const eventType = eventTypes.find(
      (t) => t.id === eventTypeId || t.name === eventTypeId,
    );
    return eventType ? eventType.name : eventTypeId;
  };

  const isEventOutsideTourHours = (event: Event) => {
    const formValues = getCurrentFormValues();
    const tourStart = formValues.time_start;
    const tourEnd = formValues.time_end;

    if (!tourStart || !tourEnd) return false;

    const eventStart = event.time_start;
    const eventEnd = event.time_end;

    return eventStart < tourStart || eventEnd > tourEnd;
  };

  // Helper function to parse time string to minutes
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Helper function to convert minutes to time string
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // Helper function to get travel duration between two events from API data
  const getTravelDurationBetweenEvents = (
    fromEventId: number,
    toEventId: number,
  ): number => {
    const travelSegment = validationState.travelSegments.find(
      (segment) =>
        segment.from_event_id === fromEventId &&
        segment.to_event_id === toEventId,
    );
    return travelSegment?.estimated_duration_minutes ?? 15; // Default 15 minutes if no data available
  };

  // Helper function to get effective event times (including pending changes)
  const getEffectiveEventTimes = (event: Event) => {
    const pendingChange = pendingTimeChanges[event.id];
    return {
      time_start: pendingChange?.time_start || event.time_start,
      time_end: pendingChange?.time_end || event.time_end,
      hasPendingChanges: !!pendingChange,
    };
  };

  // Function to suggest time adjustments for overlapping events
  const suggestTimeAdjustments = (events: Event[]) => {
    const sortedEvents = [...events].sort((a, b) =>
      a.time_start.localeCompare(b.time_start),
    );
    const adjustments: Array<{
      eventId: number;
      originalStart: string;
      suggestedStart: string;
      reason: string;
    }> = [];

    for (let i = 0; i < sortedEvents.length; i++) {
      const currentEvent = sortedEvents[i];
      const currentStart = timeToMinutes(currentEvent.time_start);
      const currentEnd = timeToMinutes(currentEvent.time_end);

      // Check for overlap with previous event
      if (i > 0) {
        const previousEvent = sortedEvents[i - 1];
        const previousEnd = timeToMinutes(previousEvent.time_end);
        const travelTime = getTravelDurationBetweenEvents(
          previousEvent.id,
          currentEvent.id,
        );
        const minimumStartTime = previousEnd + travelTime;

        if (currentStart < minimumStartTime) {
          const suggestedStartMinutes = minimumStartTime;
          adjustments.push({
            eventId: currentEvent.id,
            originalStart: currentEvent.time_start,
            suggestedStart: minutesToTime(suggestedStartMinutes),
            reason: `Overlap detected. Needs ${travelTime} min travel time from previous event.`,
          });
        }
      }
    }

    return adjustments;
  };

  // Function to apply local time adjustments (no database update)
  const applyLocalTimeAdjustment = (eventId: number, newStartTime: string) => {
    const event = availableEvents.find((e) => e.id === eventId);
    if (!event) return;

    // Calculate duration to maintain event length
    const originalDuration =
      timeToMinutes(event.time_end) - timeToMinutes(event.time_start);
    const newEndTime = minutesToTime(
      timeToMinutes(newStartTime) + originalDuration,
    );

    // Store pending change locally
    setPendingTimeChanges((prev) => ({
      ...prev,
      [eventId]: {
        time_start: newStartTime,
        time_end: newEndTime,
        originalStart: event.time_start,
        originalEnd: event.time_end,
      },
    }));

    notify(
      `Event time adjusted locally to ${newStartTime} - ${newEndTime}. Save to persist changes.`,
      { type: "info" },
    );

    // Re-validate with the adjusted times
    const assignedEvents = availableEvents.filter(
      (e) => e.assigned_to_tour === record?.id,
    );
    validateProposedTour(assignedEvents);
  };

  // Function to remove free time between events
  const setGapBetweenEvents = (
    currentEventId: number,
    nextEventId: number,
    gapMinutes: number = 0,
  ) => {
    const currentEvent = availableEvents.find((e) => e.id === currentEventId);
    const nextEvent = availableEvents.find((e) => e.id === nextEventId);

    if (!currentEvent || !nextEvent) return;

    const currentEffective = getEffectiveEventTimes(currentEvent);
    const travelDuration = getTravelDurationBetweenEvents(
      currentEventId,
      nextEventId,
    );

    // Calculate new start time: end of current + travel time + desired gap
    const newNextStartMinutes =
      timeToMinutes(currentEffective.time_end) + travelDuration + gapMinutes;
    const newNextStartTime = minutesToTime(newNextStartMinutes);

    applyLocalTimeAdjustment(nextEventId, newNextStartTime);

    const label = gapMinutes === 0 ? "Removed gap" : `Set ${gapMinutes}min gap`;
    notify(`${label}. Next event moved to ${newNextStartTime}`, {
      type: "info",
    });
  };

  // Adjust event duration: change end time by delta minutes (keeps start time)
  const adjustEventDuration = (eventId: number, deltaMinutes: number) => {
    const event = availableEvents.find((e) => e.id === eventId);
    if (!event) return;

    const effective = getEffectiveEventTimes(event);
    const startMin = timeToMinutes(effective.time_start);
    const endMin = timeToMinutes(effective.time_end);
    const newEndMin = Math.max(startMin + 5, endMin + deltaMinutes); // minimum 5 min event
    const newEndTime = minutesToTime(newEndMin);

    setPendingTimeChanges((prev) => ({
      ...prev,
      [eventId]: {
        time_start: effective.time_start,
        time_end: newEndTime,
        originalStart: event.time_start,
        originalEnd: event.time_end,
      },
    }));

    const newDur = newEndMin - startMin;
    notify(`Duration changed to ${newDur}min (${effective.time_start} - ${newEndTime})`, { type: "info" });
  };

  // Add a break to the tour at a specific time
  const addBreak = async (startTime: string, durationMinutes: number, breakType: string = "REST") => {
    if (!record) return;
    const startMin = timeToMinutes(startTime);
    const endTime = minutesToTime(startMin + durationMinutes);
    try {
      const result = await (dataProvider as any).addBreakToTour(record.id, {
        break_type: breakType,
        start_time: startTime,
        end_time: endTime,
      });
      setTourBreaks((prev) => [...prev, result]);
      notify(`${breakType} break added: ${startTime} - ${endTime}`, { type: "success" });
    } catch (error: any) {
      notify(`Failed to add break: ${error.message}`, { type: "error" });
    }
  };

  // Remove a break from the tour
  const removeBreak = async (breakId: number) => {
    if (!record) return;
    try {
      await (dataProvider as any).removeBreakFromTour(record.id, breakId);
      setTourBreaks((prev) => prev.filter((b) => b.id !== breakId));
      notify("Break removed", { type: "info" });
    } catch (error: any) {
      notify(`Failed to remove break: ${error.message}`, { type: "error" });
    }
  };

  // Reorder event: swap time slots with the adjacent event
  const reorderEvent = (eventId: number, direction: "up" | "down") => {
    const assigned = availableEvents
      .filter((e) => e.assigned_to_tour === record?.id)
      .sort((a, b) => {
        const aEff = getEffectiveEventTimes(a);
        const bEff = getEffectiveEventTimes(b);
        return aEff.time_start.localeCompare(bEff.time_start);
      });

    const idx = assigned.findIndex((e) => e.id === eventId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= assigned.length) return;

    const eventA = assigned[idx];
    const eventB = assigned[swapIdx];
    const effA = getEffectiveEventTimes(eventA);
    const effB = getEffectiveEventTimes(eventB);

    // Get durations of each event
    const durA = timeToMinutes(effA.time_end) - timeToMinutes(effA.time_start);
    const durB = timeToMinutes(effB.time_end) - timeToMinutes(effB.time_start);

    // The earlier slot start stays the same; reassign durations in swapped order
    const earlierStart = direction === "up"
      ? timeToMinutes(effB.time_start)
      : timeToMinutes(effA.time_start);

    // Event moving into the earlier slot
    const firstDur = direction === "up" ? durA : durB;
    const secondDur = direction === "up" ? durB : durA;
    const firstId = direction === "up" ? eventA.id : eventB.id;
    const secondId = direction === "up" ? eventB.id : eventA.id;

    // Get travel time between the two (will be recalculated after validation)
    const travelGap = direction === "up"
      ? timeToMinutes(effA.time_start) - timeToMinutes(effB.time_end)
      : timeToMinutes(effB.time_start) - timeToMinutes(effA.time_end);
    const gap = Math.max(travelGap, 0);

    const firstStart = earlierStart;
    const firstEnd = firstStart + firstDur;
    const secondStart = firstEnd + gap;
    const secondEnd = secondStart + secondDur;

    applyLocalTimeAdjustment(firstId, minutesToTime(firstStart));
    applyLocalTimeAdjustment(secondId, minutesToTime(secondStart));

    notify(`Swapped event order`, { type: "info" });
  };

  // Generate timeline items with events, travel segments, and empty gaps
  // Function to detect overlapping events (uses effective times including pending changes)
  const detectOverlaps = (events: any[]) => {
    const overlaps: any[] = [];
    const sortedEvents = [...events].sort((a, b) => {
      const aEffective = getEffectiveEventTimes(a);
      const bEffective = getEffectiveEventTimes(b);
      return aEffective.time_start.localeCompare(bEffective.time_start);
    });

    for (let i = 0; i < sortedEvents.length; i++) {
      for (let j = i + 1; j < sortedEvents.length; j++) {
        const event1 = sortedEvents[i];
        const event2 = sortedEvents[j];
        const eff1 = getEffectiveEventTimes(event1);
        const eff2 = getEffectiveEventTimes(event2);

        const event1Start = timeToMinutes(eff1.time_start);
        const event1End = timeToMinutes(eff1.time_end);
        const event2Start = timeToMinutes(eff2.time_start);
        const event2End = timeToMinutes(eff2.time_end);

        // Check if events overlap
        if (event1Start < event2End && event2Start < event1End) {
          const overlapStart = Math.max(event1Start, event2Start);
          const overlapEnd = Math.min(event1End, event2End);

          overlaps.push({
            event1: event1,
            event2: event2,
            overlapStart: minutesToTime(overlapStart),
            overlapEnd: minutesToTime(overlapEnd),
            overlapDuration: overlapEnd - overlapStart,
          });
        }
      }
    }

    return overlaps;
  };

  const generateTimelineItems = () => {
    const formValues = getCurrentFormValues();
    const tourStart = formValues.time_start || "08:00";
    const tourEnd = formValues.time_end || "17:00";

    // Use effective times for sorting and calculations
    const eventsWithEffectiveTimes = assignedEventsForTour.map((event) => ({
      ...event,
      effectiveTimes: getEffectiveEventTimes(event),
    }));

    const sortedEvents = eventsWithEffectiveTimes.sort((a, b) =>
      a.effectiveTimes.time_start.localeCompare(b.effectiveTimes.time_start),
    );

    // Detect overlaps
    const overlaps = detectOverlaps(assignedEventsForTour);
    const overlappingEventIds = new Set();
    overlaps.forEach((overlap) => {
      overlappingEventIds.add(overlap.event1.id);
      overlappingEventIds.add(overlap.event2.id);
    });

    const timelineItems: any[] = [];
    let currentTime = timeToMinutes(tourStart);
    const tourEndMinutes = timeToMinutes(tourEnd);

    sortedEvents.forEach((event, index) => {
      const effectiveTimes = event.effectiveTimes;
      const eventStartMinutes = timeToMinutes(effectiveTimes.time_start);
      const eventEndMinutes = timeToMinutes(effectiveTimes.time_end);
      const isOverlapping = overlappingEventIds.has(event.id);

      // Add gap before event
      if (currentTime < eventStartMinutes) {
        const isFirstGap = index === 0;
        const gapDuration = eventStartMinutes - currentTime;

        if (isFirstGap) {
          // Split into travel from office + free time if gap is large
          const estimatedTravel = 15; // default 15 min travel from office
          if (gapDuration > estimatedTravel) {
            timelineItems.push({
              type: "from_office",
              startTime: minutesToTime(currentTime),
              endTime: minutesToTime(currentTime + estimatedTravel),
              duration: estimatedTravel,
              currentEventId: null,
              nextEventId: event.id,
            });
            timelineItems.push({
              type: "empty",
              startTime: minutesToTime(currentTime + estimatedTravel),
              endTime: effectiveTimes.time_start,
              duration: gapDuration - estimatedTravel,
              canRemove: true,
              currentEventId: null,
              nextEventId: event.id,
            });
          } else {
            timelineItems.push({
              type: "from_office",
              startTime: minutesToTime(currentTime),
              endTime: effectiveTimes.time_start,
              duration: gapDuration,
              currentEventId: null,
              nextEventId: event.id,
            });
          }
        } else {
          timelineItems.push({
            type: "empty",
            startTime: minutesToTime(currentTime),
            endTime: effectiveTimes.time_start,
            duration: gapDuration,
            canRemove: true,
            currentEventId: index > 0 ? sortedEvents[index - 1].id : null,
            nextEventId: event.id,
          });
        }
      }

      // Add the event with overlap information
      timelineItems.push({
        type: "event",
        event: event,
        startTime: effectiveTimes.time_start,
        endTime: effectiveTimes.time_end,
        duration: eventEndMinutes - eventStartMinutes,
        isOverlapping: isOverlapping,
        hasPendingTimeChanges: effectiveTimes.hasPendingChanges,
        overlappingWith: overlaps
          .filter((o) => o.event1.id === event.id || o.event2.id === event.id)
          .map((o) => (o.event1.id === event.id ? o.event2 : o.event1)),
      });

      currentTime = Math.max(currentTime, eventEndMinutes);

      // Add travel segment if there's a next event
      if (index < sortedEvents.length - 1) {
        const nextEvent = sortedEvents[index + 1];
        const nextEffectiveTimes = nextEvent.effectiveTimes;
        const nextEventStartMinutes = timeToMinutes(
          nextEffectiveTimes.time_start,
        );
        const actualTravelDuration = getTravelDurationBetweenEvents(
          event.id,
          nextEvent.id,
        );
        const travelEndTime = currentTime + actualTravelDuration;

        if (currentTime < nextEventStartMinutes) {
          // Add travel segment with actual duration
          timelineItems.push({
            type: "travel",
            startTime: effectiveTimes.time_end,
            endTime: minutesToTime(travelEndTime),
            duration: actualTravelDuration,
            fromLocation: getPatientName(event.patient_id),
            toLocation: getPatientName(nextEvent.patient_id),
            actualTravelTime: true,
            currentEventId: event.id,
            nextEventId: nextEvent.id,
          });

          // Add free time if there's a gap after travel
          if (travelEndTime < nextEventStartMinutes) {
            timelineItems.push({
              type: "empty",
              startTime: minutesToTime(travelEndTime),
              endTime: nextEffectiveTimes.time_start,
              duration: nextEventStartMinutes - travelEndTime,
              canRemove: true,
              currentEventId: event.id,
              nextEventId: nextEvent.id,
            });
          }

          currentTime = nextEventStartMinutes;
        }
      }
    });

    // Add final empty segment if tour continues after last event
    if (currentTime < tourEndMinutes) {
      timelineItems.push({
        type: "empty",
        startTime: minutesToTime(currentTime),
        endTime: tourEnd,
        duration: tourEndMinutes - currentTime,
      });
    }

    return timelineItems;
  };

  // Calculate and display proximity highlights for available events
  // Combines geographic proximity (from API) with time proximity (client-side)
  const calculateProximityHighlights = async (sourceEvent: AvailableEvent | Event | null) => {
    if (!sourceEvent) {
      setProximityHighlights({});
      return;
    }

    // Get unassigned available events (targets for proximity)
    const unassignedEvents = availableEvents.filter(
      (e) => e.is_available && !e.assigned_to_tour && e.event_type !== "BIRTHDAY",
    );

    if (unassignedEvents.length === 0) {
      setProximityHighlights({});
      notify("No available events to calculate proximity", { type: "info" });
      return;
    }

    // Get source event end time for time proximity scoring
    const sourceEffective = getEffectiveEventTimes(sourceEvent as Event);
    const sourceEndMinutes = timeToMinutes(sourceEffective.time_end);

    try {
      const response = await dataProvider.calculateEventProximity({
        source_event_id: sourceEvent.id,
        target_event_ids: unassignedEvents.map(e => e.id),
      });

      // Build a map of geographic scores from API (lower = closer)
      const geoScores: { [eventId: number]: { distance_km: number; duration_min: number } } = {};
      response.closest_events.forEach((ev: any) => {
        geoScores[ev.event_id] = {
          distance_km: ev.distance_km,
          duration_min: ev.duration_minutes,
        };
      });

      // Compute combined score: geographic proximity + time proximity
      // Time gap = how soon the target event starts after the source ends
      const scored = unassignedEvents
        .map((ev) => {
          const targetStart = timeToMinutes(ev.time_start);
          const timeGapMin = targetStart - sourceEndMinutes; // negative = before source ends
          const absTimeGap = Math.abs(timeGapMin);
          const geo = geoScores[ev.id];
          const geoMinutes = geo ? geo.duration_min : 30; // fallback
          const geoKm = geo ? geo.distance_km : 10;

          // Combined score: weight geographic travel (60%) and time gap (40%)
          // Penalize events that start BEFORE the source ends (negative gap)
          const timePenalty = timeGapMin < 0 ? absTimeGap * 2 : absTimeGap;
          const combinedScore = geoMinutes * 0.6 + timePenalty * 0.4;

          return {
            eventId: ev.id,
            distance_km: geoKm,
            duration_min: geoMinutes,
            timeGapMin,
            combinedScore,
          };
        })
        .sort((a, b) => a.combinedScore - b.combinedScore);

      // Highlight top 5
      const highlights: { [eventId: number]: { rank: number; distance: number; duration: number; timeGap: number; color: string } } = {};
      const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336'];

      scored.slice(0, 5).forEach((item, index) => {
        highlights[item.eventId] = {
          rank: index + 1,
          distance: item.distance_km,
          duration: item.duration_min,
          timeGap: item.timeGapMin,
          color: colors[index] || '#757575',
        };
      });

      setProximityHighlights(highlights);
    } catch (error) {
      console.error('Failed to calculate proximity:', error);
      setProximityHighlights({});
    }
  };

  const handleDragStart = (
    event: React.DragEvent,
    eventData: AvailableEvent,
  ) => {
    setDraggedEvent(eventData);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    
    // Calculate proximity highlights when dragging over the tour area
    if (draggedEvent && !isDraggingOver) {
      setIsDraggingOver(true);
      calculateProximityHighlights(draggedEvent);
    }
  };

  const handleDropOnTour = async (event: React.DragEvent) => {
    event.preventDefault();
    if (!draggedEvent || !record) return;

    // Update local state immediately for UI feedback
    const updatedEvents = availableEvents.map((e) =>
      e.id === draggedEvent.id
        ? {
            ...e,
            tour_id: record.id,
            assigned_to_tour: record.id,
            is_available: true,
          }
        : e,
    );
    setAvailableEvents(updatedEvents);

    // Track pending changes
    setPendingChanges((prev) => ({
      toAssign: [
        ...prev.toAssign.filter((id) => id !== draggedEvent.id),
        draggedEvent.id,
      ],
      toRemove: prev.toRemove.filter((id) => id !== draggedEvent.id),
    }));

    // Trigger validation with updated events
    const assignedEvents = updatedEvents.filter(
      (e) => e.assigned_to_tour === record.id,
    );
    await validateProposedTour(assignedEvents);

    notify("Event added - review validation feedback before saving", {
      type: "info",
    });
    
    // Store the last dropped event and recalculate proximity based on it
    setLastDroppedEventId(draggedEvent.id);
    
    // Recalculate proximity highlights from the just-dropped event to available events
    await calculateProximityHighlights(draggedEvent);
    
    // Reset drag state but keep proximity highlights
    setIsDraggingOver(false);
    setDraggedEvent(null);
  };

  // NEW: Handle drag end (when drag is cancelled or completed outside tour area)
  const handleDragEnd = () => {
    // Only clear highlights if we're not over the drop zone
    if (!isDraggingOver) {
      // Keep existing proximity highlights from last drop
      // Don't clear them here
    }
    setIsDraggingOver(false);
    setDraggedEvent(null);
  };

  // NEW: Handle manual proximity calculation from assigned event to available events
  const handleCalculateProximity = async (sourceEvent: Event) => {
    setLastDroppedEventId(sourceEvent.id);
    await calculateProximityHighlights(sourceEvent);
    
    notify(`Showing closest available events to ${getPatientName(sourceEvent.patient_id)}`, {
      type: "info",
    });
  };

  const handleRemoveFromTour = async (eventToRemove: Event) => {
    // Update local state immediately for UI feedback
    const updatedEvents = availableEvents.map((e) =>
      e.id === eventToRemove.id
        ? {
            ...e,
            tour_id: undefined,
            assigned_to_tour: undefined,
            is_available: true,
          }
        : e,
    );
    setAvailableEvents(updatedEvents);

    // Track pending changes
    setPendingChanges((prev) => ({
      toAssign: prev.toAssign.filter((id) => id !== eventToRemove.id),
      toRemove: [
        ...prev.toRemove.filter((id) => id !== eventToRemove.id),
        eventToRemove.id,
      ],
    }));

    // Trigger validation with updated events
    const assignedEvents = updatedEvents.filter(
      (e) => e.assigned_to_tour === record?.id,
    );
    await validateProposedTour(assignedEvents);

    notify("Event removed - review validation feedback before saving", {
      type: "info",
    });

    // Clear proximity highlights when removing events since the context changes
    setProximityHighlights({});
    setLastDroppedEventId(null);
  };

  const handleSaveChanges = async () => {
    if (
      !record ||
      (pendingChanges.toAssign.length === 0 &&
        pendingChanges.toRemove.length === 0 &&
        Object.keys(pendingTimeChanges).length === 0)
    ) {
      return;
    }

    // Final validation before save
    const assignedEvents = availableEvents.filter(
      (e) => e.assigned_to_tour === record.id,
    );
    if (assignedEvents.length > 0) {
      await validateProposedTour(assignedEvents);

      if (!validationState.isValid) {
        notify(
          "Cannot save tour with validation errors. Please fix the issues first.",
          { type: "error" },
        );
        return;
      }
    }

    setIsSaving(true);

    try {
      // Process time changes first (skip virtual events)
      for (const [eventIdStr, timeChange] of Object.entries(
        pendingTimeChanges,
      )) {
        const eventId = parseInt(eventIdStr);
        if (eventId < 0) continue; // virtual event, will be created with correct times
        const event = availableEvents.find((e) => e.id === eventId);
        if (event) {
          await dataProvider.update("events", {
            id: eventId,
            data: {
              id: eventId,
              time_start: timeChange.time_start,
              time_end: timeChange.time_end,
            },
            previousData: event,
          });
        }
      }

      // Process assignments
      for (const eventId of pendingChanges.toAssign) {
        const event = availableEvents.find((e) => e.id === eventId);
        if (!event) continue;

        const effectiveTimes = getEffectiveEventTimes(event);

        if (eventId < 0) {
          // Virtual event from care plan — create a real event first
          const created = await dataProvider.create("events", {
            data: {
              patient_id: event.patient_id,
              day: record.date,
              time_start_event: effectiveTimes.time_start,
              time_end_event: effectiveTimes.time_end,
              state: 1, // Waiting for validation
              notes: event.notes || "",
              event_type_enum: "ASS_DEP", // Assurance dépendance
              tour_id: record.id,
            },
          });
          console.log("Created real event from care plan session:", created.data.id);
        } else {
          // Real event — just assign to tour
          await dataProvider.update("events", {
            id: eventId,
            data: {
              id: eventId,
              tour_id: record.id,
              time_start: effectiveTimes.time_start,
              time_end: effectiveTimes.time_end,
            },
            previousData: event,
          });
        }
      }

      // Process removals (skip virtual events — they were never saved)
      for (const eventId of pendingChanges.toRemove) {
        if (eventId < 0) continue;
        const event = availableEvents.find((e) => e.id === eventId);
        if (event) {
          await dataProvider.update("events", {
            id: eventId,
            data: {
              id: eventId,
              tour_id: null,
            },
            previousData: event,
          });
        }
      }

      // Update tour metadata: form fields + validation statistics
      const currentFormValues = getCurrentFormValues();
      await dataProvider.update("tours", {
        id: record.id,
        data: {
          id: record.id,
          name: record.name,
          time_start: currentFormValues.time_start,
          time_end: currentFormValues.time_end,
          break_duration: currentFormValues.break_duration,
          employee_id: record.employee_id,
          tour_type_id: selectedTourTypeId,
          ...(validationState.statistics
            ? { total_distance_km: validationState.statistics.total_distance_km }
            : {}),
        },
        previousData: record,
      });

      // Clear pending changes and proximity highlights
      const totalChanges =
        pendingChanges.toAssign.length +
        pendingChanges.toRemove.length +
        Object.keys(pendingTimeChanges).length;
      setPendingChanges({ toAssign: [], toRemove: [] });
      setPendingTimeChanges({});

      // Refresh data
      loadAvailableEvents();
      refresh();

      const efficiencyMessage = validationState.statistics?.efficiency_score
        ? ` Efficiency: ${validationState.statistics.efficiency_score.toFixed(1)}%`
        : "";

      notify(
        `Successfully updated ${totalChanges} events.${efficiencyMessage}`,
        { type: "success" },
      );
    } catch (error) {
      notify("Failed to save changes", { type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = () => {
    // Reload original data to revert local changes
    loadAvailableEvents();
    setPendingChanges({ toAssign: [], toRemove: [] });
    setPendingTimeChanges({});
    notify("Changes cancelled", { type: "info" });
  };

  const handleOptimizeRoute = async () => {
    if (!record) return;

    try {
      await (dataProvider as any).optimizeTour(record.id);
      notify("Route optimization started", { type: "info" });
      refresh();
    } catch (error) {
      notify("Route optimization failed", { type: "error" });
    }
  };

  const assignedEventsForTour = availableEvents.filter(
    (e) => e.assigned_to_tour === record?.id,
  );
  const selectedTourType = tourTypes.find((tt) => tt.id === selectedTourTypeId);
  const tourTypePackageCodeSet = selectedTourType
    ? new Set(selectedTourType.long_term_packages.map((pkg) => pkg.code))
    : null;

  const unassignedEvents = availableEvents.filter(
    (e) => e.is_available && !e.assigned_to_tour && e.event_type !== "BIRTHDAY",
  );

  // Filter by tour type long-term packages if a tour type is selected
  const careCodeFilteredEvents = tourTypePackageCodeSet
    ? unassignedEvents.filter((e) => {
        if (!e.care_codes || e.care_codes.length === 0) return false;
        return e.care_codes.some((code) => tourTypePackageCodeSet.has(code));
      })
    : unassignedEvents;

  const filteredUnassignedEvents = patientSearch.trim()
    ? careCodeFilteredEvents.filter((e) => {
        const name = getPatientName(e.patient_id).toLowerCase();
        const notes = (e.notes || "").toLowerCase();
        const search = patientSearch.trim().toLowerCase();
        return name.includes(search) || notes.includes(search);
      })
    : careCodeFilteredEvents;
  const conflictingEvents = assignedEventsForTour.filter((e) =>
    isEventOutsideTourHours(e),
  );
  const currentFormValues = getCurrentFormValues();

  if (!record) return null;

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {/* Tour Details - Full width on top */}
        <Grid xs={12}>
          <Card>
            <CardHeader
              title="Tour Details"
              avatar={<Schedule color="primary" />}
              sx={{ pb: 1 }}
            />
            <CardContent sx={{ pt: 0 }}>
              <Grid container spacing={2}>
                {/* Left section: Form fields */}
                <Grid xs={12} md={4}>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    <TextInput
                      source="name"
                      label="Tour Name"
                      fullWidth
                      size="small"
                    />
                    <DateInput source="date" size="small" />

                    {/* Time inputs - Compact layout */}
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <TextInput
                        source="time_start"
                        label="Start"
                        type="time"
                        size="small"
                        sx={{ flex: 1 }}
                        validate={required()}
                      />
                      <TextInput
                        source="time_end"
                        label="End"
                        type="time"
                        size="small"
                        sx={{ flex: 1 }}
                        validate={required()}
                      />
                    </Box>

                    <TextInput
                      source="break_duration"
                      label="Break (min)"
                      type="number"
                      size="small"
                      validate={required()}
                    />

                    {/* Employee Assignment */}
                    <ReferenceInput
                      source="employee_id"
                      reference="employees"
                      sort={{ field: "name", order: "ASC" }}
                    >
                      <SelectInput optionText="name" size="small" />
                    </ReferenceInput>

                    {/* Tour Type */}
                    <FormControl fullWidth size="small">
                      <InputLabel id="tour-type-label">Tour Type</InputLabel>
                      <Select
                        labelId="tour-type-label"
                        value={selectedTourTypeId ?? ""}
                        label="Tour Type"
                        onChange={(e) => {
                          const val = e.target.value;
                          const newId = val === "" ? null : (val as number);
                          setSelectedTourTypeId(newId);
                          formContext?.setValue("tour_type_id", newId);
                        }}
                      >
                        <MenuItem value="">
                          <em>None (show all events)</em>
                        </MenuItem>
                        {tourTypes.map((tt) => (
                          <MenuItem key={tt.id} value={tt.id}>
                            {tt.name}
                            {tt.long_term_packages.length > 0 && (
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{ ml: 1, color: "text.secondary" }}
                              >
                                ({tt.long_term_packages.length} packages)
                              </Typography>
                            )}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Events Source Mode */}
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                        Source
                      </Typography>
                      <ToggleButtonGroup
                        value={tourMode}
                        exclusive
                        onChange={(_, val) => {
                          if (val) {
                            setTourMode(val);
                            setAvailableEvents([]);
                            setPendingChanges({ toAssign: [], toRemove: [] });
                            // Reload with new mode after state update
                            setTimeout(() => {
                              if (val === "careplans") {
                                loadCarePlanEvents();
                              } else {
                                loadAvailableEvents();
                              }
                            }, 0);
                          }
                        }}
                        size="small"
                        fullWidth
                      >
                        <ToggleButton value="events">
                          Événements
                        </ToggleButton>
                        <ToggleButton value="careplans">
                          Plans de soins
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Box>
                </Grid>

                {/* Middle section: Statistics and actions */}
                <Grid xs={12} md={4}>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    {/* Tour Stats & Validation */}
                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ fontSize: "1rem" }}
                        >
                          Statistics
                        </Typography>
                        {isValidating && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <div
                              className="spinner"
                              style={{
                                width: 16,
                                height: 16,
                                border: "2px solid #f3f3f3",
                                borderTop: "2px solid #3498db",
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite",
                              }}
                            />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Validating...
                            </Typography>
                          </Box>
                        )}
                        {!isValidating &&
                          (validationState.isValid ? (
                            <CheckCircle
                              color="success"
                              sx={{ fontSize: 16 }}
                            />
                          ) : (
                            <Error color="error" sx={{ fontSize: 16 }} />
                          ))}
                      </Box>

                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        <Chip
                          icon={<Schedule />}
                          label={`${assignedEventsForTour.length} Events`}
                          color="primary"
                          size="small"
                        />
                        <Chip
                          icon={<RouteIcon />}
                          label={
                            validationState.statistics?.total_distance_km
                              ? `${validationState.statistics.total_distance_km.toFixed(1)} km`
                              : record.total_distance_km
                                ? `${record.total_distance_km} km`
                                : "Distance TBD"
                          }
                          color="secondary"
                          size="small"
                        />
                        <Chip
                          icon={<AccessTime />}
                          label={
                            validationState.statistics?.total_care_time_minutes
                              ? `${validationState.statistics.total_care_time_minutes}min care`
                              : "Duration TBD"
                          }
                          color="success"
                          size="small"
                        />
                        {validationState.statistics
                          ?.total_travel_time_minutes && (
                          <Chip
                            icon={<DirectionsCar />}
                            label={`${validationState.statistics.total_travel_time_minutes}min`}
                            color="info"
                            size="small"
                          />
                        )}
                        <Chip
                          label={record.optimization_status || "pending"}
                          color={
                            record.optimization_status === "optimized"
                              ? "success"
                              : record.optimization_status === "manual"
                                ? "info"
                                : "warning"
                          }
                          size="small"
                        />
                      </Box>

                      {/* Compact Efficiency Score */}
                      {validationState.statistics?.efficiency_score && (
                        <Box sx={{ mt: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ minWidth: "60px" }}
                            >
                              Efficiency:
                            </Typography>
                            <Box sx={{ flex: 1 }}>
                              <div
                                style={{
                                  width: "100%",
                                  height: 6,
                                  backgroundColor: "#e0e0e0",
                                  borderRadius: 3,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${validationState.statistics.efficiency_score}%`,
                                    height: "100%",
                                    backgroundColor:
                                      validationState.statistics
                                        .efficiency_score >= 80
                                        ? "#4caf50"
                                        : validationState.statistics
                                              .efficiency_score >= 60
                                          ? "#ff9800"
                                          : "#f44336",
                                    transition: "width 0.3s ease",
                                  }}
                                />
                              </div>
                            </Box>
                            <Typography
                              variant="caption"
                              sx={{ minWidth: "35px" }}
                            >
                              {validationState.statistics.efficiency_score.toFixed(
                                1,
                              )}
                              %
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      {/* Validation Errors */}
                      {validationState.errors.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography
                            variant="subtitle2"
                            color="error"
                            gutterBottom
                          >
                            ❌ Validation Errors
                          </Typography>
                          {validationState.errors.map((error, index) => (
                            <Alert
                              key={index}
                              severity="error"
                              sx={{ mb: 1, py: 0.5 }}
                            >
                              <Typography variant="body2">
                                {error.message}
                              </Typography>
                              {error.suggested_fix && (
                                <Typography variant="caption" display="block">
                                  💡 {error.suggested_fix}
                                </Typography>
                              )}
                            </Alert>
                          ))}
                        </Box>
                      )}

                      {/* Validation Warnings */}
                      {validationState.warnings.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography
                            variant="subtitle2"
                            color="warning.main"
                            gutterBottom
                          >
                            ⚠️ Warnings
                          </Typography>
                          {validationState.warnings.map((warning, index) => (
                            <Alert
                              key={index}
                              severity="warning"
                              sx={{ mb: 1, py: 0.5 }}
                            >
                              <Typography variant="body2">
                                {warning.message}
                              </Typography>
                              {warning.suggested_fix && (
                                <Typography variant="caption" display="block">
                                  💡 {warning.suggested_fix}
                                </Typography>
                              )}
                            </Alert>
                          ))}
                        </Box>
                      )}

                      {/* Optimization Suggestions */}
                      {validationState.optimizationSuggestions.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography
                            variant="subtitle2"
                            color="info.main"
                            gutterBottom
                          >
                            💡 Optimization Tips
                          </Typography>
                          {validationState.optimizationSuggestions.map(
                            (suggestion, index) => (
                              <Alert
                                key={index}
                                severity="info"
                                sx={{ mb: 1, py: 0.5 }}
                              >
                                <Typography variant="body2">
                                  {suggestion.description}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  Impact: {suggestion.impact} • Savings:{" "}
                                  {suggestion.estimated_savings_minutes}min
                                </Typography>
                                <Typography variant="caption" display="block">
                                  👉 {suggestion.suggested_action}
                                </Typography>
                              </Alert>
                            ),
                          )}
                        </Box>
                      )}
                    </Box>

                    <Button
                      variant="contained"
                      startIcon={<RouteIcon />}
                      onClick={handleOptimizeRoute}
                      fullWidth
                      size="small"
                      sx={{ mb: 1 }}
                    >
                      Optimize Route
                    </Button>

                    {/* Auto-adjust overlapping events button */}
                    {(() => {
                      const adjustments = suggestTimeAdjustments(
                        assignedEventsForTour,
                      );
                      return adjustments.length > 0 ? (
                        <Button
                          variant="outlined"
                          color="warning"
                          onClick={() => {
                            for (const adjustment of adjustments) {
                              applyLocalTimeAdjustment(
                                adjustment.eventId,
                                adjustment.suggestedStart,
                              );
                            }
                            notify(
                              `Adjusted ${adjustments.length} event(s) locally. Save to persist changes.`,
                              { type: "info" },
                            );
                          }}
                          fullWidth
                          size="small"
                          sx={{ mb: 1 }}
                          startIcon={<Schedule />}
                        >
                          Fix All Overlaps ({adjustments.length})
                        </Button>
                      ) : null;
                    })()}

                    <Button
                      variant={needsRefresh ? "contained" : "outlined"}
                      startIcon={eventsLoading ? undefined : needsRefresh ? <Warning /> : <RefreshIcon />}
                      onClick={refreshEventsWithCurrentForm}
                      fullWidth
                      color={needsRefresh ? "warning" : "secondary"}
                      disabled={eventsLoading}
                      size="small"
                      sx={{
                        mb: 1,
                        ...(needsRefresh && {
                          animation: "pulse 1.5s ease-in-out infinite",
                          "@keyframes pulse": {
                            "0%, 100%": {
                              transform: "scale(1)",
                              boxShadow: "0 0 0 0 rgba(237, 108, 2, 0.7)",
                            },
                            "50%": {
                              transform: "scale(1.02)",
                              boxShadow: "0 0 0 8px rgba(237, 108, 2, 0)",
                            },
                          },
                        }),
                      }}
                    >
                      {eventsLoading ? "Loading..." : needsRefresh ? "⚠️ Update Events List" : "Update Events"}
                    </Button>

                    {/* Save/Cancel Changes Buttons */}
                    {(pendingChanges.toAssign.length > 0 ||
                      pendingChanges.toRemove.length > 0 ||
                      Object.keys(pendingTimeChanges).length > 0) && (
                      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={handleSaveChanges}
                          disabled={isSaving}
                          size="small"
                          sx={{ flex: 1 }}
                        >
                          {isSaving
                            ? "Saving..."
                            : `Save (${pendingChanges.toAssign.length + pendingChanges.toRemove.length + Object.keys(pendingTimeChanges).length})`}
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={handleCancelChanges}
                          disabled={isSaving}
                          size="small"
                          sx={{ flex: 1 }}
                        >
                          Cancel
                        </Button>
                      </Box>
                    )}

                    {/* Pending Changes Summary */}
                    {(pendingChanges.toAssign.length > 0 ||
                      pendingChanges.toRemove.length > 0 ||
                      Object.keys(pendingTimeChanges).length > 0) && (
                      <Box
                        sx={{
                          p: 1,
                          backgroundColor: "#fff3e0",
                          borderRadius: 1,
                          border: "1px solid #ff9800",
                        }}
                      >
                        <Typography variant="caption" color="warning.main">
                          <strong>Pending Changes:</strong>
                        </Typography>
                        {pendingChanges.toAssign.length > 0 && (
                          <Typography variant="caption" display="block">
                            • {pendingChanges.toAssign.length} event(s) to
                            assign
                          </Typography>
                        )}
                        {pendingChanges.toRemove.length > 0 && (
                          <Typography variant="caption" display="block">
                            • {pendingChanges.toRemove.length} event(s) to
                            remove
                          </Typography>
                        )}
                        {Object.keys(pendingTimeChanges).length > 0 && (
                          <Typography variant="caption" display="block">
                            • {Object.keys(pendingTimeChanges).length} event(s)
                            with time changes
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Events Section - Side by Side */}
        <Grid xs={12}>
          <Grid container spacing={2}>
            {/* Assigned Events */}
            <Grid xs={12} md={6}>
              <Card>
                <CardHeader
                  title={`Assigned Events (${assignedEventsForTour.length})`}
                  avatar={<Person color="success" />}
                  action={
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {/* General proximity calculation button */}
                      {assignedEventsForTour.length >= 1 && (!proximityHighlights || Object.keys(proximityHighlights).length === 0) && (
                        <Button
                          size="small"
                          onClick={async () => {
                            // Use the last dropped event if available, otherwise use the last event in the tour
                            const sourceEvent = lastDroppedEventId 
                              ? assignedEventsForTour.find(e => e.id === lastDroppedEventId)
                              : assignedEventsForTour[assignedEventsForTour.length - 1];
                            
                            if (sourceEvent) {
                              await handleCalculateProximity(sourceEvent);
                            }
                          }}
                          startIcon={<LocationOn />}
                          sx={{ fontSize: "0.75rem" }}
                          variant="outlined"
                        >
                          Show Closest Available
                        </Button>
                      )}
                      {/* Clear proximity button */}
                      {proximityHighlights && Object.keys(proximityHighlights).length > 0 && (
                        <Button
                          size="small"
                          onClick={() => {
                            setProximityHighlights({});
                            setLastDroppedEventId(null);
                          }}
                          startIcon={<RemoveIcon />}
                          sx={{ fontSize: "0.75rem" }}
                        >
                          Clear Proximity
                        </Button>
                      )}
                    </Box>
                  }
                />
                <CardContent>
                  {conflictingEvents.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>{conflictingEvents.length} event(s)</strong>{" "}
                        fall outside tour hours (
                        {currentFormValues.time_start || "TBD"} -{" "}
                        {currentFormValues.time_end || "TBD"}). Consider
                        adjusting tour times or event schedules.
                      </Typography>
                    </Alert>
                  )}

                  <Paper
                    sx={{
                      minHeight: 400,
                      p: 2,
                      border: (theme) => `2px dashed ${theme.palette.divider}`,
                      backgroundColor: (theme) =>
                        theme.palette.mode === "dark"
                          ? theme.palette.background.default
                          : "#f9f9f9",
                    }}
                    onDragOver={handleDragOver}
                    onDrop={handleDropOnTour}
                    onDragLeave={() => {
                      // Don't clear proximity highlights, keep them from last drop
                      setIsDraggingOver(false);
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      Drop events here to assign them to this tour
                    </Typography>

                    {assignedEventsForTour.length === 0 ? (
                      <Alert severity="info">
                        No events assigned yet. Drag events from the available
                        list.
                      </Alert>
                    ) : (
                      <Box sx={{ py: 1, px: 1 }}>
                        {generateTimelineItems().map((item, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              mb: 2,
                            }}
                          >
                            {/* Time column */}
                            <Box
                              sx={{
                                minWidth: "60px",
                                maxWidth: "60px",
                                mr: 2,
                                pt: 1,
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {item.startTime}
                              </Typography>
                            </Box>

                            {/* Icon and connector */}
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                mr: 2,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  bgcolor:
                                    item.type === "event"
                                      ? item.isOverlapping
                                        ? "error.main"
                                        : "primary.main"
                                      : item.type === "travel"
                                        ? "secondary.main"
                                        : item.type === "from_office"
                                          ? "info.main"
                                          : "grey.400",
                                  color: "white",
                                  border:
                                    item.type === "empty" || item.type === "from_office"
                                      ? "2px solid"
                                      : item.isOverlapping
                                        ? "3px solid"
                                        : "none",
                                  borderColor:
                                    item.type === "empty"
                                      ? "grey.400"
                                      : item.type === "from_office"
                                        ? "info.main"
                                        : item.isOverlapping
                                          ? "error.dark"
                                          : "transparent",
                                  backgroundColor:
                                    item.type === "empty"
                                      ? "transparent"
                                      : undefined,
                                  animation: item.isOverlapping
                                    ? "pulse 2s infinite"
                                    : "none",
                                  "@keyframes pulse": {
                                    "0%": {
                                      boxShadow:
                                        "0 0 0 0 rgba(211, 47, 47, 0.7)",
                                    },
                                    "70%": {
                                      boxShadow:
                                        "0 0 0 10px rgba(211, 47, 47, 0)",
                                    },
                                    "100%": {
                                      boxShadow: "0 0 0 0 rgba(211, 47, 47, 0)",
                                    },
                                  },
                                }}
                              >
                                {item.type === "event" && (
                                  <LocationOn sx={{ fontSize: 16 }} />
                                )}
                                {item.type === "travel" && (
                                  <DirectionsCar sx={{ fontSize: 16 }} />
                                )}
                                {item.type === "from_office" && (
                                  <DirectionsCar sx={{ fontSize: 16 }} />
                                )}
                                {item.type === "empty" && (
                                  <MoreTime
                                    sx={{ fontSize: 16, color: "grey.400" }}
                                  />
                                )}
                              </Box>
                              {index < generateTimelineItems().length - 1 && (
                                <Box
                                  sx={{
                                    width: 2,
                                    height: 24,
                                    bgcolor: "grey.300",
                                    mt: 1,
                                  }}
                                />
                              )}
                            </Box>

                            {/* Content */}
                            <Box sx={{ flex: 1, py: 1 }}>
                              {item.type === "event" && (
                                <Box>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                      mb: 0.5,
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: "bold" }}
                                    >
                                      {getPatientName(item.event.patient_id)}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      ({item.duration} min)
                                    </Typography>
                                    {pendingChanges.toRemove.includes(
                                      item.event.id,
                                    ) && (
                                      <Chip
                                        size="small"
                                        label="Removing"
                                        color="error"
                                        sx={{
                                          fontSize: "0.625rem",
                                          height: 16,
                                        }}
                                      />
                                    )}
                                    {pendingChanges.toAssign.includes(
                                      item.event.id,
                                    ) && (
                                      <Chip
                                        size="small"
                                        label="Adding"
                                        color="success"
                                        sx={{
                                          fontSize: "0.625rem",
                                          height: 16,
                                        }}
                                      />
                                    )}
                                    {item.hasPendingTimeChanges && (
                                      <Chip
                                        size="small"
                                        label="Time Changed"
                                        color="warning"
                                        sx={{
                                          fontSize: "0.625rem",
                                          height: 16,
                                          fontWeight: "bold",
                                        }}
                                      />
                                    )}
                                    {item.isOverlapping && (
                                      <Chip
                                        size="small"
                                        label="OVERLAP!"
                                        color="error"
                                        sx={{
                                          fontSize: "0.625rem",
                                          height: 16,
                                          fontWeight: "bold",
                                          animation: "blink 1.5s infinite",
                                          "@keyframes blink": {
                                            "0%, 50%": { opacity: 1 },
                                            "51%, 100%": { opacity: 0.6 },
                                          },
                                        }}
                                      />
                                    )}
                                    {/* Show indicator for source event */}
                                    {lastDroppedEventId === item.event.id && (
                                      <Chip
                                        size="small"
                                        label="NEW"
                                        sx={{
                                          backgroundColor: "#FFD700",
                                          color: "black",
                                          fontSize: "0.5rem",
                                          height: 16,
                                          fontWeight: "bold",
                                          "& .MuiChip-label": {
                                            px: 0.5,
                                          },
                                        }}
                                      />
                                    )}
                                    {/* NEW: Proximity calculation button */}
                                    <IconButton
                                      size="small"
                                      onClick={() => handleCalculateProximity(item.event)}
                                      color="primary"
                                      sx={{ width: 24, height: 24 }}
                                      title="Show closest available events to this location"
                                    >
                                      <LocationOn sx={{ fontSize: 16 }} />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => reorderEvent(item.event.id, "up")}
                                      color="default"
                                      sx={{ width: 24, height: 24 }}
                                      title="Move event earlier"
                                    >
                                      <ArrowUpward sx={{ fontSize: 16 }} />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => reorderEvent(item.event.id, "down")}
                                      color="default"
                                      sx={{ width: 24, height: 24 }}
                                      title="Move event later"
                                    >
                                      <ArrowDownward sx={{ fontSize: 16 }} />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleRemoveFromTour(item.event)
                                      }
                                      color="error"
                                      sx={{ ml: "auto", width: 24, height: 24 }}
                                    >
                                      <RemoveIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Box>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {item.startTime} - {item.endTime} •{" "}
                                      {getEventTypeName(item.event.event_type)}
                                    </Typography>
                                    <Box sx={{ display: "flex", gap: 0.25 }}>
                                      {[-10, -5, 5, 10].map((d) => (
                                        <Button
                                          key={d}
                                          size="small"
                                          variant="text"
                                          onClick={() => adjustEventDuration(item.event.id, d)}
                                          sx={{
                                            fontSize: "0.55rem",
                                            minWidth: "auto",
                                            px: 0.4,
                                            py: 0,
                                            lineHeight: 1,
                                            height: 16,
                                            color: d < 0 ? "error.main" : "success.main",
                                          }}
                                          title={`${d > 0 ? "+" : ""}${d}min duration`}
                                        >
                                          {d > 0 ? "+" : ""}{d}′
                                        </Button>
                                      ))}
                                    </Box>
                                  </Box>
                                  {item.event.notes && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      display="block"
                                      sx={{
                                        mt: 0.25,
                                        fontSize: "0.65rem",
                                        lineHeight: 1.3,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        maxWidth: 400,
                                      }}
                                      title={item.event.notes}
                                    >
                                      📋 {item.event.notes}
                                    </Typography>
                                  )}
                                  {isEventOutsideTourHours(item.event) && (
                                    <Typography
                                      variant="caption"
                                      color="warning.main"
                                      display="block"
                                    >
                                      ⚠️ Outside tour hours
                                    </Typography>
                                  )}
                                  {item.isOverlapping &&
                                    item.overlappingWith && (
                                      <Box
                                        sx={{
                                          mt: 0.5,
                                          p: 0.5,
                                          bgcolor: "error.light",
                                          borderRadius: 0.5,
                                          border: "1px solid",
                                          borderColor: "error.main",
                                        }}
                                      >
                                        <Typography
                                          variant="caption"
                                          color="error.dark"
                                          display="block"
                                          sx={{ fontWeight: "bold" }}
                                        >
                                          ⚠️ SCHEDULING CONFLICT DETECTED!
                                        </Typography>
                                        {item.overlappingWith.map(
                                          (conflictEvent: any, idx: number) => (
                                            <Typography
                                              key={idx}
                                              variant="caption"
                                              color="error.dark"
                                              display="block"
                                            >
                                              • Overlaps with{" "}
                                              {getPatientName(
                                                conflictEvent.patient_id,
                                              )}{" "}
                                              ({conflictEvent.time_start} -{" "}
                                              {conflictEvent.time_end})
                                            </Typography>
                                          ),
                                        )}

                                        {/* Time Adjustment Suggestions */}
                                        {(() => {
                                          const adjustments =
                                            suggestTimeAdjustments(
                                              assignedEventsForTour,
                                            );
                                          const eventAdjustment =
                                            adjustments.find(
                                              (adj) =>
                                                adj.eventId === item.event.id,
                                            );

                                          if (eventAdjustment) {
                                            return (
                                              <Box
                                                sx={{
                                                  mt: 1,
                                                  p: 0.5,
                                                  bgcolor: "info.light",
                                                  borderRadius: 0.5,
                                                }}
                                              >
                                                <Typography
                                                  variant="caption"
                                                  color="info.dark"
                                                  display="block"
                                                  sx={{ fontWeight: "bold" }}
                                                >
                                                  💡 Suggested Fix:
                                                </Typography>
                                                <Typography
                                                  variant="caption"
                                                  color="info.dark"
                                                  display="block"
                                                >
                                                  Move start time from{" "}
                                                  {
                                                    eventAdjustment.originalStart
                                                  }{" "}
                                                  to{" "}
                                                  {
                                                    eventAdjustment.suggestedStart
                                                  }
                                                </Typography>
                                                <Typography
                                                  variant="caption"
                                                  color="info.dark"
                                                  display="block"
                                                  sx={{ fontSize: "0.6rem" }}
                                                >
                                                  {eventAdjustment.reason}
                                                </Typography>
                                                <Button
                                                  size="small"
                                                  variant="contained"
                                                  color="info"
                                                  onClick={() =>
                                                    applyLocalTimeAdjustment(
                                                      item.event.id,
                                                      eventAdjustment.suggestedStart,
                                                    )
                                                  }
                                                  sx={{
                                                    mt: 0.5,
                                                    fontSize: "0.6rem",
                                                    py: 0.25,
                                                    px: 1,
                                                  }}
                                                >
                                                  Apply Fix
                                                </Button>
                                              </Box>
                                            );
                                          }
                                          return null;
                                        })()}

                                        <Typography
                                          variant="caption"
                                          color="error.dark"
                                          display="block"
                                          sx={{ fontStyle: "italic", mt: 0.5 }}
                                        >
                                          Please adjust event times to resolve
                                          conflict
                                        </Typography>
                                      </Box>
                                    )}
                                </Box>
                              )}
                              {item.type === "travel" && (
                                <Box>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      🚗 Travel: {item.fromLocation} →{" "}
                                      {item.toLocation}
                                    </Typography>
                                    {item.currentEventId && item.nextEventId && (
                                      <Box sx={{ display: "flex", gap: 0.5 }}>
                                        {[5, 10, 15].map((gap) => (
                                          <Button
                                            key={gap}
                                            size="small"
                                            variant="outlined"
                                            color="info"
                                            onClick={() =>
                                              setGapBetweenEvents(
                                                item.currentEventId,
                                                item.nextEventId,
                                                gap,
                                              )
                                            }
                                            sx={{
                                              fontSize: "0.55rem",
                                              py: 0,
                                              px: 0.5,
                                              minWidth: "auto",
                                              lineHeight: 1,
                                              height: 18,
                                            }}
                                          >
                                            +{gap}′
                                          </Button>
                                        ))}
                                      </Box>
                                    )}
                                  </Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {item.startTime} - {item.endTime} •{" "}
                                    {item.duration} min{" "}
                                    {item.actualTravelTime
                                      ? "travel time"
                                      : "estimated"}
                                    {(() => {
                                      const segment =
                                        validationState.travelSegments.find(
                                          (s) =>
                                            s.from_event_id === item.currentEventId &&
                                            s.to_event_id === item.nextEventId,
                                        );
                                      return segment
                                        ? ` • ${segment.estimated_distance_km.toFixed(1)}km`
                                        : "";
                                    })()}
                                  </Typography>
                                </Box>
                              )}
                              {item.type === "from_office" && (
                                <Box>
                                  <Typography
                                    variant="body2"
                                    color="primary.main"
                                    sx={{ fontWeight: "bold" }}
                                  >
                                    🏢 Travel from office
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {record?.office_address || "Office"} → first patient
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                  >
                                    {item.startTime} - {item.endTime} • {item.duration} min
                                  </Typography>
                                </Box>
                              )}
                              {item.type === "empty" && (
                                <Box>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      ⏱️ Free time
                                    </Typography>
                                    {item.canRemove &&
                                      item.currentEventId &&
                                      item.nextEventId && (
                                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                          {[0, 5, 10, 15, 30].map((gap) => (
                                            <Button
                                              key={gap}
                                              size="small"
                                              variant={gap === 0 ? "contained" : "outlined"}
                                              color="warning"
                                              onClick={() =>
                                                setGapBetweenEvents(
                                                  item.currentEventId,
                                                  item.nextEventId,
                                                  gap,
                                                )
                                              }
                                              sx={{
                                                fontSize: "0.6rem",
                                                py: 0.25,
                                                px: 0.5,
                                                minWidth: "auto",
                                                lineHeight: 1,
                                              }}
                                            >
                                              {gap === 0 ? "0" : `${gap}′`}
                                            </Button>
                                          ))}
                                        </Box>
                                      )}
                                  </Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {item.startTime} - {item.endTime} •{" "}
                                    {item.duration} min available
                                  </Typography>
                                  {item.canRemove && (
                                    <Typography
                                      variant="caption"
                                      color="info.main"
                                      display="block"
                                      sx={{
                                        fontSize: "0.65rem",
                                        fontStyle: "italic",
                                      }}
                                    >
                                      💡 Set gap duration or click 0 to remove
                                    </Typography>
                                  )}
                                  {item.duration >= 15 && (
                                    <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                                      {[
                                        { label: "☕ 15′", type: "REST", dur: 15 },
                                        { label: "🍽️ 30′", type: "LUNCH", dur: 30 },
                                        { label: "🍽️ 45′", type: "LUNCH", dur: 45 },
                                      ]
                                        .filter((b) => b.dur <= item.duration)
                                        .map((b) => (
                                          <Button
                                            key={b.label}
                                            size="small"
                                            variant="outlined"
                                            color="secondary"
                                            onClick={() => addBreak(item.startTime, b.dur, b.type)}
                                            sx={{
                                              fontSize: "0.6rem",
                                              py: 0.25,
                                              px: 0.5,
                                              minWidth: "auto",
                                              lineHeight: 1,
                                            }}
                                          >
                                            {b.label}
                                          </Button>
                                        ))}
                                    </Box>
                                  )}
                                </Box>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Paper>
                </CardContent>
              </Card>

              {/* Breaks */}
              {tourBreaks.length > 0 && (
                <Card sx={{ mt: 1 }}>
                  <CardHeader
                    title={`Breaks (${tourBreaks.length})`}
                    avatar={<Coffee color="secondary" />}
                    titleTypographyProps={{ variant: "subtitle1" }}
                    sx={{ pb: 0 }}
                  />
                  <CardContent sx={{ pt: 1 }}>
                    {tourBreaks.map((b) => (
                      <Box
                        key={b.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          py: 0.5,
                          px: 1,
                          mb: 0.5,
                          bgcolor: "#fff3e0",
                          borderRadius: 1,
                          border: "1px solid #ffe0b2",
                        }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                            {b.break_type === "LUNCH" ? "🍽️" : "☕"}{" "}
                            {b.break_type} break
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)}
                            {b.duration_minutes ? ` • ${b.duration_minutes}min` : ""}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeBreak(b.id)}
                          title="Remove break"
                        >
                          <RemoveIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              )}
            </Grid>

            {/* Available Events */}
            <Grid xs={12} md={6}>
              <Card>
                <CardHeader
                  title={`Available Events (${patientSearch || selectedTourType ? `${filteredUnassignedEvents.length}/` : ""}${unassignedEvents.length})`}
                  avatar={<AddIcon color="info" />}
                />
                <CardContent>
                  {needsRefresh && (
                    <Alert
                      severity="warning"
                      sx={{
                        mb: 2,
                        animation: "blink 2s ease-in-out infinite",
                        "@keyframes blink": {
                          "0%, 100%": { opacity: 1 },
                          "50%": { opacity: 0.7 },
                        },
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                        ⚠️ Tour date/times have changed!
                      </Typography>
                      <Typography variant="caption">
                        Click "Update Events List" button above to refresh available events
                      </Typography>
                    </Alert>
                  )}
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {tourMode === "careplans"
                        ? `Sessions from care plans for ${currentFormValues.date}`
                        : `Events for ${currentFormValues.date} that can be assigned to tours`}
                    </Typography>
                    {!needsRefresh && (
                      <Typography variant="caption" color="text.secondary">
                        💡 After changing tour date/times, click "Update Events
                        List" button in Tour Details to refresh
                      </Typography>
                    )}
                  </Box>
                  <TextField
                    size="small"
                    placeholder="Search patient or notes..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    fullWidth
                    sx={{ mb: 1 }}
                    InputProps={{
                      sx: { fontSize: "0.85rem", height: 36 },
                    }}
                  />
                  {selectedTourType && (
                    <Alert severity="info" sx={{ mb: 1, py: 0 }}>
                      <Typography variant="caption">
                        Filtered by tour type <strong>{selectedTourType.name}</strong>
                        {" "}({selectedTourType.long_term_packages.map((pkg) => pkg.code).join(", ")})
                      </Typography>
                    </Alert>
                  )}

                  {filteredUnassignedEvents.length === 0 ? (
                    <Alert severity="warning">
                      No available events for this date. Create new events or
                      check other dates.
                    </Alert>
                  ) : (
                    <List dense sx={{ maxHeight: 400, overflow: "auto" }}>
                      {filteredUnassignedEvents.map((event) => {
                        const isPendingAssignment =
                          pendingChanges.toAssign.includes(event.id);
                        const isPendingRemoval =
                          pendingChanges.toRemove.includes(event.id);

                        return (
                          <ListItem
                            key={event.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, event)}
                            onDragEnd={handleDragEnd}
                            sx={{
                              mb: 1,
                              backgroundColor: isPendingAssignment
                                ? (theme) =>
                                    theme.palette.mode === "dark"
                                      ? "rgba(76, 175, 80, 0.15)"
                                      : "#e8f5e8"
                                : (theme) =>
                                    theme.palette.mode === "dark"
                                      ? theme.palette.background.paper
                                      : "white",
                              borderRadius: 1,
                              border: isPendingAssignment
                                ? "2px solid #4caf50"
                                : (theme) =>
                                    `1px solid ${theme.palette.divider}`,
                              cursor: "grab",
                              opacity: isPendingAssignment ? 0.7 : 1,
                              "&:hover": {
                                backgroundColor: isPendingAssignment
                                  ? (theme) =>
                                      theme.palette.mode === "dark"
                                        ? "rgba(76, 175, 80, 0.25)"
                                        : "#e8f5e8"
                                  : (theme) =>
                                      theme.palette.mode === "dark"
                                        ? theme.palette.action.hover
                                        : "#f5f5f5",
                                borderColor: isPendingAssignment
                                  ? "#4caf50"
                                  : "#2196f3",
                              },
                              "&:active": {
                                cursor: "grabbing",
                              },
                            }}
                          >
                            <DragIndicator
                              sx={{ mr: 1, color: "text.secondary" }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2">
                                📅{" "}
                                {new Date(event.date).toLocaleDateString(
                                  "en-US",
                                  {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}{" "}
                                • {event.time_start} - {event.time_end}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Patient: {getPatientName(event.patient_id)} •{" "}
                                {getEventTypeName(event.event_type)}
                              </Typography>
                              {event.notes && (
                                <Typography
                                  variant="caption"
                                  display="block"
                                  color="text.secondary"
                                  sx={{
                                    fontSize: "0.65rem",
                                    lineHeight: 1.3,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxWidth: 350,
                                  }}
                                  title={event.notes}
                                >
                                  📋 {event.notes}
                                </Typography>
                              )}
                            </Box>
                            {/* NEW: Proximity badge for available events */}
                            {proximityHighlights[event.id] && (
                              <Box 
                                sx={{ 
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  mr: 1
                                }}
                              >
                                <Chip
                                  label={proximityHighlights[event.id].rank}
                                  size="small"
                                  sx={{
                                    backgroundColor: proximityHighlights[event.id].color,
                                    color: "white",
                                    fontWeight: "bold",
                                    minWidth: 20,
                                    height: 18,
                                    fontSize: "0.625rem",
                                    "& .MuiChip-label": {
                                      px: 0.5,
                                    },
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: "0.55rem",
                                    color: proximityHighlights[event.id].color,
                                    fontWeight: "bold",
                                    lineHeight: 1.2,
                                  }}
                                  title={`${proximityHighlights[event.id].distance.toFixed(1)}km drive • ${proximityHighlights[event.id].duration}min travel • starts ${proximityHighlights[event.id].timeGap >= 0 ? `${proximityHighlights[event.id].timeGap}min after` : `${Math.abs(proximityHighlights[event.id].timeGap)}min before`}`}
                                >
                                  {proximityHighlights[event.id].distance.toFixed(1)}km
                                  <br />
                                  {proximityHighlights[event.id].timeGap >= 0
                                    ? `+${proximityHighlights[event.id].timeGap}′`
                                    : `${proximityHighlights[event.id].timeGap}′`}
                                </Typography>
                              </Box>
                            )}
                            <Chip
                              size="small"
                              label={
                                isPendingAssignment ? "Staged" : "Available"
                              }
                              color={
                                isPendingAssignment ? "warning" : "success"
                              }
                              variant="outlined"
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export const EnhancedTourEdit = () => (
  <Edit>
    <SimpleForm toolbar={<Box />}>
      <style>{spinnerStyles}</style>
      <EnhancedTourEditForm />
    </SimpleForm>
  </Edit>
);
