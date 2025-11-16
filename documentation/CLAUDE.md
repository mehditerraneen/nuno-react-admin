# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev          # Start Vite dev server (http://localhost:5173)

# Build & Production
npm run build        # Build for production
npm run serve        # Preview production build

# Code Quality
npm run type-check   # Run TypeScript type checking
npm run lint         # Run ESLint with auto-fix
npm run format       # Format code with Prettier

# Testing
npm run test:e2e           # Run Playwright E2E tests
npm run test:e2e:ui        # Run Playwright tests with UI
npm run test:e2e:headed    # Run Playwright tests in headed mode
```

## Architecture Overview

### Tech Stack
- **Frontend**: React Admin v5.8.0 + React 19
- **UI**: Material-UI v7
- **Language**: TypeScript
- **Build**: Vite
- **Testing**: Playwright (E2E)
- **API**: REST API with JWT authentication

### Key Architectural Patterns

1. **Authentication Flow**
   - JWT-based with access + refresh tokens
   - Auto-refresh 5 minutes before expiry
   - Dev credentials: `testdev` / `testpass123`
   - Token storage in localStorage
   - Automatic logout on 401/403

2. **Data Provider Pattern**
   - Custom provider extends `ra-data-simple-rest`
   - Authenticated requests with JWT tokens
   - Specialized methods for care plan operations
   - Base URL: `VITE_SIMPLE_REST_URL` env var

3. **Resource Organization**
   - Each resource has its own directory under `src/`
   - Standard React Admin CRUD components
   - Custom forms for complex operations (e.g., CarePlanDetailEditDialog)

### Core Data Models & Relationships

```
Patient
  └── CarePlan (many)
        ├── CarePlanDetail (many)
        │     ├── LongTermCareItemQuantity (many)
        │     └── CareOccurrence (many)
        └── MedicalCareSummaryPerPatient (CNS Plan) (optional)
