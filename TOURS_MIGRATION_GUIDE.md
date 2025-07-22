# Tours Feature Migration: Django Backend to React Admin

## 🎯 Migration Overview

This guide details migrating the **Tours/Visit Scheduling System** from the current Django template-based interface to the modern [nuno-react-admin](https://github.com/mehditerraneen/nuno-react-admin) React Admin frontend. The Tours feature is the core scheduling and route optimization system for healthcare visits in Luxembourg.

## 🚐 Tours Feature Overview

### What is the Tours System?
The Tours system manages **healthcare visit scheduling and route optimization** for nursing staff. It handles:

- **Daily Visit Schedules**: Patient visits organized by date and employee
- **Route Optimization**: AI-powered route planning to minimize travel time
- **Real-time Updates**: Live scheduling changes and event management
- **Patient Care Events**: Wound care, vital signs, medication administration
- **Time Tracking**: Planned vs actual visit times for billing accuracy

### Current Implementation (Django Templates)
Located in `/templates/tours/`:
- `dashboard.html` - Main scheduling interface with calendar view
- `partials/edit_event_modal.html` - Event editing modal (recently fixed)
- `partials/create_tour_modal.html` - Tour creation interface
- `partials/optimization_modal.html` - Route optimization controls
- `partials/timeline_modal.html` - Visit timeline visualization

## 🔄 Migration Strategy

### Phase 1: Backend API Preparation ✅ **COMPLETE**
- [x] **FastAPI endpoints secured** with JWT authentication
- [x] **Event management APIs** available at `/fast/events/*` 
- [x] **Employee scheduling APIs** at `/fast/employees/*`
- [x] **Patient data APIs** at `/fast/patients/*`
- [x] **Authentication system** ready for React Admin

### Phase 2: React Admin Implementation 🎯 **NEXT STEPS**
- [ ] **Tours Dashboard Component** - Replace Django calendar view
- [ ] **Event Management Interface** - CRUD operations for visits
- [ ] **Route Optimization Panel** - Interactive optimization controls
- [ ] **Employee Assignment System** - Staff scheduling interface
- [ ] **Real-time Updates** - WebSocket or polling for live data

## 📊 Tours Data Structure

### Core Models & API Endpoints

#### **1. Events (Healthcare Visits)**
```typescript
// Event Data Structure
interface Event {
  id: number;
  patient_id: number;
  employee_id?: number;
  date: string;           // Visit date
  time_start: string;     // Planned start time
  time_end: string;       // Planned end time  
  real_start?: string;    // Actual start time
  real_end?: string;      // Actual end time
  state: EventState;      // 1-6 (waiting, valid, done, etc.)
  notes: string;
  event_address?: string; // Custom address override
  event_type: string;     // wound_care, vital_signs, etc.
}

// API Endpoints for React Admin
GET    /fast/events                    // List events (paginated)
GET    /fast/events/{id}               // Get event details
POST   /fast/events                    // Create new event
PUT    /fast/events/{id}               // Update event
DELETE /fast/events/{id}               // Delete event
POST   /fast/events/{id}/assign        // Assign employee
```

#### **2. Tours (Route Optimization)**
```typescript
// Tour represents optimized daily routes for employees
interface Tour {
  id: number;
  employee_id: number;
  date: string;
  events: Event[];          // Ordered list of visits
  total_distance: number;   // Calculated route distance
  estimated_duration: number; // Total travel + visit time
  optimization_status: 'pending' | 'optimized' | 'manual';
}

// API Endpoints
GET    /fast/tours                     // List tours
GET    /fast/tours/{id}                // Get tour with events
POST   /fast/tours/optimize            // Trigger route optimization
PUT    /fast/tours/{id}/reorder        // Manual event reordering
```

#### **3. Employee Availability**
```typescript
// Employee scheduling and availability
interface Employee {
  id: number;
  name: string;
  abbreviation: string;
  color: string;           // Calendar color coding
  active: boolean;
}

// API Endpoints  
GET /fast/employees/available/         // Get available staff
GET /fast/employees-by-id/{id}         // Employee details
GET /fast/employees/{id}/schedule      // Daily schedule
```

## 🎨 React Admin Components to Build

### 1. Tours Dashboard (Main Interface)

**File**: `src/components/tours/ToursDashboard.tsx`

```typescript
import React from 'react';
import { Calendar, List, Card } from '@mui/material';

export const ToursDashboard = () => {
  return (
    <Card>
      {/* Calendar View - replace Django template calendar */}
      <ToursCalendar />
      
      {/* Employee Panel - staff list with daily schedules */}
      <EmployeePanel />
      
      {/* Event List - today's visits */}
      <EventsList />
      
      {/* Quick Actions */}
      <ToursActions />
    </Card>
  );
};

// Backend integration:
// - GET /fast/events?date=2024-01-15 for calendar data
// - GET /fast/employees/available/ for staff list
// - Real-time updates via WebSocket or polling
```

### 2. Event Management Interface

**File**: `src/components/tours/EventManagement.tsx`

```typescript
// Replace the current edit_event_modal.html functionality
export const EventList = (props: any) => (
  <List {...props} filters={<EventFilters />}>
    <Datagrid>
      <DateField source="date" />
      <TimeField source="time_start" label="Start" />
      <TimeField source="time_end" label="End" />
      <ReferenceField source="patient_id" reference="patients">
        <TextField source="name" />
      </ReferenceField>
      <ReferenceField source="employee_id" reference="employees">
        <TextField source="name" />
      </ReferenceField>
      <SelectField 
        source="state" 
        choices={[
          { id: 1, name: 'Waiting' },
          { id: 2, name: 'Valid' },
          { id: 3, name: 'Done' },
          { id: 4, name: 'Ignored' },
          { id: 5, name: 'Not Done' },
          { id: 6, name: 'Cancelled' }
        ]} 
      />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const EventEdit = (props: any) => (
  <Edit {...props}>
    <SimpleForm>
      <DateInput source="date" />
      <TimeInput source="time_start" />
      <TimeInput source="time_end" />
      <ReferenceInput source="patient_id" reference="patients">
        <SelectInput optionText="name" />
      </ReferenceInput>
      <ReferenceInput source="employee_id" reference="employees">
        <SelectInput optionText="name" />
      </ReferenceInput>
      <SelectInput source="state" choices={eventStateChoices} />
      <TextInput source="notes" multiline />
      <TimeInput source="real_start" label="Actual Start" />
      <TimeInput source="real_end" label="Actual End" />
    </SimpleForm>
  </Edit>
);
```

### 3. Route Optimization Panel

**File**: `src/components/tours/RouteOptimization.tsx`

```typescript
// Replace optimization_modal.html functionality
export const RouteOptimizationPanel = () => {
  const [optimizing, setOptimizing] = useState(false);
  
  const handleOptimize = async (employeeId: number, date: string) => {
    setOptimizing(true);
    try {
      await fetch('/fast/tours/optimize', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ employee_id: employeeId, date })
      });
      // Refresh tour data
      refetch();
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Route Optimization" />
      <CardContent>
        <EmployeeSelector onChange={setSelectedEmployee} />
        <DatePicker value={selectedDate} onChange={setSelectedDate} />
        
        <Button 
          onClick={() => handleOptimize(selectedEmployee, selectedDate)}
          disabled={optimizing}
          startIcon={optimizing ? <CircularProgress size={20} /> : <RouteIcon />}
        >
          {optimizing ? 'Optimizing...' : 'Optimize Route'}
        </Button>
        
        {/* Route visualization */}
        <RouteMap events={optimizedEvents} />
        
        {/* Manual reordering */}
        <DragDropEventList 
          events={events}
          onReorder={handleManualReorder}
        />
      </CardContent>
    </Card>
  );
};
```

### 4. Employee Schedule Interface

**File**: `src/components/tours/EmployeeSchedule.tsx`

```typescript
// Replace employee scheduling functionality
export const EmployeeScheduleList = (props: any) => (
  <List {...props}>
    <Datagrid>
      <TextField source="name" />
      <TextField source="abbreviation" />
      <ColorField source="color" />
      <FunctionField 
        source="daily_events_count"
        render={(record: any) => 
          <Chip label={`${record.daily_events_count} visits`} />
        }
      />
      <FunctionField
        source="estimated_duration" 
        render={(record: any) => 
          <Duration minutes={record.estimated_duration} />
        }
      />
      <EditButton />
    </Datagrid>
  </List>
);

export const EmployeeScheduleEdit = (props: any) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="name" />
      <TextInput source="abbreviation" />
      <ColorInput source="color" />
      
      {/* Daily schedule management */}
      <ArrayInput source="daily_schedule">
        <SimpleFormIterator>
          <TimeInput source="start_time" />
          <TimeInput source="end_time" />
          <BooleanInput source="available" />
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Edit>
);
```

## 🔧 Backend API Extensions Needed

### Additional Endpoints for Tours Migration

```python
# Add these endpoints to existing FastAPI routers

# Tours-specific endpoints
@router.get("/tours", response_model=List[TourSchema])
def get_tours(
    date: Optional[str] = Query(None),
    employee_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    # Return tours for specific date/employee

@router.post("/tours/optimize")  
def optimize_tour(
    optimization_request: OptimizationRequest,
    current_user: User = Depends(get_current_active_user)
):
    # Trigger route optimization algorithm
    
@router.get("/events/daily")
def get_daily_events(
    date: str = Query(...),
    employee_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    # Get events for specific date, optionally filtered by employee

@router.put("/events/{event_id}/times")
def update_event_times(
    event_id: int,
    time_update: EventTimeUpdate,
    current_user: User = Depends(get_current_active_user)
):
    # Update real start/end times during visits

# WebSocket endpoint for real-time updates
@router.websocket("/tours/updates")
async def tours_websocket(websocket: WebSocket):
    # Real-time tour and event updates
```

## 📱 Migration Implementation Steps

### Step 1: Setup React Admin Tours Module
```bash
cd nuno-react-admin

# Create tours module structure
mkdir -p src/components/tours
mkdir -p src/providers/tours
mkdir -p src/types/tours

# Install additional dependencies
npm install @mui/x-date-pickers @mui/x-data-grid
npm install react-big-calendar  # For calendar view
npm install @dnd-kit/core @dnd-kit/sortable  # For drag-drop
npm install leaflet react-leaflet  # For route mapping
```

### Step 2: Create Tours Resource Configuration
```typescript
// src/App.tsx - Add tours resources
import { 
  EventList, 
  EventEdit, 
  EventCreate 
} from './components/tours/Events';

import { 
  ToursList, 
  ToursEdit 
} from './components/tours/Tours';

<Admin dataProvider={dataProvider} authProvider={authProvider}>
  {/* Existing resources */}
  <Resource 
    name="patients" 
    list={PatientList} 
    edit={PatientEdit} 
  />
  
  {/* New Tours resources */}
  <Resource 
    name="events" 
    list={EventList} 
    edit={EventEdit} 
    create={EventCreate}
    icon={CalendarIcon}
  />
  
  <Resource 
    name="tours" 
    list={ToursList} 
    edit={ToursEdit}
    icon={RouteIcon}
  />
  
  {/* Custom dashboard for tours */}
  <CustomRoutes>
    <Route path="/tours-dashboard" element={<ToursDashboard />} />
  </CustomRoutes>
</Admin>
```

### Step 3: Data Provider Extensions
```typescript
// src/providers/toursDataProvider.ts
export const toursDataProvider = {
  ...baseDataProvider,
  
  // Custom methods for tours
  optimizeTour: async (employeeId: number, date: string) => {
    const response = await httpClient('/fast/tours/optimize', {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId, date })
    });
    return response.json;
  },
  
  getDailyEvents: async (date: string, employeeId?: number) => {
    const params = new URLSearchParams({ date });
    if (employeeId) params.append('employee_id', employeeId.toString());
    
    const response = await httpClient(`/fast/events/daily?${params}`);
    return response.json;
  },
  
  updateEventTimes: async (eventId: number, times: EventTimes) => {
    const response = await httpClient(`/fast/events/${eventId}/times`, {
      method: 'PUT', 
      body: JSON.stringify(times)
    });
    return response.json;
  }
};
```

### Step 4: Real-time Updates Integration
```typescript
// src/providers/toursWebSocket.ts
export const useToursRealTime = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/fast/tours/updates');
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      // Handle real-time tour/event updates
      handleRealTimeUpdate(update);
    };
    
    setSocket(ws);
    return () => ws.close();
  }, []);
  
  return socket;
};
```

## 🎯 Migration Benefits

### **Performance Improvements**
- **Faster Loading**: React SPA vs Django template rendering
- **Real-time Updates**: WebSocket integration for live scheduling
- **Better UX**: Modern interface with drag-drop and instant feedback
- **Mobile Responsive**: Touch-friendly scheduling on tablets

### **Developer Experience**
- **Component Reusability**: Shared components across features
- **Type Safety**: TypeScript for better code quality  
- **Modern Tooling**: Hot reload, advanced debugging
- **Easier Maintenance**: Separated frontend/backend concerns

### **Healthcare Workflow Improvements** 
- **Drag-Drop Scheduling**: Intuitive event reordering
- **Visual Route Planning**: Map-based optimization feedback
- **Real-time Collaboration**: Multiple staff can view/edit schedules
- **Mobile-First**: Field staff can update visits on mobile devices

## 🚀 Deployment Strategy

### Development Environment
```bash
# Backend (existing)
cd inur.django
python manage.py runserver  # localhost:8000

# Frontend (React Admin)
cd nuno-react-admin
npm start                   # localhost:3000

# Test tours migration:
# 1. Login to React Admin
# 2. Navigate to Tours Dashboard
# 3. Create/edit events
# 4. Test route optimization
# 5. Verify real-time updates
```

### Production Deployment
```bash
# Backend: Deploy Django/FastAPI as before
# Frontend: Build and deploy React Admin
cd nuno-react-admin
npm run build

# Deploy build/ folder to web server
# Update API_BASE environment variables
# Configure CORS for production domain
```

## 📋 Migration Checklist

### Phase 1: Core Tours Functionality
- [ ] **Events CRUD Interface** - Replace edit_event_modal.html
- [ ] **Tours Dashboard** - Replace dashboard.html calendar view  
- [ ] **Employee Scheduling** - Staff assignment interface
- [ ] **Route Optimization** - Replace optimization_modal.html
- [ ] **Timeline View** - Replace timeline_modal.html

### Phase 2: Advanced Features
- [ ] **Real-time Updates** - WebSocket integration
- [ ] **Mobile Optimization** - Touch-friendly interface
- [ ] **Offline Support** - Service worker for field use
- [ ] **Advanced Filtering** - Date ranges, employee filters
- [ ] **Export Functionality** - PDF schedules, CSV exports

### Phase 3: Integration & Testing
- [ ] **Authentication Flow** - Seamless login experience
- [ ] **Data Migration** - Import existing tour data
- [ ] **Performance Testing** - Load testing with real data
- [ ] **User Acceptance Testing** - Healthcare staff feedback
- [ ] **Production Deployment** - Staged rollout

## 🎉 Expected Outcomes

After migration, healthcare staff will have:

1. **Modern Scheduling Interface** - Intuitive drag-drop event management
2. **Real-time Collaboration** - Multiple users can coordinate schedules  
3. **Mobile-Friendly Design** - Field staff can update visits on tablets
4. **Better Route Optimization** - Visual feedback and manual override
5. **Improved Performance** - Faster loading and responsive interface

The Tours migration represents the most significant UX improvement for daily healthcare operations, transforming from Django templates to a modern, reactive interface that better serves nursing staff workflow needs.

---

**Next Steps**: Begin with Phase 1 implementation, starting with the Events CRUD interface as it provides the foundation for all other Tours functionality.
