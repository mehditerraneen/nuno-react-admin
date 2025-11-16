# Interactive Body Map Implementation

## Overview

This document describes the implementation of the interactive body map feature for wound management in the React Admin project. The implementation replicates the functionality from the Django template (`add_wound.html`) with modern React components.

## Architecture

### Components Hierarchy

```
WoundCreate
├── BodyMapViewer (Main container)
│   ├── SVG Body Diagram (loaded from /public/body-diagrams/)
│   ├── WoundMarker[] (Existing wounds)
│   ├── ZoomControls (Bottom-right)
│   ├── MiniMap (Bottom-left)
│   └── Instructions overlay (Top-left)
```

### Key Components

#### 1. BodyMapViewer (`src/components/wounds/BodyMapViewer.tsx`)

**Purpose**: Main interactive SVG viewer with zoom, pan, and click-to-create wound functionality

**Features**:
- SVG coordinate transformation (512x1024 viewBox)
- Mouse wheel zoom around cursor
- Drag mode for panning
- Click detection on anatomical zones
- Keyboard shortcuts (D, +, -, 0)
- Temporary wound marker display
- Existing wound markers rendering

**Props**:
```typescript
interface BodyMapViewerProps {
    patientGender: 'MALE' | 'FEMALE';
    bodyView: 'FRONT' | 'BACK';
    existingWounds: Wound[];
    onZoneClick?: (zone: string, x: number, y: number) => void;
    onWoundClick?: (woundId: number) => void;
    readOnly?: boolean;
}
```

**State Management**:
- `zoom`: Current zoom level (0.5 - 5.0)
- `panX`, `panY`: Pan offset coordinates
- `isDragging`: Drag mode active
- `dragMode`: Toggle between click/drag modes
- `tempMarker`: Temporary wound marker before confirmation

#### 2. WoundMarker (`src/components/wounds/WoundMarker.tsx`)

**Purpose**: Renders wound markers on the body map with status-based colors

**Features**:
- Color-coded by wound status:
  - ACTIVE: `#ff6b6b` (red)
  - HEALED: `#51cf66` (green)
  - INFECTED: `#ffa500` (orange)
  - IMPROVING: `#4dabf7` (blue)
  - STABLE: `#868e96` (gray)
- Hover effects with scale animation
- Drop shadow for depth
- Click handlers (single, double, right-click)
- Shows wound ID below marker

**Props**:
```typescript
interface WoundMarkerProps {
    wound: Wound;
    onClick?: () => void;
    onDoubleClick?: () => void;
    onRightClick?: () => void;
}
```

#### 3. ZoomControls (`src/components/wounds/ZoomControls.tsx`)

**Purpose**: Provides zoom and pan controls

**Features**:
- Zoom in/out buttons
- Reset zoom button
- Toggle drag mode button
- Zoom level percentage display
- Tooltips with keyboard shortcuts

**Props**:
```typescript
interface ZoomControlsProps {
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
    dragMode: boolean;
    onToggleDragMode: () => void;
}
```

#### 4. MiniMap (`src/components/wounds/MiniMap.tsx`)

**Purpose**: Miniature overview with viewport indicator

**Features**:
- Toggle visibility
- Shows full body diagram thumbnail
- Viewport rectangle indicator
- Click to navigate
- Drag viewport to pan
- Synchronized with main view

**Props**:
```typescript
interface MiniMapProps {
    svgPath: string;
    zoom: number;
    panX: number;
    panY: number;
    onNavigate: (x: number, y: number) => void;
}
```

#### 5. WoundPreviewCard (`src/components/wounds/WoundPreviewCard.tsx`)

**Purpose**: Hover tooltip showing wound details

**Features**:
- Displays wound ID, status, description
- Shows creation date and body area
- Evolution count display
- Action hints (click/double-click)
- Status-color coded chip

**Props**:
```typescript
interface WoundPreviewCardProps {
    wound: Wound;
}
```

#### 6. WoundCreate (`src/components/wounds/WoundCreate.tsx`)

**Purpose**: Wound creation form with interactive body map