```

### Important API Endpoints

📡 **Available Endpoints Summary**

| Endpoint                                   | Method         | Description           |
|--------------------------------------------|----------------|-----------------------|
| /fast/mobile/api/v1/react-admin/auth/login | POST           | Get JWT token         |
| /fast/medicationplans                      | GET            | List medication plans |
| /fast/medicationplans/{id}                 | GET            | Get specific plan     |
| /fast/medications                          | GET            | List medications      |
| /fast/patients                             | GET            | List patients         |
| /fast/employees                            | GET            | List employees        |
| /fast/careplans                            | GET            | List care plans       |
| /fast/tours                                | GET/POST       | Tour management       |
| /fast/tours/{id}                           | GET/PUT/DELETE | Specific tour         |
| /fast/events/                              | GET            | Healthcare events     |
| /fast/event-types                          | GET            | Event type options    |
| /fast/event-states                         | GET            | Event state options   |

All endpoints return JSON in React Admin compatible format with `{"data": [...], "total": N}` structure and require JWT authentication! 🔐

**API Documentation**

| Documentation Type | URL                                | Purpose             |
|--------------------|------------------------------------|---------------------|
| Swagger UI         | http://localhost:8000/docs         | Interactive testing |
| ReDoc              | http://localhost:8000/redoc        | Clean documentation |
| OpenAPI JSON       | http://localhost:8000/openapi.json | Raw schema          |

**Legacy Endpoints** (for reference)
- Auth: `/api/v1/auth/login`, `/api/v1/auth/refresh`
- Care Plans: Standard REST endpoints + custom methods
- CNS Integration: `getCnsCarePlanDetails`, `getLatestCnsCarePlanForPatient`

### Key Components

- **App.tsx**: Resource definitions and admin configuration
- **authProvider.ts**: JWT authentication logic
- **dataProvider.ts**: API integration with custom methods
- **CarePlanDetailEditDialog**: Complex form for care plan details
- **Time Components**: EnhancedTimeInput, SmartTimeInput for time tracking

### Tours Feature (Enhanced Healthcare Visit Management)

**Status**: ✅ **FULLY ENHANCED** - Advanced React Admin implementation with drag-and-drop

The Tours system provides comprehensive healthcare visit scheduling with modern UX:

#### **Enhanced Features (Latest Implementation)**

1. **Drag-and-Drop Event Assignment**
   - `EnhancedTourEdit` - Interactive interface with 3-column layout
   - Drag events between Available → Assigned lists
   - **NEW: Batch update system** - Preview changes before saving
   - Patient names displayed (not IDs) for better UX
   - Visual indicators for pending changes (green/red highlighting)

2. **Weekly Calendar View**
   - `WeeklyTourCalendar` - Grid layout: employees × days
   - Color-coded tours per employee with unique colors
   - Click empty slots to create tours instantly
   - Weekly statistics and navigation controls

3. **Smart Form Integration**
   - Tour details: name, date, time_start, time_end, break_duration
   - Employee reassignment via dropdown
   - "Update Events List" button for real-time refresh
   - **NEW: Time-based event filtering** - Only shows events within tour hours
   - Form change detection with DOM fallback

4. **Time Conflict Detection**
   - Visual warnings for events outside tour hours
   - Orange highlighting and warning chips
   - Real-time conflict checking with form values
   - Summary alerts showing total conflicts

5. **Enhanced Tour Management**
   - Tours as primary entity (not Events)
   - Events belong to Tours with proper relationships
   - Route optimization with status indicators
   - Comprehensive scheduling with break planning
   - **NEW: Save/Cancel workflow** - Batch all changes together

6. **Batch Update System** (NEW)
   - **Preview Mode**: Drag & drop without immediate API calls
   - **Save Changes Button**: Batch submit all pending changes
   - **Cancel Button**: Revert all local changes
   - **Pending Changes Summary**: Visual count and status
   - **Visual Feedback**: Color-coded pending states

#### **Key Components**

- `EnhancedTourEdit` - Main drag-and-drop interface with form integration
- `WeeklyTourCalendar` - Visual planning grid with employee organization  
- `EnhancedToursDashboard` - 3-tab interface (Weekly/Overview/Planning)
- `TourList/Create/Show` - Standard CRUD with enhanced fields
- `Events` - Patient visit management with tour assignment

#### **Technical Implementation**

- **Form Context**: React Hook Form integration for live form reading
- **DOM Fallback**: Direct input queries when form context fails  
- **Type Safety**: Enhanced Tour interface with scheduling fields
- **Real-time Updates**: Event list refresh based on current form values
- **Visual Feedback**: Loading states, notifications, conflict warnings
- **Batch State Management**: Pending changes tracking with local state
- **Time-based Filtering**: API calls include time_start_gte/time_end_lte parameters
- **FastAPI Integration**: Proper handling of paginated responses `{items: [...], total: N}`

#### **API Integration**

- Tours CRUD: GET/POST/PUT/DELETE `/fast/tours`
- Route optimization: POST `/fast/tours/{id}/optimize` 
- Event filtering: GET `/fast/events?date=YYYY-MM-DD`
- JWT authentication required for all endpoints
- React Admin compatible response format: `{data: [...], total: N}`

#### **User Workflow**

1. **Weekly Planning**: Use WeeklyTourCalendar for overview and quick creation
2. **Detailed Editing**: Use EnhancedTourEdit for drag-and-drop event assignment
3. **Form Changes**: Modify tour date/times → Click "Update Events List" → See refreshed events
4. **Conflict Resolution**: Visual warnings guide time adjustment decisions
5. **Route Optimization**: One-click optimization with efficiency tracking

### Recent Bug Fixes & Improvements (July 2025)

#### **Real-Time Tour Validation System** ✅ **NEW MAJOR FEATURE**

**Implementation**: Added comprehensive real-time validation for tour planning without database pollution.

**Key Features**:
1. **Pre-Save Validation API**: `POST /fast/tours/validate-proposed`
   - Works with proposed tour data without requiring saved database records
   - Returns validation errors, warnings, travel segments, statistics, and optimization suggestions
   - Enables real-time feedback during drag-and-drop operations

2. **DataProvider Integration** (`dataProvider.ts`):
   ```typescript
   validateProposedTour: async (proposedData: ProposedTourData): Promise<TourValidationResponse> => {
     const url = `${apiUrl}/tours/validate-proposed`;
     const response = await fetch(url, {
       method: "POST",
       headers: getAuthHeaders(),
       body: JSON.stringify(proposedData),
     });
     return response.json();
   }
   ```

3. **Real-Time Validation Logic** (`EnhancedTourEdit.tsx`):
   - Debounced validation (500ms) to prevent excessive API calls
   - Automatic triggering on drag-and-drop operations
   - Form integration for current tour details
   - Comprehensive error handling with fallback states

4. **Enhanced Validation UI Components**:
   - **Live Statistics**: Real-time efficiency scoring with color-coded progress bars
   - **Validation Feedback**: Immediate display of errors and warnings with suggested fixes
   - **Optimization Suggestions**: Actionable tips for improving tour efficiency
   - **Enhanced Save Button**: Prevents saving when validation errors exist
   - **Loading States**: Animated spinner during validation

**Benefits**:
- ✅ **Real-time validation** without database pollution
- ✅ **Live efficiency scoring** with visual progress indicators  
- ✅ **Instant error feedback** with suggested fixes
- ✅ **Optimization suggestions** to guide user decisions
- ✅ **Save protection** when critical errors exist
- ✅ **Seamless UX integration** with existing drag-and-drop workflow

#### **Tour UX Enhancements** ✅

**Compact Design Improvements**:
1. **Tour Details Optimization**:
   - Reduced from 4-column to 3-column layout (3-4.5-4.5 grid proportions)
   - Compact form fields with `size="small"` for all inputs
   - Shortened labels: "Start Time" → "Start", "Break Duration" → "Break (min)"
   - Reduced spacing and padding throughout

2. **Mandatory Field Validation**:
   - Added `validate={required()}` to tour start time, end time, and break duration
   - Visual asterisk indicators for required fields
   - React Admin built-in validation integration

3. **Statistics Area Compaction**:
   - Changed from vertical to horizontal flex-wrap layout for chips
   - Compact efficiency bar (6px height, inline with label)
   - Consolidated optimization status into main chips area

4. **Event Filtering Enhancement**:
   - **Birthday Events Excluded**: Added `e.event_type !== 'BIRTHDAY'` filter to available events
   - Cleaner available events list focused on relevant tour events

#### **Material-UI v7 Compatibility Fix** ✅

**Issue**: MUI Grid deprecation warnings breaking layout
- `MUI Grid: The item prop has been removed and is no longer necessary`
- `MUI Grid: The xs prop has been removed`
- `MUI Grid: The md prop has been removed`

**Solution Applied**:
1. **Grid System Migration**:
   - Updated import: `Grid2 as Grid` from `@mui/material`
   - Removed deprecated `item` prop from all Grid components
   - Updated syntax: `<Grid item xs={12} md={3}>` → `<Grid xs={12} md={3}>`

2. **Verification**:
   - ✅ No console warnings
   - ✅ Layout working correctly in all screen sizes
   - ✅ Drag-and-drop functionality intact

#### **Events UX Critical Bug Resolution** ✅

**Issue**: Events interface displaying `"ra.notification.data_provider_error"` in Type column and various UX problems.

**Root Cause**: Event-types API endpoint was returning `{"value": "BIRTHDAY", "label": "..."}` format, but React Admin requires `{"id": "BIRTHDAY", "label": "..."}` format for reference fields.

**Solution Applied**:
1. **Backend API Fix**: Changed `/fast/event-types` endpoint response format
   - **Before**: `{"value": choice[0], "label": choice[1]}`
   - **After**: `{"id": choice[0], "label": choice[1]}`
   - Applied to both list (`/fast/event-types`) and individual (`/fast/event-types/{id}`) endpoints

2. **Verification Results**:
   - ✅ Events list now shows proper event types: `"GENERIC"`, `"BIRTHDAY"`, `"EMPL_TRNG"`
   - ✅ No more `"ra.notification.data_provider_error"` messages
   - ✅ No more `"MUI: out-of-range value"` warnings
   - ✅ React Admin validation passes: `"The response to 'getMany' must be like { data : [{ id: 123, ...}, ...] }"`

**API Response Format** (Fixed):
```json
{
  "data": [
    {"id": "BIRTHDAY", "label": "Birthday"},
    {"id": "CARE", "label": "Soin"},
    {"id": "GENERIC", "label": "Général pour Patient (non soin)"},
    {"id": "EMPL_TRNG", "label": "Formation"}
  ],
  "total": 8
}
```

**Testing Method**: Used Playwright MCP to verify fixes in browser, checking both Events list view and individual event edit forms.

**Status**: 🎯 **RESOLVED** - Events UX now fully functional with proper type display

#### **Current Status Summary**

**✅ COMPLETED FEATURES**:
- Real-time tour validation system with pre-save API
- Compact tour details UI with mandatory field validation
- Birthday events filtering for cleaner available events list
- Material-UI v7 Grid system compatibility
- Comprehensive validation UI with efficiency scoring
- Enhanced drag-and-drop workflow with live feedback

**🚀 READY FOR PRODUCTION**:
- Tours system fully enhanced with modern UX
- All validation and error handling implemented
- No breaking console warnings or errors
- Playwright-tested UI functionality

#### **Remaining Known Issues**
- Authentication token refresh issues (HTTP 401 errors in some scenarios)
- Event edit form dropdown styling could be enhanced
- Need visual styling improvements for event types and states

### Development Tips

1. **API Configuration**: Set `VITE_SIMPLE_REST_URL` in `.env` (copy from `.env.example`)
2. **Token Management**: authService handles automatic refresh - don't manually manage tokens
3. **Type Safety**: Use existing TypeScript interfaces in component directories
4. **Form Validation**: React Admin's built-in validation + custom validators
5. **Custom API Calls**: Add methods to dataProvider.ts, not direct fetch calls
6. **Tours Feature**: Access via `/tours-dashboard` or Events/Employees resources
7. **React Admin Reference Fields**: Always use `id` field for reference data, not `value` or custom field names