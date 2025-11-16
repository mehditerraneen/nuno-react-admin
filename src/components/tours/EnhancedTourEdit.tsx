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
} from "@mui/icons-material";
import { Tour, Event } from "../../types/tours";
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
  distance_km: number;
  duration_minutes: number;
  from_location: string;
  to_location: string;
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
      color: string;
    }
  }>({});
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [lastDroppedEventId, setLastDroppedEventId] = useState<number | null>(null);

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
      loadAvailableEvents();
      setAssignedEvents(record.events || []);

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

  const refreshEventsWithCurrentForm = () => {
    // Just reload with the form's current date - loadAvailableEvents will handle time filtering
    const formValues = getCurrentFormValues();

    // Alternative: Try to get values from DOM if form context fails
    if (!formValues.date || formValues.date === record?.date) {
      try {
        const dateInput = document.querySelector(
          'input[name="date"]',
        ) as HTMLInputElement;
        const domDate = dateInput?.value || record?.date;
        loadAvailableEvents(domDate);

        // Update original values and clear refresh flag
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

    loadAvailableEvents(formValues.date);

    // Update original values and clear refresh flag
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
    return travelSegment?.duration_minutes || 15; // Default 15 minutes if no data available
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
  const removeFreeBetweenEvents = (
    currentEventId: number,
    nextEventId: number,
  ) => {
    const currentEvent = availableEvents.find((e) => e.id === currentEventId);
    const nextEvent = availableEvents.find((e) => e.id === nextEventId);

    if (!currentEvent || !nextEvent) return;

    const currentEffective = getEffectiveEventTimes(currentEvent);
    const travelDuration = getTravelDurationBetweenEvents(
      currentEventId,
      nextEventId,
    );

    // Calculate new start time for next event (end of current + travel time)
    const newNextStartMinutes =
      timeToMinutes(currentEffective.time_end) + travelDuration;
    const newNextStartTime = minutesToTime(newNextStartMinutes);

    // Apply local adjustment to next event
    applyLocalTimeAdjustment(nextEventId, newNextStartTime);

    notify(`Removed free time. Next event moved to ${newNextStartTime}`, {
      type: "info",
    });
  };

  // Generate timeline items with events, travel segments, and empty gaps
  // Function to detect overlapping events
  const detectOverlaps = (events: any[]) => {
    const overlaps: any[] = [];
    const sortedEvents = [...events].sort((a, b) =>
      a.time_start.localeCompare(b.time_start),
    );

    for (let i = 0; i < sortedEvents.length; i++) {
      for (let j = i + 1; j < sortedEvents.length; j++) {
        const event1 = sortedEvents[i];
        const event2 = sortedEvents[j];

        const event1Start = timeToMinutes(event1.time_start);
        const event1End = timeToMinutes(event1.time_end);
        const event2Start = timeToMinutes(event2.time_start);
        const event2End = timeToMinutes(event2.time_end);

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

      // Add empty time segment if there's a gap
      if (currentTime < eventStartMinutes) {
        const nextEvent =
          index < sortedEvents.length - 1 ? sortedEvents[index] : null;
        timelineItems.push({
          type: "empty",
          startTime: minutesToTime(currentTime),
          endTime: effectiveTimes.time_start,
          duration: eventStartMinutes - currentTime,
          canRemove: nextEvent ? true : false,
          currentEventId: index > 0 ? sortedEvents[index - 1].id : null,
          nextEventId: event.id,
        });
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

  // NEW: Calculate and display proximity highlights for available events
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

    try {
      const response = await dataProvider.calculateEventProximity({
        source_event_id: sourceEvent.id,
        target_event_ids: unassignedEvents.map(e => e.id),
      });

      // Create highlights with numbered badges and colors
      const highlights: { [eventId: number]: { rank: number; distance: number; duration: number; color: string } } = {};
      const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336'];
      
      response.closest_events
        .slice(0, 5) // Top 5 closest events
        .forEach((event, index) => {
          highlights[event.event_id] = {
            rank: event.rank,
            distance: event.distance_km,
            duration: event.duration_minutes,
            color: colors[index] || '#757575'
          };
        });

      setProximityHighlights(highlights);
      console.log('📍 Proximity highlights updated:', highlights);
      console.log(`⚡ Performance: ${response.cache_hits}/${response.total_calculated} from cache (${Math.round(response.cache_hits / response.total_calculated * 100)}% cache hit rate)`);
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
      // Process time changes first
      for (const [eventIdStr, timeChange] of Object.entries(
        pendingTimeChanges,
      )) {
        const eventId = parseInt(eventIdStr);
        const event = availableEvents.find((e) => e.id === eventId);
        if (event) {
          await dataProvider.update("events", {
            id: eventId,
            data: {
              ...event,
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
        if (event) {
          const effectiveTimes = getEffectiveEventTimes(event);
          await dataProvider.update("events", {
            id: eventId,
            data: {
              ...event,
              tour_id: record.id,
              time_start: effectiveTimes.time_start,
              time_end: effectiveTimes.time_end,
            },
            previousData: event,
          });
        }
      }

      // Process removals
      for (const eventId of pendingChanges.toRemove) {
        const event = availableEvents.find((e) => e.id === eventId);
        if (event) {
          const effectiveTimes = getEffectiveEventTimes(event);
          await dataProvider.update("events", {
            id: eventId,
            data: {
              ...event,
              tour_id: null,
              time_start: effectiveTimes.time_start,
              time_end: effectiveTimes.time_end,
            },
            previousData: event,
          });
        }
      }

      // Update tour metadata with validation statistics if available
      if (validationState.statistics) {
        await dataProvider.update("tours", {
          id: record.id,
          data: {
            ...record,
            total_distance: validationState.statistics.total_distance_km,
            estimated_duration:
              validationState.statistics.total_tour_duration_minutes,
          },
          previousData: record,
        });
      }

      // Clear pending changes and proximity highlights
      const totalChanges =
        pendingChanges.toAssign.length +
        pendingChanges.toRemove.length +
        Object.keys(pendingTimeChanges).length;
      setPendingChanges({ toAssign: [], toRemove: [] });
      setPendingTimeChanges({});
      setProximityHighlights({});
      setLastDroppedEventId(null);

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
  const unassignedEvents = availableEvents.filter(
    (e) => e.is_available && !e.assigned_to_tour && e.event_type !== "BIRTHDAY",
  );
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
                              : record.total_distance
                                ? `${record.total_distance} km`
                                : "Distance TBD"
                          }
                          color="secondary"
                          size="small"
                        />
                        <Chip
                          icon={<AccessTime />}
                          label={
                            validationState.statistics?.total_care_time_minutes
                              ? `${validationState.statistics.total_care_time_minutes}min`
                              : record.estimated_duration
                                ? `${Math.floor(record.estimated_duration / 60)}h ${record.estimated_duration % 60}m`
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
                                        : "grey.400",
                                  color: "white",
                                  border:
                                    item.type === "empty"
                                      ? "2px solid"
                                      : item.isOverlapping
                                        ? "3px solid"
                                        : "none",
                                  borderColor:
                                    item.type === "empty"
                                      ? "grey.400"
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
                                      onClick={() =>
                                        handleRemoveFromTour(item.event)
                                      }
                                      color="error"
                                      sx={{ ml: "auto", width: 24, height: 24 }}
                                    >
                                      <RemoveIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {item.startTime} - {item.endTime} •{" "}
                                    {getEventTypeName(item.event.event_type)}
                                  </Typography>
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
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    🚗 Travel: {item.fromLocation} →{" "}
                                    {item.toLocation}
                                  </Typography>
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
                                      // Find the travel segment for distance info
                                      const segment =
                                        validationState.travelSegments.find(
                                          (s) =>
                                            s.from_location.includes(
                                              item.fromLocation.split(" ")[0],
                                            ) ||
                                            s.to_location.includes(
                                              item.toLocation.split(" ")[0],
                                            ),
                                        );
                                      return segment
                                        ? ` • ${segment.distance_km.toFixed(1)}km`
                                        : "";
                                    })()}
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
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          color="warning"
                                          onClick={() =>
                                            removeFreeBetweenEvents(
                                              item.currentEventId,
                                              item.nextEventId,
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
                                          Remove Gap
                                        </Button>
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
                                      💡 Click "Remove Gap" to move next event
                                      earlier
                                    </Typography>
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
            </Grid>

            {/* Available Events */}
            <Grid xs={12} md={6}>
              <Card>
                <CardHeader
                  title={`Available Events (${unassignedEvents.length})`}
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
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Events for {currentFormValues.date} that can be assigned
                      to tours
                    </Typography>
                    {!needsRefresh && (
                      <Typography variant="caption" color="text.secondary">
                        💡 After changing tour date/times, click "Update Events
                        List" button in Tour Details to refresh
                      </Typography>
                    )}
                  </Box>

                  {unassignedEvents.length === 0 ? (
                    <Alert severity="warning">
                      No available events for this date. Create new events or
                      check other dates.
                    </Alert>
                  ) : (
                    <List dense sx={{ maxHeight: 400, overflow: "auto" }}>
                      {unassignedEvents.map((event) => {
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
                              {event.event_address && (
                                <Typography
                                  variant="caption"
                                  display="block"
                                  color="text.secondary"
                                >
                                  📍 {event.event_address}
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
                                    fontSize: "0.5rem",
                                    color: proximityHighlights[event.id].color,
                                    fontWeight: "bold",
                                  }}
                                  title={`${proximityHighlights[event.id].distance.toFixed(1)} km • ${proximityHighlights[event.id].duration} min from ${lastDroppedEventId ? getPatientName(availableEvents.find(e => e.id === lastDroppedEventId)?.patient_id || 0) : 'tour'}`}
                                >
                                  📍
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