**Features**:
- Patient selection (required)
- Toggle between FRONT/BACK views
- Interactive body map for location selection
- Confirmation dialog before saving
- Automatic body area detection
- Coordinate storage in hidden fields

**Workflow**:
1. User selects patient
2. Body map becomes active
3. User toggles view (front/back)
4. User clicks on body diagram
5. Confirmation dialog shows detected area
6. User confirms and fills additional details
7. Form submits with coordinates

## Utilities

### Body Zone Mapping (`src/utils/bodyZoneMapping.ts`)

**Purpose**: Maps SVG coordinates to anatomical body areas

**Key Functions**:

```typescript
// Determine left/right based on X coordinate
getSideFromCoordinate(x: number): 'LEFT' | 'RIGHT' | 'CENTER'

// Get body region from Y coordinate
getRegionFromCoordinate(y: number): 'HEAD' | 'TORSO' | 'ARM' | 'LEG' | 'HAND' | 'FOOT'

// Map coordinates to specific body area (FRONT view)
mapCoordinatesToBodyAreaFront(x: number, y: number): string

// Map coordinates to specific body area (BACK view)
mapCoordinatesToBodyAreaBack(x: number, y: number): string

// Main mapping function
mapCoordinatesToBodyArea(x: number, y: number, bodyView: 'FRONT' | 'BACK'): string

// Validate coordinates within viewBox
validateCoordinates(x: number, y: number): boolean

// Get all possible body areas
getAllBodyAreas(): string[]
```

**Coordinate System**:
- ViewBox: 512 x 1024 pixels
- Center line: x = 256
- Medical convention: Left/Right from patient's perspective
- 80+ anatomical zones mapped

**Body Areas Examples**:
- Head: Forehead, Eyes, Nose, Cheeks, Chin
- Torso: Shoulders, Chest, Abdomen, Hips, Pelvis
- Arms: Upper Arm, Forearm, Hand
- Legs: Thigh, Knee, Lower Leg, Foot
- Back: Upper Back, Mid Back, Lower Back, Buttocks

## SVG Assets

**Location**: `/public/body-diagrams/`

**Files**:
- `male_zones_interactives.svg` - Male body diagram
- `female_zones_interactives.svg` - Female body diagram
- Additional diagrams: `body-front.svg`, `body-back.svg`, etc.

**ViewBox**: 512 x 1024 (all diagrams use same coordinate system)

**SVG Structure**:
```xml
<svg viewBox="0 0 512 1024">
    <path id="zone_male_front" ... />
    <path id="zone_male_back" ... />
    <text>Vue avant</text>
    <text>Vue arrière</text>
</svg>
```

## Coordinate Transformation

### Client to SVG Coordinates

**Algorithm**:
```typescript
const clientToSVGCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const rect = containerRef.current.getBoundingClientRect();

    // Create SVG point
    const point = svg.createSVGPoint();
    point.x = clientX - rect.left;
    point.y = clientY - rect.top;

    // Transform using inverse CTM (Current Transform Matrix)
    const ctm = svg.getScreenCTM();
    const transformedPoint = point.matrixTransform(ctm.inverse());

    return {
        x: Math.round(transformedPoint.x),
        y: Math.round(transformedPoint.y)
    };
};
```

**Why This Works**:
- SVG maintains internal coordinate system (viewBox)
- Screen rendering may differ (zoom, pan, viewport size)
- `getScreenCTM()` returns transformation matrix from SVG coords to screen coords
- `.inverse()` gives us screen → SVG transformation
- `matrixTransform()` applies the transformation to the point

### Zoom Around Cursor

**Algorithm**:
```typescript
const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.9 : 1.1; // 10% zoom steps
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom * delta));

    const rect = containerRef.current.getBoundingClientRect();

    // Calculate cursor position relative to current viewport
    const centerX = (e.clientX - rect.left) / zoom;
    const centerY = (e.clientY - rect.top) / zoom;

    // Adjust pan to keep cursor position fixed
    setPanX((panX - centerX) * (newZoom / zoom) + centerX);
    setPanY((panY - centerY) * (newZoom / zoom) + centerY);
    setZoom(newZoom);
};
```

