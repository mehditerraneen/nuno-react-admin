# Tour Segments API Integration Guide

This document details the tour segment calculation system and how to integrate it with the event attachment workflow in React Admin.

## Overview

When attaching events to a tour, the system automatically calculates travel segments between event locations. This provides:
- **Route optimization** with real routing service integration
- **Travel time calculations** between patient visits
- **Distance and duration statistics** for the entire tour
- **Timeline visualization** showing events and travel segments chronologically

## Available API Endpoints

### 1. Pre-Save Validation (NEW - Primary Validation Endpoint)
```http
POST /fast/tours/validate-proposed
```

**Purpose**: Validates proposed tour configuration with events before saving to database. Perfect for real-time drag-and-drop validation.

**Request Format**:
```json
{
  "events": [
    {
      "id": 123,
      "patient_id": 456,
      "patient_name": "John Doe",
      "patient_address": "123 Main St, Luxembourg",
      "time_start": "09:00",
      "time_end": "09:30",
      "duration_minutes": 30,
      "sequence": 1,
      "state": 1
    }
  ],
  "planned_start_time": "08:00",
  "planned_end_time": "17:00",
  "employee_id": 12,
  "tour_date": "2025-01-28",
  "tour_name": "Morning Route",
  "include_travel_calculation": true,
  "include_optimization_suggestions": true
}
```

**Response Format**:
```json
{
  "is_valid": true,
  "validation_errors": [],
  "warnings": [
    {
      "type": "gap",
      "severity": "warning", 
      "message": "Large gap of 15 minutes - opportunity to optimize",
      "event_ids": [123, 124],
      "suggested_fix": "Consider scheduling events closer together"
    }
  ],
  "travel_segments": [
    {
      "from_event_id": 123,
      "to_event_id": 124,
      "from_location": "123 Main St, Luxembourg",
      "to_location": "456 Oak Ave, Luxembourg",
      "estimated_duration_minutes": 12,
      "estimated_distance_km": 4.2,
      "departure_time": "09:30",
      "arrival_time": "09:42",
      "buffer_time_minutes": 18
    }
  ],
  "statistics": {
    "total_events": 2,
    "total_care_time_minutes": 75,
    "total_travel_time_minutes": 12,
    "total_tour_duration_minutes": 105,
    "total_distance_km": 4.2,
    "efficiency_score": 71.4,
    "utilization_rate": 85.2,
    "longest_gap_minutes": 15,
    "shortest_buffer_minutes": 18
  },
  "optimization_suggestions": [
    {
      "type": "timing",
      "description": "Events could be scheduled closer together",
      "impact": "low",
      "estimated_savings_minutes": 10,
      "suggested_action": "Reduce gap to 5-10 minutes"
    }
  ],
  "calculated_at": "2025-01-28T10:30:00Z"
}
```

### 2. Tour Timeline with Travel Segments
```http
GET /fast/tours/{tour_id}/timeline
```

**Purpose**: Returns complete chronological timeline with events and calculated travel segments for existing tours.

**Response Format**:
```json
{
  "timeline": [
    {
      "type": "event",
      "event_id": 123,
      "patient_name": "John Doe",
      "time_start": "09:00:00",
      "time_end": "09:30:00",
      "address": "123 Main St",
      "event_type": "CARE"
    },
    {
      "type": "travel",
      "from_location": "123 Main St",
      "to_location": "456 Oak Ave",
      "distance_km": 2.5,
      "duration_minutes": 8,
      "departure_time": "09:30:00",
      "arrival_time": "09:38:00"
    }
  ],
  "statistics": {
    "total_care_time": 180,
    "total_travel_time": 45,
    "total_distance": 12.3
  }
}
```

### 3. Travel Segments Details
```http
GET /fast/tours/{tour_id}/travel-segments
```

**Purpose**: Returns detailed travel segment information with routing data for existing tours.

**Response Format**:
```json
{
  "segments": [
    {
      "id": 1,
      "from_event_id": 123,
      "to_event_id": 124,
      "from_address": "123 Main St",
      "to_address": "456 Oak Ave",
      "distance_km": 2.5,
      "duration_minutes": 8,
      "order": 1
    }
  ],
  "statistics": {
    "total_distance": 12.3,
    "total_travel_time": 45,
    "average_segment_distance": 2.46,
    "average_segment_duration": 7.5
  }
}
```

