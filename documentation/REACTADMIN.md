# React Admin Integration Guide

This document provides essential documentation for working with React Admin and Material-UI v7 in this project. It serves as a reference for Claude Code to help with implementation and troubleshooting.

## Table of Contents
- [React Admin Core Concepts](#react-admin-core-concepts)
- [Authentication Implementation](#authentication-implementation)
- [Data Provider Configuration](#data-provider-configuration)
- [Material-UI v7 Integration](#material-ui-v7-integration)
- [Form Handling](#form-handling)
- [Tour Segments & Travel Calculation](#tour-segments--travel-calculation)
- [TypeScript Integration](#typescript-integration)

## React Admin Core Concepts

### Authentication Flow

React Admin uses an `authProvider` pattern for handling authentication. Our implementation follows JWT token-based authentication:

```typescript
// authProvider structure
const authProvider: AuthProvider = {
  login: async (params) => { /* handles login */ },
  logout: () => { /* clears tokens */ },
  checkAuth: () => { /* verifies authentication */ },
  checkError: ({ status }) => { /* handles auth errors */ },
  getPermissions: () => { /* returns user permissions */ },
  getIdentity: () => { /* returns user info */ },
  canAccess: async (params) => { /* checks access rights */ }
};
```

### Data Provider Pattern

The data provider handles all API communication and must include authentication headers:

```typescript
// HTTP client with authentication
const httpClient = (url, options = {}) => {
  const token = authService.getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: token })
  };
  return fetch(url, { ...options, headers });
};

// Data provider extends simpleRestProvider
const dataProvider = simpleRestProvider(apiUrl, httpClient);
```

### Protected Routes

For custom routes that require authentication:

```tsx
<Admin authProvider={authProvider} requireAuth>
  <CustomRoutes>
    <Route path="/settings" element={
      <Authenticated>
        <Settings />
      </Authenticated>
    } />
  </CustomRoutes>
</Admin>
```

## Authentication Implementation

### Token Management Best Practices

1. **Automatic Token Refresh**: Implement refresh logic 5 minutes before expiry
2. **Error Handling**: `checkError` should catch 401/403 and logout
3. **Storage**: Use localStorage for tokens (as implemented)

### Access Control

Use `canAccess` for fine-grained permissions:

```typescript
authProvider.canAccess = async ({ action, resource, record }) => {
  // Check permissions based on action and resource
  const permissions = localStorage.getItem('permissions');
  return permissions?.includes(`${action}_${resource}`);
};
```

## Data Provider Configuration

### Response Format Requirements

React Admin expects responses in this format:
```typescript
{
  data: [...],    // Array of records
  total: number   // Total count for pagination
}
```

### FastAPI Integration

For FastAPI endpoints that return `{items: [...], total: N}`:

```typescript
// Transform FastAPI response to React Admin format
if (data.items && Array.isArray(data.items)) {
  return {
    data: data.items,
    total: data.total
  };
}
```

### Custom Methods

Add custom methods to the data provider:

```typescript
export interface MyDataProvider extends DataProvider {
  customMethod: (params: any) => Promise<any>;
}

dataProvider.customMethod = async (params) => {
  const url = `${apiUrl}/custom-endpoint`;
  const response = await httpClient(url, {
    method: 'POST',
    body: JSON.stringify(params)
  });
  return response.json();
};
```

## Material-UI v7 Integration

### Theme Configuration

```typescript
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' }
  },
  components: {
    // Component overrides
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none' }
      }
    }
  }
});
```

### TypeScript Module Augmentation

For custom theme properties:

```typescript
declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      myProperty: string;
    };
  }
  interface ThemeOptions {
    custom?: {
      myProperty?: string;
    };
  }
}
```

### Component Styling

Use `styled` for custom components:

```typescript
import { styled } from '@mui/material/styles';

const CustomComponent = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(4)
  }
}));
```

## Form Handling

### React Admin Forms

React Admin provides several form components with built-in validation:

```tsx
<SimpleForm>
  <TextInput source="name" validate={required()} />
  <NumberInput source="age" validate={[required(), minValue(18)]} />
  <DateInput source="birthday" />
  <ReferenceInput source="category_id" reference="categories">
    <SelectInput optionText="name" />
  </ReferenceInput>
</SimpleForm>
```

### Custom Form Submission

Override default save behavior:

```tsx
const MyForm = () => {
  const [create] = useCreate();
  
  const handleSubmit = async (data) => {
    // Custom processing
    const processedData = transformData(data);
    await create('resource', { data: processedData });
  };
  
  return (
    <Form onSubmit={handleSubmit}>
      {/* form fields */}
    </Form>
  );
};
```

### Sanitizing Empty Values

To remove empty strings from form data:

```tsx
<SimpleForm sanitizeEmptyValues>
  {/* form fields */}
</SimpleForm>
```

## Tour Segments & Travel Calculation

The tours system includes automatic travel segment calculation when events are attached to tours. This provides route optimization and travel statistics with **real-time pre-save validation**.

### Key API Endpoints

1. **🆕 Pre-Save Validation**: `POST /fast/tours/validate-proposed` - **Primary endpoint** for real-time drag-and-drop validation
2. **Tour Timeline**: `GET /fast/tours/{tour_id}/timeline` - Complete chronological view with events and travel segments
3. **Travel Segments**: `GET /fast/tours/{tour_id}/travel-segments` - Detailed routing information and statistics  
4. **Calculate Travel**: `POST /fast/tours/{tour_id}/calculate-travel` - Trigger real-time travel calculation
5. **Enhanced Tour Details**: `GET /fast/tours/{tour_id}` - Tour data with auto-calculated travel statistics

### Data Provider Methods

Add these methods to your `MyDataProvider` interface:

```typescript
export interface MyDataProvider extends DataProvider {
  // 🆕 Pre-save validation method (PRIMARY)
  validateProposedTour: (proposedData: ProposedTourData) => Promise<TourValidationResponse>;
  
  // Existing tour segment methods
  getTourTimeline: (tourId: number) => Promise<{ timeline: any[], statistics: any }>;
  getTourTravelSegments: (tourId: number) => Promise<{ segments: any[], statistics: any }>;
  calculateTourTravel: (tourId: number) => Promise<{ success: boolean, segments_calculated: number }>;
}

// Key type definitions
interface ProposedTourData {
  events: Array<{
    id: number;
    patient_id: number;
    patient_name: string;
    patient_address: string;
    time_start: string;
    time_end: string;
    duration_minutes: number;
    sequence: number;
    state: number;
  }>;
  planned_start_time: string;
  planned_end_time: string;
  employee_id: number;
  tour_date: string;
  tour_name?: string;
  include_travel_calculation: boolean;
  include_optimization_suggestions: boolean;
}

interface TourValidationResponse {
  is_valid: boolean;
  validation_errors: ValidationError[];
  warnings: ValidationWarning[];
  travel_segments: TravelSegment[];
  statistics: {
    total_events: number;
    total_care_time_minutes: number;
    total_travel_time_minutes: number;
    total_tour_duration_minutes: number;
    total_distance_km: number;
    efficiency_score: number;
    utilization_rate: number;
    longest_gap_minutes: number;
    shortest_buffer_minutes: number;
  };
  optimization_suggestions: OptimizationSuggestion[];
  calculated_at: string;
}
```

### Real-Time Validation Pattern (NEW PRIMARY WORKFLOW)

The new pre-save validation enables real-time feedback during drag-and-drop:

```typescript
// Real-time validation during drag operations
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
    
    // Enable/disable save based on validation
    setSaveEnabled(response.is_valid);
    
    return response;
  } catch (error) {
    notify('Validation failed - check network connection', { type: 'error' });
    setSaveEnabled(false);
  }
};

// Call on every drag operation
const handleDropOnTour = async (event: React.DragEvent) => {
  // Update local state immediately
  const updatedEvents = [...assignedEventsForTour, draggedEvent];
  setAssignedEvents(updatedEvents);

  // Validate proposed configuration
  await validateProposedTour(updatedEvents);
  
  notify('Event added - review validation feedback before saving', { type: 'info' });
};

// Enhanced save with final validation
const handleSaveChanges = async () => {
  // Final validation before save
  const finalValidation = await validateProposedTour(assignedEventsForTour);
  
  if (!finalValidation.is_valid) {
    notify('Cannot save tour with validation errors', { type: 'error' });
    return;
  }

  // Proceed with database updates...
  // 1. Update events with tour assignments
  // 2. Save tour metadata with statistics
  // 3. Refresh data
};
```

### Real-Time Statistics Display

Display live validation feedback and statistics:

```typescript
// Validation state management
const [validationState, setValidationState] = useState({
  isValid: true,
  errors: [],
  warnings: [],
  statistics: null,
  optimizationSuggestions: []
});

// Real-time statistics display
<Box>
  <Typography variant="h6" gutterBottom>Live Tour Statistics</Typography>
  <Grid container spacing={1}>
    <Grid item xs={6}>
      <Chip
        icon={<Schedule />}
        label={`${validationState.statistics?.total_events || 0} Events`}
        color="primary"
      />
    </Grid>
    <Grid item xs={6}>
      <Chip
        icon={<RouteIcon />}
        label={`${validationState.statistics?.total_distance_km?.toFixed(1) || 0} km`}
        color="secondary"
      />
    </Grid>
    <Grid item xs={12}>
      <LinearProgress
        variant="determinate"
        value={validationState.statistics?.efficiency_score || 0}
      />
      <Typography variant="caption" align="center" display="block">
        Efficiency: {validationState.statistics?.efficiency_score?.toFixed(1) || 0}%
      </Typography>
    </Grid>
  </Grid>

  {/* Validation errors and warnings */}
  {validationState.errors.map((error, index) => (
    <Alert key={index} severity="error" sx={{ mb: 1 }}>
      {error.message}
      {error.suggested_fix && (
        <Typography variant="caption" display="block">
          💡 {error.suggested_fix}
        </Typography>
      )}
    </Alert>
  ))}

  {/* Optimization suggestions */}
  {validationState.optimizationSuggestions.map((suggestion, index) => (
    <Alert key={index} severity="info" sx={{ mb: 1 }}>
      {suggestion.description}
      <Typography variant="caption" display="block">
        👉 {suggestion.suggested_action}
      </Typography>
    </Alert>
  ))}
</Box>
```

### Route Optimization

Integrate route optimization with travel calculation:

```typescript
const handleOptimizeRoute = async () => {
  try {
    notify('Optimizing route...', { type: 'info' });
    
    // Optimize event order
    await dataProvider.optimizeTour(record.id);
    
    // Recalculate travel segments
    await dataProvider.calculateTourTravel(record.id);
    
    notify('Route optimized successfully', { type: 'success' });
    refresh();
  } catch (error) {
    notify('Route optimization failed', { type: 'error' });
  }
};
```

### Enhanced Save Button with Validation

Prevent saves when validation fails:

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
      startIcon={validationState.isValid ? <CheckCircle /> : <Error />}
    >
      {!validationState.isValid ? (
        'Fix Errors to Save'
      ) : (
        `Save Changes (${pendingChanges.toAssign.length + pendingChanges.toRemove.length})`
      )}
    </Button>
  );
};
```

### Error Handling

Handle validation and routing service failures gracefully:

```typescript
try {
  const validation = await dataProvider.validateProposedTour(proposedData);
  setValidationState(validation);
} catch (error) {
  if (error.message.includes('routing service')) {
    notify('Routing service unavailable - using estimated times', { type: 'warning' });
  } else if (error.message.includes('missing addresses')) {
    notify('Some events missing addresses - calculation incomplete', { type: 'warning' });
  } else {
    notify('Validation failed - check network connection', { type: 'error' });
  }
  setSaveEnabled(false);
}
```

### Key Benefits

- ✅ **Real-time validation** during drag operations
- ✅ **Live statistics** showing tour efficiency  
- ✅ **Instant feedback** on overlaps, gaps, travel issues
- ✅ **Optimization hints** to guide user decisions
- ✅ **Save prevention** when critical errors exist
- ✅ **No database pollution** with temporary/test data

For detailed implementation guide, see [TOUR-SEGMENTS.md](./TOUR-SEGMENTS.md).

## TypeScript Integration

### Resource Type Definitions

Define types for your resources:

```typescript
interface Patient {
  id: number;
  name: string;
  care_plans?: CarePlan[];
}

interface CarePlan {
  id: number;
  patient_id: number;
  start_date: string;
  end_date: string;
  details: CarePlanDetail[];
}
```

### React Admin Component Props

For custom components:

```typescript
import { ListProps, EditProps } from 'react-admin';

export const PatientList: React.FC<ListProps> = (props) => {
  // Implementation
};

export const PatientEdit: React.FC<EditProps> = (props) => {
  // Implementation
};
```

### Hook Type Safety

React Admin hooks are fully typed:

```typescript
const { data, isLoading, error } = useGetList<Patient>('patients', {
  pagination: { page: 1, perPage: 10 },
  sort: { field: 'name', order: 'ASC' }
});
```

## Common Patterns

### Conditional Rendering Based on Permissions

```tsx
const MyComponent = () => {
  const { isPending, canAccess } = useCanAccess({
    action: 'edit',
    resource: 'patients'
  });
  
  if (isPending) return <Loading />;
  
  return canAccess ? <EditButton /> : null;
};
```

### Reference Fields

For displaying related data:

```tsx
<ReferenceField source="patient_id" reference="patients">
  <TextField source="name" />
</ReferenceField>
```

### Bulk Actions

```tsx
const BulkActionButtons = () => (
  <>
    <BulkDeleteButton />
    <BulkExportButton />
  </>
);

<List bulkActionButtons={<BulkActionButtons />}>
  <Datagrid>
    {/* columns */}
  </Datagrid>
</List>
```

## Troubleshooting

### Common Issues

1. **"ra.notification.data_provider_error"**: Check API response format matches React Admin expectations
2. **Authentication loops**: Ensure `checkAuth` and `checkError` are properly implemented
3. **Missing references**: Verify reference resource names match exactly

### Debug Tips

- Enable React Admin's debug mode: `<Admin debug>`
- Check network tab for API response format
- Use browser console for detailed error messages
- Verify authentication tokens in localStorage

## Additional Resources

- [React Admin Documentation](https://marmelab.com/react-admin/documentation.html)
- [Material-UI v7 Documentation](https://mui.com/material-ui/getting-started/)
- [TypeScript with React Admin](https://marmelab.com/react-admin/TypeScript.html)