**Why This Works**:
- Calculates cursor position in unzoomed coordinates
- Scales pan offsets proportionally to zoom change
- Re-centers viewport so cursor stays at same visual position

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `D` | Toggle drag mode |
| `+` or `=` | Zoom in |
| `-` or `_` | Zoom out |
| `0` | Reset zoom |
| `M` | Toggle minimap (planned) |

## User Workflow

### Creating a Wound

1. **Navigate to Wounds**
   - Click "Gestion des plaies" in sidebar
   - Click "CREATE" button

2. **Select Patient**
   - Choose patient from autocomplete
   - Body map activates after selection

3. **Choose View**
   - Toggle between "Front View" and "Back View"
   - SVG updates to show appropriate diagram

4. **Navigate**
   - Mouse wheel to zoom
   - Press 'D' to enable drag mode
   - Click and drag to pan
   - Use minimap for quick navigation

5. **Mark Wound Location**
   - Press 'D' again to switch back to click mode
   - Click on desired body location
   - Temporary red pulsing marker appears

6. **Confirm Location**
   - Dialog shows detected body area
   - Review coordinates and view
   - Click "Confirm Location"

7. **Add Details**
   - Description autofilled with location
   - Add custom description
   - Set initial status (default: ACTIVE)
   - Submit form

8. **Result**
   - Redirected to wound detail page
   - Wound marked on body map
   - Ready to add evolutions and images

### Viewing Existing Wounds

1. **Wound List**
   - Color-coded status badges
   - Evolution count displayed
   - Click row to view details

2. **Wound Detail**
   - Shows wound marker on body map
   - Can zoom/pan to inspect location
   - Evolution timeline
   - Image gallery

3. **Wound Map Interaction**
   - Hover over marker: Shows preview card
   - Single click: View wound detail
   - Double click: Edit wound
   - Right click: Context menu (planned)

## Technical Decisions

### Why SVG over Canvas?

**Chosen**: SVG with React components

**Reasons**:
1. **Declarative**: React components map naturally to SVG elements
2. **DOM Access**: Easy event handling and hover effects
3. **Scalability**: Vector graphics scale infinitely
4. **Accessibility**: Screen readers can access SVG structure
5. **Styling**: CSS works directly on SVG elements
6. **Debugging**: Easy to inspect in browser dev tools

### Why Not Use SVG.js Library?

**Django used**: SVG.js 3.2.0

**React uses**: Native SVG with React

**Reasons**:
1. **Bundle Size**: Native SVG adds no dependencies
2. **React Integration**: Better integration with React ecosystem
3. **Performance**: Fewer abstraction layers
4. **Type Safety**: Full TypeScript support
5. **Simplicity**: Less API surface to learn

### State Management

**Chosen**: Local component state with React hooks

**Reasons**:
1. **Scope**: Body map state is local to creation/editing
2. **Simplicity**: No global state needed
3. **Performance**: Re-renders isolated to body map components
4. **Testing**: Easier to test isolated components

### Coordinate Storage

**Chosen**: Store raw X,Y coordinates + body_view

**Reasons**:
1. **Precision**: Exact wound location preserved
2. **Flexibility**: Can regenerate body_area name if mapping improves
3. **Auditing**: Original click location recorded
4. **Migration**: If coordinate system changes, can re-map

## Testing Considerations

### Unit Tests

**Components to Test**:
- `bodyZoneMapping.ts` functions
  - Coordinate ranges
  - Edge cases (boundaries)
  - Left/right determination
  - Body area names

- `BodyMapViewer` component
  - Click detection
  - Coordinate transformation
  - Zoom calculations
  - Pan limits

### Integration Tests

**Scenarios to Test**:
1. Create wound with body map selection
2. View wound with marker on map
3. Edit wound and update location
4. Multiple wounds on same body diagram
5. Zoom/pan persistence across views

### E2E Tests (Playwright)

**Test Cases**:
```typescript
test('should create wound with body map', async ({ page }) => {
  await page.goto('/wounds/create');
  await page.selectOption('[name="patient"]', '622');
  await page.click('text=Front View');

  // Click on body diagram
  const svg = page.locator('svg[viewBox="0 0 512 1024"]');
  await svg.click({ position: { x: 200, y: 400 } });

  // Confirm location
  await page.click('text=Confirm Location');

  // Verify body area detected
  await expect(page.locator('[name="body_area"]')).toHaveValue('Right Abdomen');
});
```