### 4. Calculate Travel Times (For Existing Tours)
```http
POST /fast/tours/{tour_id}/calculate-travel
```

**Purpose**: Triggers real-time calculation of travel times using routing service for existing tours.

**Response Format**:
```json
{
  "success": true,
  "segments_calculated": 5,
  "total_distance": 12.3,
  "total_travel_time": 45,
  "calculation_time": "2024-01-15T10:30:00Z"
}
```

### 5. Enhanced Tour Details
```http
GET /fast/tours/{tour_id}
```

**Purpose**: Returns tour details with automatically calculated travel statistics for existing tours.

**Response Includes**:
```json
{
  "id": 123,
  "name": "Morning Route",
  "date": "2024-01-15",
  "total_distance": 12.3,
  "estimated_duration": 225,
  "travel_time": 45,
  "care_time": 180,
  "optimization_status": "optimized",
  "events": [...],
  "travel_segments": [...]
}
```

## Integration Workflow

### 1. Real-Time Drag-and-Drop Validation (NEW PRIMARY WORKFLOW)

The new pre-save validation enables real-time feedback during drag-and-drop operations without saving to database:

```typescript
// Real-time validation during drag & drop
const validateProposedTour = async (draggedEvents: Event[]) => {
  const currentFormValues = getCurrentFormValues();
  
  const requestData = {
    events: draggedEvents.map((event, index) => ({
      id: event.id,
      patient_id: event.patient_id,
      patient_name: getPatientName(event.patient_id),
      patient_address: getPatientAddress(event.patient_id),
      time_start: event.time_start,
      time_end: event.time_end,
      duration_minutes: calculateDuration(event.time_start, event.time_end),
      sequence: index + 1,
      state: event.state || 1
    })),
    planned_start_time: currentFormValues.time_start || "08:00",
    planned_end_time: currentFormValues.time_end || "17:00",
    employee_id: currentFormValues.employee_id,
    tour_date: currentFormValues.date,
    tour_name: currentFormValues.name || "Untitled Tour",
    include_travel_calculation: true,
    include_optimization_suggestions: true
  };

  try {
    const response = await dataProvider.validateProposedTour(requestData);
    
    // Update UI with real-time feedback
    setValidationErrors(response.validation_errors);
    setWarnings(response.warnings);
    setTourStats(response.statistics);
    setOptimizationSuggestions(response.optimization_suggestions);
    setTravelSegments(response.travel_segments);
    
    // Enable/disable save based on validation
    setSaveEnabled(response.is_valid);
    
    // Show efficiency metrics
    displayEfficiencyScore(response.statistics.efficiency_score);
    
    return response;
  } catch (error) {
    notify('Validation failed - check network connection', { type: 'error' });
    setSaveEnabled(false);
  }
};

// Call on every drag operation
const handleDropOnTour = async (event: React.DragEvent) => {
  event.preventDefault();
  if (!draggedEvent || !record) return;

  // Update local state for immediate UI feedback
  const updatedEvents = [...assignedEventsForTour, draggedEvent];
  setAssignedEvents(updatedEvents);

  // Validate proposed configuration
  await validateProposedTour(updatedEvents);
  
  // Track pending changes
  setPendingChanges(prev => ({
    toAssign: [...prev.toAssign, draggedEvent.id],
    toRemove: prev.toRemove
  }));

  notify('Event added - review validation feedback before saving', { type: 'info' });
};

// Call when events are reordered
const handleEventReorder = async (reorderedEvents: Event[]) => {
  setAssignedEvents(reorderedEvents);
  await validateProposedTour(reorderedEvents);
};
```

### 2. Enhanced Event Attachment Process

When finally committing changes to the database:

