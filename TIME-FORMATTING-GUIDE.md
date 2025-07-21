# Time Formatting Guide

## Overview

This guide explains the time formatting system implemented to ensure all time values are sent to the API in the correct "HH:MM" format (e.g., "07:30", "14:15") with proper zero-padding.

## Problem Solved

**Before:** Time inputs might send "7:30" causing 422 validation errors  
**After:** All times are automatically formatted to "07:30" ensuring API compatibility

## Components

### 1. Time Utilities (`src/utils/timeUtils.ts`)

#### Core Functions

```typescript
// Format any time string to HH:MM
formatTimeString("7:30") → "07:30"
formatTimeString("15:45") → "15:45"

// Validate time format
isValidTimeFormat("07:30") → true
isValidTimeFormat("25:00") → false

// Format multiple fields in form data
formatTimeFieldsInFormData(formData, ['time_start', 'time_end'])
```

#### Advanced Functions

```typescript
// Parse time into components
parseTimeString("14:30") → { hours: 14, minutes: 30 }

// Create time from components
createTimeString(7, 30) → "07:30"

// Convert Date to time string
dateToTimeString(new Date()) → "14:25"

// Validate time ranges
isValidTimeRange("08:00", "17:00") → true
isValidTimeRange("17:00", "08:00") → false
```

### 2. TimeInput Component (`src/components/TimeInput.tsx`)

#### Basic Usage
```tsx
<TimeInput
  source="time_start"
  label="Start Time"
  required
/>
```

#### With Autocomplete
```tsx
<TimeInput
  source="time_start"
  label="Start Time"
  showCommonTimes={true}  // Shows preset time options
  required
/>
```

#### Features
- **Auto-formatting:** Converts "7:30" to "07:30" on blur
- **Validation:** Shows helpful error messages for invalid formats
- **Autocomplete:** Optional dropdown with common times
- **Pattern Validation:** HTML5 pattern attribute for client-side validation

### 3. Form Integration

#### Automatic Time Formatting
Both create and edit dialogs now automatically format time fields:

```typescript
// In handleSubmit functions
const formattedData = formatTimeFieldsInFormData(formValues, ['time_start', 'time_end']);

const dataToSave = {
  name: formattedData.name,
  time_start: formattedData.time_start, // Always "HH:MM"
  time_end: formattedData.time_end,     // Always "HH:MM"
  // ... other fields
};
```

## Usage Examples

### 1. Creating New Care Plan Details

```tsx
// User types: "7:30"
// Component formats to: "07:30"
// API receives: "07:30" ✓

<TimeInput
  source="time_start"
  label="Start Time"
  showCommonTimes={true}
  required
/>
```

### 2. Editing Existing Details

```tsx
// Existing time: "08:30"
// Displays as: "08:30"
// User edits to: "9:15"
// Formats to: "09:15"
// API receives: "09:15" ✓

<TimeInput
  source="time_end"
  label="End Time"
  required
/>
```

### 3. Validation & Error Handling

```tsx
// Invalid input: "25:00"
// Shows error: "Start Time must be in HH:MM format (e.g., 07:30, 14:15)"

<TimeInput
  source="time_start"
  label="Start Time"
  helperText={validationErrors.time_start}
  error={!!validationErrors.time_start}
/>
```

## Common Time Values

The system includes preset common times for quick selection:

```typescript
const COMMON_TIMES = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
];
```

## Validation Rules

### Valid Formats
- ✅ `07:30` - Properly formatted
- ✅ `14:15` - Afternoon time
- ✅ `00:00` - Midnight
- ✅ `23:59` - Last minute of day

### Invalid Formats (Auto-corrected)
- `7:30` → `07:30` - Missing leading zero
- `9:00` → `09:00` - Missing leading zero

### Invalid Formats (Show Errors)
- ❌ `25:00` - Invalid hour
- ❌ `12:60` - Invalid minute
- ❌ `abc` - Non-numeric
- ❌ `12:` - Incomplete

## Error Messages

The system provides user-friendly error messages:

```typescript
// Time-specific errors
"Start Time must be in HH:MM format (e.g., 07:30, 14:15)"

// Generic field errors
"Start Time is required"
"End Time has an invalid value"
```

## Testing

### Unit Tests
```bash
# Run time formatting tests
npm run test:e2e time-formatting.spec.ts
```

### Manual Testing Checklist
- [ ] Type "7:30" → Should format to "07:30"
- [ ] Type "15:45" → Should stay "15:45"
- [ ] Type "25:00" → Should show error
- [ ] Use autocomplete → Should select proper format
- [ ] Submit form → Should send "HH:MM" to API

## API Integration

### Request Format
```json
{
  "name": "Morning Care",
  "time_start": "07:30",  // Always HH:MM
  "time_end": "09:00",    // Always HH:MM
  "params_occurrence_ids": [1, 2],
  "long_term_care_items": [...],
  "care_actions": "Basic care routine"
}
```

### Backend Validation
Your FastAPI/Django backend should expect:
- String format: `"HH:MM"`
- Hour range: 00-23
- Minute range: 00-59

Example FastAPI validation:
```python
from pydantic import BaseModel, validator
import re

class CarePlanDetailCreate(BaseModel):
    time_start: str
    time_end: str
    
    @validator('time_start', 'time_end')
    def validate_time_format(cls, v):
        if not re.match(r'^([0-1][0-9]|2[0-3]):[0-5][0-9]$', v):
            raise ValueError('Time must be in HH:MM format')
        return v
```

## Migration Guide

### Updating Existing Components

1. **Replace TextInput with TimeInput:**
```tsx
// Before
<TextInput source="time_start" label="Start Time" />

// After
<TimeInput source="time_start" label="Start Time" showCommonTimes={true} />
```

2. **Add Time Formatting to Submit Handlers:**
```tsx
// Before
const payload = {
  time_start: values.time_start,
  time_end: values.time_end,
};

// After
const formattedValues = formatTimeFieldsInFormData(values, ['time_start', 'time_end']);
const payload = {
  time_start: formattedValues.time_start,
  time_end: formattedValues.time_end,
};
```

3. **Update Error Handling:**
```tsx
// Add time-specific error messages
import { formatErrorMessage } from './utils/errorHandling';

// Will automatically handle time format errors
const errorMessage = formatErrorMessage('time_start', error);
```

## Best Practices

1. **Always use TimeInput for time fields**
2. **Enable autocomplete for better UX:** `showCommonTimes={true}`
3. **Validate time ranges:** Ensure start time < end time
4. **Provide clear error messages**
5. **Test with various input formats**
6. **Use consistent labeling:** "Start Time", "End Time"

## Troubleshooting

### Common Issues

**Problem:** API still receives "7:30" format  
**Solution:** Ensure `formatTimeFieldsInFormData` is called before API submission

**Problem:** TimeInput shows TypeScript errors  
**Solution:** Import from `./components/TimeInput`

**Problem:** Autocomplete not working  
**Solution:** Set `showCommonTimes={true}` prop

**Problem:** Validation errors not showing  
**Solution:** Pass `error` and `helperText` props to TimeInput

### Debug Steps

1. Check browser console for formatted time logs
2. Use Form Debugger to see actual API payload
3. Verify TimeInput is imported correctly
4. Check that time utilities are formatting properly

This comprehensive time formatting system ensures all time values are consistently formatted for API compatibility while providing an excellent user experience.