## Performance Optimization

### Current Optimizations

1. **Memoization**
   - useCallback for event handlers
   - Prevent unnecessary re-renders

2. **Lazy Loading**
   - SVG diagrams loaded only when needed
   - MiniMap rendered only when visible

3. **Event Throttling**
   - Mouse wheel events naturally throttled by browser
   - Pan updates use requestAnimationFrame (implicit via style updates)

### Future Optimizations

1. **Virtual Scrolling** (if many wounds)
2. **Web Workers** for coordinate calculations
3. **SVG Sprite Sheets** to reduce HTTP requests
4. **Progressive Loading** for large wound datasets

## Known Limitations

1. **Touch Gestures**: Pinch-to-zoom not yet implemented
2. **Mobile UX**: Small screen optimization needed
3. **Right-Click Menu**: Context menu not implemented
4. **Wound Dragging**: Can't drag existing wound markers
5. **Undo/Redo**: No history for zoom/pan operations
6. **Keyboard Navigation**: No keyboard-only wound selection

## Future Enhancements

1. **Touch Support**
   - Pinch-to-zoom gesture
   - Two-finger pan
   - Long-press for context menu

2. **Advanced Markers**
   - Wound size visualization (circle radius)
   - Status change animations
   - Clustered markers for nearby wounds

3. **Measurement Tools**
   - Ruler tool for distances
   - Area measurement
   - Wound size estimation

4. **3D Body Model**
   - Three.js 3D body visualization
   - Rotate to find exact location
   - More intuitive for complex anatomies

5. **AI Assistance**
   - Image recognition from wound photos
   - Auto-suggest body area from photo
   - Wound classification hints

6. **Collaboration Features**
   - Real-time marker updates
   - Comments on specific locations
   - Wound location suggestions from team

## References

### Django Template

- **File**: `/medical/templates/medical/add_wound.html`
- **Lines**: 3,243 total
- **Key sections**:
  - Lines 800-900: SVG.js setup
  - Lines 1000-1100: Zoom/pan logic
  - Lines 1200-1400: Wound marker creation
  - Lines 1600-1800: Coordinate mapping

### Libraries Used

- **React Admin v5.8.0**: Admin panel framework
- **Material-UI v7**: UI components
- **React 19**: UI library
- **TypeScript**: Type safety

### Documentation

- [SVG Coordinate Systems](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Positions)
- [React Admin Create Component](https://marmelab.com/react-admin/Create.html)
- [Material-UI Dialog](https://mui.com/material-ui/react-dialog/)

## Maintenance

### Updating Body Areas

To add/modify body areas:

1. Edit `src/utils/bodyZoneMapping.ts`
2. Update coordinate ranges in mapping functions
3. Add new area names to `getAllBodyAreas()`
4. Update tests
5. Re-run E2E tests to verify

### Updating SVG Diagrams

To replace body diagrams:

1. Place new SVG in `/public/body-diagrams/`
2. Ensure viewBox is `0 0 512 1024`
3. Update `BodyMapViewer.getSvgPath()` if needed
4. Test coordinate mapping still works
5. Update documentation if coordinate system changed

### Troubleshooting

**Issue**: Clicks not detecting zones
- **Check**: SVG has `id` attributes on paths
- **Check**: Click event not being stopped by other elements
- **Solution**: Ensure `pointer-events: all` on SVG paths

**Issue**: Coordinates incorrect
- **Check**: ViewBox matches 512x1024
- **Check**: SVG transform applied correctly
- **Solution**: Log transformed coordinates and compare with SVG editor

**Issue**: Zoom not centered on cursor
- **Check**: Container bounding rect calculation
- **Check**: CTM inverse transform
- **Solution**: Verify rect is from container, not SVG element

## Contributors

- Initial implementation based on Django template by original team
- React port and enhancements by Claude Code
- Body area mapping logic adapted from Django template

## License

Copyright © 2025 InurSurLu Healthcare Management System