```typescript
const handleSaveChanges = async () => {
  if (!record || (pendingChanges.toAssign.length === 0 && pendingChanges.toRemove.length === 0)) {
    return;
  }

  // Final validation before save
  const finalValidation = await validateProposedTour(assignedEventsForTour);
  
  if (!finalValidation.is_valid) {
    notify('Cannot save tour with validation errors', { type: 'error' });
    return;
  }

  setIsSaving(true);
  
  try {
    // 1. Update events with tour assignments
    for (const eventId of pendingChanges.toAssign) {
      const event = availableEvents.find(e => e.id === eventId);
      if (event) {
        await dataProvider.update('events', {
          id: eventId,
          data: { ...event, tour_id: record.id },
          previousData: event,
        });
      }
    }

    // 2. Process removals
    for (const eventId of pendingChanges.toRemove) {
      const event = availableEvents.find(e => e.id === eventId);
      if (event) {
        await dataProvider.update('events', {
          id: eventId,
          data: { ...event, tour_id: null },
          previousData: event,
        });
      }
    }

    // 3. Save tour metadata with final statistics
    await dataProvider.update('tours', {
      id: record.id,
      data: {
        ...record,
        total_distance: finalValidation.statistics.total_distance_km,
        estimated_duration: finalValidation.statistics.total_tour_duration_minutes,
        efficiency_score: finalValidation.statistics.efficiency_score,
        optimization_status: 'pending_optimization'
      }
    });

    // 4. Clear pending changes
    setPendingChanges({ toAssign: [], toRemove: [] });
    
    // 5. Refresh data
    refresh();
    
    notify(`Tour saved successfully! Efficiency: ${finalValidation.statistics.efficiency_score}%`, { 
      type: 'success' 
    });
    
  } catch (error) {
    notify('Failed to save changes', { type: 'error' });
  } finally {
    setIsSaving(false);
  }
};
```

### 3. Data Provider Extensions

Add these methods to your `MyDataProvider` interface:

```typescript
export interface MyDataProvider extends DataProvider {
  // Existing methods...
  
  // NEW: Pre-save validation method
  validateProposedTour: (proposedData: ProposedTourData) => Promise<TourValidationResponse>;
  
  // Existing tour segment methods
  getTourTimeline: (tourId: number) => Promise<{ timeline: any[], statistics: any }>;
  getTourTravelSegments: (tourId: number) => Promise<{ segments: any[], statistics: any }>;
  calculateTourTravel: (tourId: number) => Promise<{ success: boolean, segments_calculated: number }>;
}

// Type definitions for validation
interface ProposedTourData {
  events: ProposedEvent[];
  planned_start_time: string;
  planned_end_time: string;
  employee_id: number;
  tour_date: string;
  tour_name?: string;
  include_travel_calculation: boolean;
  include_optimization_suggestions: boolean;
}

interface ProposedEvent {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_address: string;
  time_start: string;
  time_end: string;
  duration_minutes: number;
  sequence: number;
  state: number;
}

interface TourValidationResponse {
  is_valid: boolean;
  validation_errors: ValidationError[];
  warnings: ValidationWarning[];
  travel_segments: TravelSegment[];
  statistics: TourStatistics;
  optimization_suggestions: OptimizationSuggestion[];
  calculated_at: string;
}
```

### 4. Implementation in dataProvider.ts

```typescript
// Add to dataProvider object

// NEW: Pre-save validation method
validateProposedTour: async (proposedData: ProposedTourData) => {
  const url = `${apiUrl}/tours/validate-proposed`;
  const response = await httpClient(url, {
    method: 'POST',
    body: JSON.stringify(proposedData),
  });
  if (!response.ok) {
    throw new Error('Failed to validate proposed tour');
  }
  return response.json();
},

// Existing methods for saved tours
getTourTimeline: async (tourId: number) => {
  const url = `${apiUrl}/tours/${tourId}/timeline`;
  const response = await httpClient(url);
  if (!response.ok) {
    throw new Error('Failed to fetch tour timeline');
  }
  return response.json();
},

getTourTravelSegments: async (tourId: number) => {
  const url = `${apiUrl}/tours/${tourId}/travel-segments`;
  const response = await httpClient(url);
  if (!response.ok) {
    throw new Error('Failed to fetch travel segments');
  }
  return response.json();
},

calculateTourTravel: async (tourId: number) => {
  const url = `${apiUrl}/tours/${tourId}/calculate-travel`;
  const response = await httpClient(url, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to calculate travel times');
  }
  return response.json();
},
```

## Real-Time Validation UI Components

### 1. Validation Feedback Display

Add validation state management and UI components to `EnhancedTourEdit.tsx`:

