# Medication Schedule Rules - API Specification Summary

## Status: ⚠️ **Awaiting Backend Implementation**

The complex medication scheduling system exists in the Django database but lacks FastAPI endpoints.

## What Exists

✅ **Django Model**: `dependence.medicationplan.MedicationScheduleRule` (fully implemented)
✅ **TypeScript Interfaces**: Updated in `src/types/medicationPlans.ts`
✅ **API Specification**: Complete spec in `/Users/mehdi/workspace/clients/inur-sur.lu/inur.django/docs/API_SCHEDULE_RULES_FASTAPI_SPEC.md`

## What's Missing

❌ **FastAPI Endpoints**: Need to be implemented in Django backend

## The 6 Schedule Types

### 1. **Parts of Day** (`schedule_kind="parts"`)
Traditional morning/noon/evening/night checkboxes.

**Example:**
```json
{
  "schedule_kind": "parts",
  "dose": 1.5,
  "parts_of_day": ["morning", "evening"]
}
```

### 2. **Exact Times** (`schedule_kind="times"`)
Specific clock times.

**Example:**
```json
{
  "schedule_kind": "times",
  "dose": 1.0,
  "exact_times": ["07:30", "13:00", "19:00"]
}
```

### 3. **Weekly Pattern** (`schedule_kind="weekly"`)
Specific weekdays at a set time.

**Example:**
```json
{
  "schedule_kind": "weekly",
  "dose": 2.0,
  "weekdays": [0, 2, 4],
  "weekly_time": "09:00"
}
```
*Monday, Wednesday, Friday at 9:00*

### 4. **Monthly Pattern** (`schedule_kind="monthly"`)
Specific days of month at a set time.

**Example:**
```json
{
  "schedule_kind": "monthly",
  "dose": 1.0,
  "days_of_month": [1, 16],
  "monthly_time": "08:00"
}
```
*1st and 16th of each month at 8:00*

### 5. **Specific Dates** (`schedule_kind="specific"`)
Exact date/time combinations.

**Example:**
```json
{
  "schedule_kind": "specific",
  "dose": 1.0,
  "specific_datetimes": [
    "2025-10-22T20:00:00",
    "2025-10-23T08:00:00"
  ]
}
```

### 6. **PRN (As Needed)** (`schedule_kind="prn"`)
Condition-based medication.

**Example:**
```json
{
  "schedule_kind": "prn",
  "dose": 1.0,
  "prn_max_doses_per_day": 4,
  "prn_min_interval_hours": 4.0,
  "prn_condition": "en cas de douleur"
}
```
*As needed for pain, max 4 times per day, 4 hours apart*

## Required API Endpoints

### Base URL
```
/fast/medication-plans/{plan_id}/medications/{medication_id}/schedule-rules
```

### Endpoints Needed

1. **List Rules**
   ```
   GET /schedule-rules
   ```
   Returns: `{data: [...], total: N}` (React Admin format)

2. **Get Single Rule**
   ```
   GET /schedule-rules/{rule_id}
   ```

3. **Create Rule**
   ```
   POST /schedule-rules
   ```
   Body: Schedule rule data with type-specific fields

4. **Update Rule**
   ```
   PUT /schedule-rules/{rule_id}
   ```
   Body: Partial update data

5. **Delete Rule**
   ```
   DELETE /schedule-rules/{rule_id}
   ```

6. **Reorder Rules** (optional, nice to have)
   ```
   POST /schedule-rules/reorder
   ```

## Key Features

### Date Range Validity
Each rule has optional `valid_from` and `valid_until` dates:
- Rules only apply within their validity period
- Useful for temporary dose changes
- Supports dose tapering schedules

### Rule Ordering
Rules have a `rule_order` field (0-based):
- Controls display order in UI
- Controls evaluation priority
- Can be reordered via API

### Active/Inactive Toggle
Rules have `is_active` boolean:
- Temporarily disable without deleting
- Useful for testing/pausing schedules

