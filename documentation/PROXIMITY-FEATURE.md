# Proximity Badge Feature

## Overview
The proximity badge feature provides visual guidance for tour planning by showing numbered badges on the closest **available events** to the last assigned tour event, helping users identify which events to add next based on patient location proximity.

## User Experience

### Smart Available Events Display
1. **After Each Drop**: When an event is dropped into the tour, proximity badges **persist** showing the 5 closest **available events** to the newly added tour event
2. **Visual Feedback**: Numbered badges (1, 2, 3, 4, 5) appear on available events list showing proximity to the last assigned tour event
3. **Color Coding**: 
   - **1st closest**: Green (#4CAF50)
   - **2nd closest**: Blue (#2196F3) 
   - **3rd closest**: Orange (#FF9800)
   - **4th closest**: Purple (#9C27B0)
   - **5th closest**: Red (#F44336)
4. **Source Indicator**: The last assigned tour event shows a gold "NEW" badge to identify the proximity source
5. **Enhanced Tooltips**: Hover over 📍 icon shows distance, travel time, and source patient (e.g., "2.3 km • 8 min from John Doe")
6. **Manual Triggers**: 
   - "Show Closest Available" button in assigned events header
   - 📍 button on individual assigned events to use as proximity source
7. **Smart Clearing**: Badges clear when:
   - An event is removed from the tour
   - Changes are saved
   - User manually clicks "Clear Proximity"

### Visual Elements
- **Numbered Chip**: Small colored chip with rank number (1-5)
- **Location Icon**: 📍 emoji with distance and duration tooltip (e.g., "2.3 km • 8 min")
- **Performance Metrics**: API provides cache hit rate and calculation stats
- **Event Highlighting**: Closest events get colored badges based on proximity rank

## API Integration

### Backend Endpoint
```
POST /fast/tours/events/proximity
```

### Request Format
```json
{
  "source_event_id": 145,
  "target_event_ids": [132, 138, 141, 167, 203]
}
```

### Response Format
```json
{
  "source_event_id": 145,
  "source_patient_name": "Marie Martin",
  "source_patient_address": "23 Rue de la Gare, L-1234 Luxembourg",
  "closest_events": [
    {
      "event_id": 138,
      "patient_name": "Jean Dupont",
      "patient_address": "45 Rue de la Poste, L-1235 Luxembourg",
      "distance_km": 0.8,
      "duration_minutes": 3,
      "rank": 1,
      "cached": true
    }
  ],
  "total_calculated": 10,
  "cache_hits": 6,
  "api_calls_made": 4,
  "calculated_at": "2024-01-15T14:30:45.123456Z"
}
```

## Technical Implementation

### Frontend Components
- **EnhancedTourEdit.tsx**: Main component with drag-and-drop logic
- **dataProvider.ts**: API integration with `calculateEventProximity` method
- **Proximity State**: React state manages badge highlights and colors

### Key Functions
- `calculateProximityHighlights()`: Calls API and creates badge data for any source event
- `handleDropOnTour()`: Recalculates proximity based on the dropped event and persists badges
- `handleDragEnd()`: No longer clears badges - preserves them from last drop
- `handleRemoveFromTour()`: Clears all proximity badges when removing events
- `handleSaveChanges()`: Clears badges after successful save

### Performance Features
- **Single API Call**: Only calculates once per drag session
- **Top 5 Limit**: Shows maximum 5 closest events to avoid clutter
- **Debounced**: Prevents multiple simultaneous API calls
- **Error Handling**: Graceful fallback if proximity calculation fails

## Benefits

1. **Improved Route Planning**: Users can visually identify closest events for efficient routing
2. **Reduced Travel Time**: Optimal event placement minimizes patient-to-patient travel
3. **Better User Experience**: Real-time visual feedback guides decision making
4. **Geographic Awareness**: Distance-based recommendations improve tour efficiency

## Configuration

### Backend Requirements
- Patient addresses must be stored in database
- Geocoding service for address-to-coordinate conversion
- Distance calculation algorithm (Haversine formula)
- Optional: Travel time estimation integration

### Frontend Configuration
- Badge colors customizable via Material-UI theme
- Maximum proximity results configurable (currently 5)
- Distance units configurable (km/miles)
- Tooltip format customizable

## User Workflow

### **🚀 Enhanced Drop-and-Persist Workflow**

1. User **drags an event** from Available Events list
2. **Drop event into tour** → Event gets assigned to tour
3. **Proximity badges appear** and **persist** showing the 5 closest events to the newly added event
4. **"NEW" badge** appears on the just-dropped event to identify it as the source
5. User can **visually assess** tour efficiency based on proximity data
6. **Planning continues**: User can add more events, each triggering new proximity calculations
7. **Manual clear**: Click "Clear Proximity" button to remove badges
8. **Auto-clear**: Badges disappear when events are removed or changes are saved

## Error Handling

### Graceful Degradation
- If proximity API fails: No badges shown, drag-and-drop still works
- If patient addresses missing: Event excluded from proximity calculation
- If geocoding fails: Large distance returned (999km) to deprioritize

### User Feedback
- Console logging for debugging proximity calculations
- Silent fallback maintains core functionality
- No error notifications for failed proximity (non-critical feature)

## Future Enhancements

1. **Travel Time Integration**: Show estimated driving time instead of straight-line distance
2. **Real-time Traffic**: Factor traffic conditions into proximity ranking  
3. **Custom Routing**: Integration with mapping services for actual route calculation
4. **Batch Optimization**: Suggest optimal sequence for multiple event additions
5. **Historical Data**: Learn from past successful tour patterns