```typescript
// Add to component state
const [validationState, setValidationState] = useState<{
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  statistics: TourStatistics | null;
  optimizationSuggestions: OptimizationSuggestion[];
}>({
  isValid: true,
  errors: [],
  warnings: [],
  statistics: null,
  optimizationSuggestions: []
});

const [isValidating, setIsValidating] = useState(false);

// Debounced validation to avoid excessive API calls
const debouncedValidate = useCallback(
  debounce(async (events: Event[]) => {
    if (events.length === 0) {
      setValidationState({
        isValid: true,
        errors: [],
        warnings: [],
        statistics: null,
        optimizationSuggestions: []
      });
      return;
    }

    setIsValidating(true);
    try {
      const response = await validateProposedTour(events);
      setValidationState({
        isValid: response.is_valid,
        errors: response.validation_errors,
        warnings: response.warnings,
        statistics: response.statistics,
        optimizationSuggestions: response.optimization_suggestions
      });
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  }, 500),
  [record]
);

// Call validation when events change
useEffect(() => {
  if (assignedEventsForTour.length > 0) {
    debouncedValidate(assignedEventsForTour);
  }
}, [assignedEventsForTour, debouncedValidate]);
```

### 2. Validation Status Panel

Add a validation status panel to display real-time feedback:

```typescript
const ValidationStatusPanel = () => (
  <Card sx={{ mb: 2 }}>
    <CardHeader 
      title="Tour Validation"
      avatar={
        isValidating ? (
          <CircularProgress size={20} />
        ) : validationState.isValid ? (
          <CheckCircle color="success" />
        ) : (
          <Error color="error" />
        )
      }
    />
    <CardContent>
      {/* Validation Errors */}
      {validationState.errors.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {validationState.errors.map((error, index) => (
            <Alert key={index} severity="error" sx={{ mb: 1 }}>
              <Typography variant="body2">{error.message}</Typography>
              {error.suggested_fix && (
                <Typography variant="caption" display="block">
                  💡 {error.suggested_fix}
                </Typography>
              )}
            </Alert>
          ))}
        </Box>
      )}

      {/* Warnings */}
      {validationState.warnings.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {validationState.warnings.map((warning, index) => (
            <Alert key={index} severity="warning" sx={{ mb: 1 }}>
              <Typography variant="body2">{warning.message}</Typography>
              {warning.suggested_fix && (
                <Typography variant="caption" display="block">
                  💡 {warning.suggested_fix}
                </Typography>
              )}
            </Alert>
          ))}
        </Box>
      )}

      {/* Statistics Display */}
      {validationState.statistics && (
        <Box>
          <Typography variant="h6" gutterBottom>Live Tour Statistics</Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Chip
                icon={<Schedule />}
                label={`${validationState.statistics.total_events} Events`}
                color="primary"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <Chip
                icon={<RouteIcon />}
                label={`${validationState.statistics.total_distance_km?.toFixed(1)} km`}
                color="secondary"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <Chip
                icon={<AccessTime />}
                label={`Care: ${validationState.statistics.total_care_time_minutes}min`}
                color="success"
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <Chip
                icon={<DirectionsCar />}
                label={`Travel: ${validationState.statistics.total_travel_time_minutes}min`}
                color="info"
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <LinearProgress
                variant="determinate"
                value={validationState.statistics.efficiency_score || 0}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" align="center" display="block">
                Efficiency: {validationState.statistics.efficiency_score?.toFixed(1)}%
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Optimization Suggestions */}
      {validationState.optimizationSuggestions.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>💡 Optimization Tips</Typography>
          {validationState.optimizationSuggestions.map((suggestion, index) => (
            <Alert key={index} severity="info" sx={{ mb: 1 }}>
              <Typography variant="body2">{suggestion.description}</Typography>
              <Typography variant="caption" display="block">
                Impact: {suggestion.impact} • Savings: {suggestion.estimated_savings_minutes}min
              </Typography>
              <Typography variant="caption" display="block">
                👉 {suggestion.suggested_action}
              </Typography>
            </Alert>
          ))}
        </Box>
      )}
    </CardContent>
  </Card>
);
```

### 3. Enhanced Save Button with Validation

Update the save button to reflect validation status:

```typescript
const SaveChangesButton = () => {
  const hasChanges = pendingChanges.toAssign.length > 0 || pendingChanges.toRemove.length > 0;
  const canSave = hasChanges && validationState.isValid && !isValidating;
  
  return (
    <Button
      variant="contained"
      color={validationState.isValid ? "success" : "error"}
      onClick={handleSaveChanges}
      disabled={!canSave || isSaving}
      startIcon={
        isSaving ? (
          <CircularProgress size={16} />
        ) : validationState.isValid ? (
          <CheckCircle />
        ) : (
          <Error />
        )
      }
      sx={{ flex: 1 }}
    >
      {isSaving ? (
        'Saving...'
      ) : !validationState.isValid ? (
        'Fix Errors to Save'
      ) : (
        `Save Changes (${pendingChanges.toAssign.length + pendingChanges.toRemove.length})`
      )}
    </Button>
  );
};
```