### Dose Information
- `dose`: Numeric value (e.g., 1.5)
- `dose_unit`: String (default: "comprimé(s)")
- Examples: "ml", "goutte(s)", "injection(s)"

## Validation Rules

### Schedule-Specific
- **parts**: At least one part of day required
- **times**: At least one time in HH:MM format
- **weekly**: At least one weekday (0-6) + time required
- **monthly**: At least one day (1-31) + time required
- **specific**: At least one ISO datetime required
- **prn**: Condition text required

### Date Range
- `valid_from` must be >= medication start date
- `valid_from` must be >= plan start date
- `valid_until` must be <= medication end date (if set)
- `valid_until` must be <= plan end date (if set)
- `valid_until` must be >= `valid_from`

## Implementation Roadmap

### Phase 1: Backend (Pending)
1. Create FastAPI router file: `fastapi_app/newapi/medication_schedule_rules.py`
2. Implement Pydantic schemas (provided in spec)
3. Implement CRUD endpoints
4. Add validation logic (reuse Django model's `clean()`)
5. Add tests
6. Register router in main API

### Phase 2: Frontend (Ready to Build)
1. Already done:
   - ✅ TypeScript interfaces updated
   - ✅ Data provider interface defined
2. To do (once API is ready):
   - Implement data provider methods
   - Create enhanced ScheduleRulesDialog component
   - Build schedule type selector
   - Build type-specific input forms
   - Add validation and error handling
   - Test with real API

### Phase 3: Testing & Polish
1. End-to-end testing
2. User acceptance testing
3. Documentation updates
4. Training materials

## Use Cases

### 1. Dose Tapering
Create multiple rules with different date ranges:
```
Jan 1-31:  2.0 comprimés morning/evening
Feb 1-28:  1.5 comprimés morning/evening
Mar 1-31:  1.0 comprimé morning/evening
Apr 1+:    0.5 comprimé morning/evening
```

### 2. Weekly Medication
Injection every Monday at 9:00:
```
schedule_kind: "weekly"
weekdays: [0]
weekly_time: "09:00"
```

### 3. Monthly Medication
Treatment on 1st and 15th of each month:
```
schedule_kind: "monthly"
days_of_month: [1, 15]
monthly_time: "08:00"
```

### 4. Temporary Treatment
Short-term medication with exact dates:
```
schedule_kind: "specific"
specific_datetimes: [
  "2025-10-22T20:00:00",
  "2025-10-23T08:00:00",
  "2025-10-24T08:00:00"
]
```

### 5. As-Needed Medication
Pain medication with limits:
```
schedule_kind: "prn"
prn_condition: "en cas de douleur"
prn_max_doses_per_day: 4
prn_min_interval_hours: 4.0
```

## Next Steps

1. **Backend Team**:
   - Review API spec: `/Users/mehdi/workspace/clients/inur-sur.lu/inur.django/docs/API_SCHEDULE_RULES_FASTAPI_SPEC.md`
   - Implement endpoints
   - Run tests
   - Deploy to dev environment

2. **Frontend Team** (after API is ready):
   - Implement data provider methods
   - Build UI components
   - Integrate with existing medication plans
   - Test thoroughly

3. **Documentation**:
   - Update user guide
   - Create training materials
   - Document workflows

## Current Simple Implementation

The system currently has a **simple implementation** in place:
- Basic dialog for managing "parts of day" rules
- Limited to morning/noon/evening/night
- Works as a placeholder until complex system is ready

**Location**: `src/components/medication-plans/ScheduleRulesDialog.tsx`

This can be replaced once the backend API is implemented and tested.

## Benefits of Complex System

1. **Flexibility**: Support all types of medication schedules
2. **Precision**: Exact times instead of just "morning/evening"
3. **Patterns**: Weekly/monthly recurring schedules
4. **Validity**: Temporary rules with date ranges
5. **PRN Support**: As-needed medications with safety limits
6. **Dose Tapering**: Multiple rules for gradual dose changes

## Questions?

Contact the development team with questions about:
- API implementation
- UI design decisions
- Use case clarifications
- Timeline and priorities