### 4. Event List with Validation Indicators

Update event list items to show validation-specific indicators:

```typescript
const EventListItem = ({ event, hasTimeConflict, isPendingAssignment, isPendingRemoval }) => {
  // Check if this specific event has validation issues
  const eventErrors = validationState.errors.filter(error => 
    error.event_ids?.includes(event.id)
  );
  const eventWarnings = validationState.warnings.filter(warning => 
    warning.event_ids?.includes(event.id)
  );

  return (
    <ListItem
      sx={{
        mb: 1,
        backgroundColor: getEventBackgroundColor(event, eventErrors, eventWarnings),
        borderRadius: 1,
        border: `2px solid ${getEventBorderColor(event, eventErrors, eventWarnings)}`,
      }}
    >
      {/* Event content */}
      <Box sx={{ flex: 1 }}>
        {/* Event time and patient info */}
        
        {/* Validation indicators */}
        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
          {eventErrors.map((error, index) => (
            <Chip
              key={`error-${index}`}
              size="small"
              label={error.type}
              color="error"
              icon={<Error />}
              sx={{ fontSize: '0.625rem', height: 16 }}
            />
          ))}
          {eventWarnings.map((warning, index) => (
            <Chip
              key={`warning-${index}`}
              size="small"
              label={warning.type}
              color="warning"
              icon={<Warning />}
              sx={{ fontSize: '0.625rem', height: 16 }}
            />
          ))}
        </Box>
      </Box>
    </ListItem>
  );
};

const getEventBackgroundColor = (event, errors, warnings) => {
  if (errors.length > 0) return '#ffebee';
  if (warnings.length > 0) return '#fff3e0';
  return 'white';
};

const getEventBorderColor = (event, errors, warnings) => {
  if (errors.length > 0) return '#f44336';
  if (warnings.length > 0) return '#ff9800';
  return '#e0e0e0';
};
```

## Enhanced Tour Edit Integration

### Automatic Real-Time Validation

The `EnhancedTourEdit` component now includes real-time validation throughout the drag-and-drop workflow:

```typescript
const handleSaveChanges = async () => {
  if (!record || (pendingChanges.toAssign.length === 0 && pendingChanges.toRemove.length === 0)) {
    return;
  }

  setIsSaving(true);
  
  try {
    // Process event assignments/removals
    // ... existing code ...

    // Calculate travel segments after event changes
    if (pendingChanges.toAssign.length > 0 || pendingChanges.toRemove.length > 0) {
      notify('Calculating travel segments...', { type: 'info' });
      
      try {
        const travelResult = await (dataProvider as any).calculateTourTravel(record.id);
        notify(`Travel calculation complete: ${travelResult.segments_calculated} segments calculated`, { 
          type: 'success' 
        });
      } catch (error) {
        notify('Travel calculation failed - segments may be outdated', { type: 'warning' });
      }
    }

    // Clear pending changes and refresh
    setPendingChanges({ toAssign: [], toRemove: [] });
    refresh();
    
  } catch (error) {
    notify('Failed to save changes', { type: 'error' });
  } finally {
    setIsSaving(false);
  }
};
```

### Display Travel Statistics

Add travel statistics display to the tour details section:

```typescript
// In EnhancedTourEditForm component
const [travelStats, setTravelStats] = useState<any>(null);

// Load travel statistics
const loadTravelStats = async () => {
  if (!record?.id) return;
  
  try {
    const segments = await (dataProvider as any).getTourTravelSegments(record.id);
    setTravelStats(segments.statistics);
  } catch (error) {
    console.error('Failed to load travel stats:', error);
  }
};

// Call in useEffect
useEffect(() => {
  if (record) {
    // ... existing code ...
    loadTravelStats();
  }
}, [record]);

// Add to JSX in tour statistics section
<Box>
  <Typography variant="h6" gutterBottom>
    Tour Statistics
  </Typography>
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    <Chip
      icon={<Schedule />}
      label={`${assignedEventsForTour.length} Events`}
      color="primary"
    />
    <Chip
      icon={<RouteIcon />}
      label={`${record.total_distance || travelStats?.total_distance || 0} km`}
      color="secondary"
    />
    <Chip
      icon={<AccessTime />}
      label={`Travel: ${travelStats?.total_travel_time || 0}min`}
      color="info"
    />
    <Chip
      icon={<Coffee />}
      label={`Care: ${travelStats?.total_care_time || 0}min`}
      color="success"
    />
  </Box>
</Box>
```

## Timeline Visualization Component

Create a timeline component to show events and travel segments:

```typescript
// components/tours/TourTimeline.tsx
import React, { useState, useEffect } from 'react';
import { useDataProvider } from 'react-admin';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot } from '@mui/lab';
import { Schedule, DirectionsCar, Person } from '@mui/icons-material';

interface TourTimelineProps {
  tourId: number;
}

export const TourTimeline: React.FC<TourTimelineProps> = ({ tourId }) => {
  const [timeline, setTimeline] = useState<any[]>([]);
  const dataProvider = useDataProvider();

  useEffect(() => {
    const loadTimeline = async () => {
      try {
        const result = await (dataProvider as any).getTourTimeline(tourId);
        setTimeline(result.timeline);
      } catch (error) {
        console.error('Failed to load timeline:', error);
      }
    };

    loadTimeline();
  }, [tourId]);

  return (
    <Timeline>
      {timeline.map((item, index) => (
        <TimelineItem key={index}>
          <TimelineSeparator>
            <TimelineDot color={item.type === 'event' ? 'primary' : 'secondary'}>
              {item.type === 'event' ? <Person /> : <DirectionsCar />}
            </TimelineDot>
            {index < timeline.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent>
            {item.type === 'event' ? (
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  {item.patient_name}
                </Typography>
                <Typography variant="caption">
                  {item.time_start} - {item.time_end} • {item.event_type}
                </Typography>
                <Typography variant="caption" display="block">
                  📍 {item.address}
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  🚗 Travel: {item.duration_minutes}min ({item.distance_km}km)
                </Typography>
                <Typography variant="caption">
                  {item.departure_time} → {item.arrival_time}
                </Typography>
              </Box>
            )}
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
};
```

## Route Optimization Integration

### Manual Route Optimization

Update the `handleOptimizeRoute` function:

```typescript
const handleOptimizeRoute = async () => {
  if (!record) return;

  try {
    notify('Optimizing route...', { type: 'info' });
    
    // Call optimization endpoint
    await (dataProvider as any).optimizeTour(record.id);
    
    // Recalculate travel segments with optimized order
    const travelResult = await (dataProvider as any).calculateTourTravel(record.id);
    
    notify(`Route optimized! ${travelResult.segments_calculated} segments recalculated`, { 
      type: 'success' 
    });
    
    // Refresh data
    refresh();
    loadTravelStats();
    
  } catch (error) {
    notify('Route optimization failed', { type: 'error' });
  }
};
```

### Automatic Calculation Triggers

Travel segments are automatically calculated when:
1. Events are assigned to or removed from a tour
2. Event addresses are updated
3. Tour is optimized
4. Tour details are accessed (lazy calculation)

## Error Handling

Handle common tour segment calculation errors:

```typescript
// Wrap travel calculations in try-catch
try {
  await dataProvider.calculateTourTravel(tourId);
} catch (error) {
  if (error.message.includes('routing service')) {
    notify('Routing service unavailable - using estimated travel times', { type: 'warning' });
  } else if (error.message.includes('missing addresses')) {
    notify('Some events missing addresses - travel calculation incomplete', { type: 'warning' });
  } else {
    notify('Travel calculation failed', { type: 'error' });
  }
}
```

## Best Practices

1. **Always calculate travel after event changes** to ensure accurate statistics
2. **Cache travel statistics** to avoid unnecessary API calls
3. **Provide user feedback** during calculation processes
4. **Handle routing service failures** gracefully with fallbacks
5. **Update timeline visualizations** after any tour modifications
6. **Consider performance** for tours with many events (>20)

## Performance Considerations

- Travel calculations may take 2-5 seconds for tours with multiple events
- Consider background processing for large tours
- Cache results and only recalculate when necessary
- Provide loading indicators during calculation
- Implement retry logic for routing service failures