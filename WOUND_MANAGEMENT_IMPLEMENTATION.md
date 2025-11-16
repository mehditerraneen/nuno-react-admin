# Wound Management Implementation Guide

## Overview

This guide details the complete implementation of the wound management system in nuno-react-admin, based on the existing Django implementation in inur.django.

## ✅ Completed Setup

1. **TypeScript Types** - `/src/types/wounds.ts`
   - Complete type definitions for Wound, WoundEvolution, WoundImage
   - UI-specific types for body map interaction
   - 80+ anatomical body areas with French labels
   - All enums and constants

2. **Data Provider Extensions** - `/src/dataProvider.ts`
   - `getPatientWounds(patientId)` - Fetch all wounds for a patient
   - `getWoundEvolutions(woundId)` - Fetch evolution history
   - `createWoundEvolution(woundId, data)` - Add evolution entry
   - `updateWoundEvolution(woundId, evolutionId, data)` - Update evolution
   - `deleteWoundEvolution(woundId, evolutionId)` - Delete evolution
   - `getWoundImages(woundId)` - Fetch wound images
   - `uploadWoundImage(woundId, file, evolutionId?, comment?)` - Upload photo
   - `deleteWoundImage(woundId, imageId)` - Delete image
   - `getWoundStatistics(patientId?)` - Get statistics
   - `getPatientWoundDiagram(patientId)` - Get SVG diagram

3. **NPM Dependencies Installed**
   - `react-zoom-pan-pinch` - For pan/zoom functionality
   - `@tippyjs/react` - For tooltips
   - `react-hook-form` - Already installed (for forms)

## 📋 Implementation Roadmap

### Phase 1: Core Components (Priority)

#### 1.1 WoundList Component
**File:** `src/components/wounds/WoundList.tsx`

```tsx
import { List, Datagrid, TextField, DateField, ReferenceField, FunctionField, FilterButton, TopToolbar, CreateButton, ChipField } from 'react-admin';
import { Box, Chip } from '@mui/material';
import { STATUS_LABELS, type WoundStatus } from '../../types/wounds';

const WoundListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
  </TopToolbar>
);

const statusColors: Record<WoundStatus, 'warning' | 'success' | 'error' | 'default'> = {
  ACTIVE: 'warning',
  HEALED: 'success',
  INFECTED: 'error',
  ARCHIVED: 'default',
};

export const WoundList = () => (
  <List
    actions={<WoundListActions />}
    filters={[
      // Add filters here
    ]}
  >
    <Datagrid rowClick="show">
      <TextField source="id" label="ID" />
      <ReferenceField source="patient" reference="patients" label="Patient">
        <TextField source="name" />
      </ReferenceField>
      <TextField source="body_area" label="Zone" />
      <FunctionField
        label="Statut"
        render={(record: any) => (
          <Chip
            label={STATUS_LABELS[record.status as WoundStatus]}
            color={statusColors[record.status as WoundStatus]}
            size="small"
          />
        )}
      />
      <DateField source="date_created" label="Date création" />
      <FunctionField
        label="Évolutions"
        render={(record: any) => (
          <Chip label={record.evolution_count || 0} size="small" variant="outlined" />
        )}
      />
    </Datagrid>
  </List>
);
```

**Features to add:**
- Patient filter (AutocompleteInput)
- Status filter (SelectInput)
- Date range filter
- Body area filter
- Bulk delete action

---

#### 1.2 WoundCreate Component
**File:** `src/components/wounds/WoundCreate.tsx`

This is the most complex component. It needs:
- Interactive SVG body map
- Click-based wound creation
- Label-based creation mode
- Zoom/pan controls
- Minimap
- Wound preview list

**Key sub-components needed:**
- `BodyMapViewer` - Main interactive SVG viewer
- `WoundMarker` - Individual wound markers on map
- `AnatomicalLabels` - Clickable region labels
- `MiniMap` - Navigation minimap
- `ZoomControls` - Zoom in/out/reset buttons

**Basic structure:**
```tsx
import { Create, SimpleForm, TextInput, required, useDataProvider, useNotify } from 'react-admin';
import { Box, Grid, Paper } from '@mui/material';
import { BodyMapViewer } from './BodyMapViewer';
import { useState } from 'react';

export const WoundCreate = () => {
  const [selectedPoint, setSelectedPoint] = useState<{x: number; y: number; body_area: string} | null>(null);
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const handleBodyMapClick = (x: number, y: number, body_area: string, body_view: string) => {
    setSelectedPoint({ x, y, body_area, body_view });
  };

  return (
    <Create>
      <SimpleForm>
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Paper>
              <BodyMapViewer
                patient_id={/* get from form */}
                gender={/* get from patient */}
                onPointClick={handleBodyMapClick}
                existingWounds={[]}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={5}>
            <TextInput source="description" multiline rows={4} validate={required()} fullWidth />
            {/* Add other fields */}
          </Grid>
        </Grid>
      </SimpleForm>
    </Create>
  );
};
```

---

#### 1.3 WoundShow Component
**File:** `src/components/wounds/WoundShow.tsx`

**Features:**
- Wound details display
- Evolution timeline (chronological list)
- Trend indicators (improving/stable/worsening)
- Size change calculations
- Image gallery
- Actions: Add evolution, Upload image, Edit, Delete

**Basic structure:**
```tsx
import {
  Show,
  SimpleShowLayout,
  TextField,
  DateField,
  ReferenceField,
  FunctionField,
  useRecordContext,
  useDataProvider,
  Button,
  TopToolbar,
  EditButton
} from 'react-admin';
import { Box, Card, CardContent, Typography, Chip, Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot } from '@mui/material';
import { useState, useEffect } from 'react';
import { WoundEvolutionDialog } from './WoundEvolutionDialog';
import { WoundImageGallery } from './WoundImageGallery';

export const WoundShow = () => {
  const [evolutions, setEvolutions] = useState([]);
  const [showEvolutionDialog, setShowEvolutionDialog] = useState(false);
  const dataProvider = useDataProvider();
  const record = useRecordContext();

  useEffect(() => {
    if (record?.id) {
      dataProvider.getWoundEvolutions(record.id).then(response => {
        setEvolutions(response.data);
      });
    }
  }, [record?.id]);

  return (
    <Show>
      <SimpleShowLayout>
        {/* Wound details */}
        <ReferenceField source="patient" reference="patients" />
        <TextField source="body_area" />
        <TextField source="status" />
        <DateField source="date_created" />

        {/* Evolution Timeline */}
        <FunctionField
          label="Évolution"
          render={() => (
            <Box>
              <Button onClick={() => setShowEvolutionDialog(true)}>
                Ajouter une évolution
              </Button>

              <Timeline>
                {evolutions.map(evolution => (
                  <TimelineItem key={evolution.id}>
                    <TimelineSeparator>
                      <TimelineDot color={getTrendColor(evolution.trend_indicator)} />
                      <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent>
                      <Card>
                        <CardContent>
                          <Typography variant="body2">{evolution.observations}</Typography>
                          {/* Display size changes, trend, etc. */}
                        </CardContent>
                      </Card>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </Box>
          )}
        />

        {/* Image Gallery */}
        <WoundImageGallery woundId={record?.id} />
      </SimpleShowLayout>

      <WoundEvolutionDialog
        open={showEvolutionDialog}
        onClose={() => setShowEvolutionDialog(false)}
        woundId={record?.id}
        onSuccess={() => {/* refresh evolutions */}}
      />
    </Show>
  );
};
```

---

#### 1.4 WoundEdit Component
**File:** `src/components/wounds/WoundEdit.tsx`

Simple edit form for wound details:
```tsx
import { Edit, SimpleForm, TextInput, SelectInput, required } from 'react-admin';
import { STATUS_LABELS } from '../../types/wounds';

export const WoundEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="description" multiline rows={4} validate={required()} fullWidth />
      <SelectInput
        source="status"
        choices={Object.entries(STATUS_LABELS).map(([value, label]) => ({ id: value, name: label }))}
        validate={required()}
      />
    </SimpleForm>
  </Edit>
);
```

---

### Phase 2: Body Map Components

#### 2.1 BodyMapViewer Component
**File:** `src/components/wounds/BodyMapViewer.tsx`

**Core functionality:**
- Load gender-specific SVG diagrams (male/female)
- Display front/back views
- Pan/zoom with `react-zoom-pan-pinch`
- Click handling for wound placement
- Display existing wounds as markers
- Toggle between click mode and drag mode
- Keyboard shortcuts (±, 0, d, c, m, l)

**Required props:**
```typescript
interface BodyMapViewerProps {
  patient_id: number;
  gender: 'male' | 'female';
  onPointClick?: (x: number, y: number, body_area: string, body_view: BodyView) => void;
  existingWounds?: Wound[];
  interactive?: boolean; // Enable/disable click handling
  showLabels?: boolean; // Show anatomical labels
  showMinimap?: boolean; // Show minimap
}
```

**Implementation skeleton:**
```tsx
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Box, IconButton, ButtonGroup, ToggleButton } from '@mui/material';
import { ZoomIn, ZoomOut, RestartAlt, PanTool, TouchApp } from '@mui/icons-material';
import { useState, useRef, useEffect } from 'react';
import { WoundMarker } from './WoundMarker';
import { AnatomicalLabels } from './AnatomicalLabels';
import { MiniMap } from './MiniMap';

export const BodyMapViewer = ({ patient_id, gender, onPointClick, existingWounds = [], interactive = true }: BodyMapViewerProps) => {
  const [view, setView] = useState<'FRONT' | 'BACK'>('FRONT');
  const [mode, setMode] = useState<'click' | 'drag'>('click');
  const [showLabels, setShowLabels] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const transformRef = useRef(null);

  // SVG viewBox: 512x1024
  const SVG_WIDTH = 512;
  const SVG_HEIGHT = 1024;
  const CENTER_LINE = 185; // X coordinate for left/right detection

  const handleSvgClick = (event: React.MouseEvent<SVGElement>) => {
    if (!interactive || mode !== 'click') return;

    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const svgPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());

    const x = Math.round(svgPoint.x);
    const y = Math.round(svgPoint.y);

    // Determine body area based on coordinates
    const body_area = detectBodyArea(x, y, view);

    onPointClick?.(x, y, body_area, view);
  };

  const detectBodyArea = (x: number, y: number, view: BodyView): string => {
    // Implement coordinate-to-body-area mapping logic
    // This is complex - see Phase 3 for full implementation
    return 'CHEST'; // Placeholder
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch(e.key) {
        case '+':
          transformRef.current?.zoomIn();
          break;
        case '-':
          transformRef.current?.zoomOut();
          break;
        case '0':
          transformRef.current?.resetTransform();
          break;
        case 'd':
          setMode('drag');
          break;
        case 'c':
          setMode('click');
          break;
        case 'm':
          setShowMinimap(prev => !prev);
          break;
        case 'l':
          setShowLabels(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '800px' }}>
      {/* Zoom Controls */}
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <ButtonGroup orientation="vertical">
          <IconButton onClick={() => transformRef.current?.zoomIn()}>
            <ZoomIn />
          </IconButton>
          <IconButton onClick={() => transformRef.current?.zoomOut()}>
            <ZoomOut />
          </IconButton>
          <IconButton onClick={() => transformRef.current?.resetTransform()}>
            <RestartAlt />
          </IconButton>
        </ButtonGroup>
      </Box>

      {/* Mode Toggle */}
      <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
        <ButtonGroup>
          <ToggleButton
            value="click"
            selected={mode === 'click'}
            onChange={() => setMode('click')}
          >
            <TouchApp /> Click
          </ToggleButton>
          <ToggleButton
            value="drag"
            selected={mode === 'drag'}
            onChange={() => setMode('drag')}
          >
            <PanTool /> Drag
          </ToggleButton>
        </ButtonGroup>
      </Box>

      {/* Transform Wrapper */}
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.5}
        maxScale={3}
        panning={{ disabled: mode === 'click' }}
      >
        <TransformComponent>
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            width={SVG_WIDTH}
            height={SVG_HEIGHT}
            onClick={handleSvgClick}
          >
            {/* Load SVG content */}
            <image
              href={`/body-diagrams/${gender}-${view.toLowerCase()}.svg`}
              width={SVG_WIDTH}
              height={SVG_HEIGHT}
            />

            {/* Render wound markers */}
            {existingWounds.filter(w => w.body_view === view).map((wound, index) => (
              <WoundMarker
                key={wound.id}
                x={wound.x_position}
                y={wound.y_position}
                label={(index + 1).toString()}
                status={wound.status}
                onClick={() => {/* navigate to wound detail */}}
              />
            ))}

            {/* Render anatomical labels */}
            {showLabels && <AnatomicalLabels view={view} onLabelClick={(area) => {/* handle label click */}} />}
          </svg>
        </TransformComponent>
      </TransformWrapper>

      {/* Minimap */}
      {showMinimap && (
        <MiniMap
          wounds={existingWounds}
          currentView={view}
          svgWidth={SVG_WIDTH}
          svgHeight={SVG_HEIGHT}
        />
      )}
    </Box>
  );
};
```

---

#### 2.2 WoundMarker Component
**File:** `src/components/wounds/WoundMarker.tsx`

```tsx
interface WoundMarkerProps {
  x: number;
  y: number;
  label: string;
  status: WoundStatus;
  onClick?: () => void;
}

export const WoundMarker = ({ x, y, label, status, onClick }: WoundMarkerProps) => {
  const colors = {
    ACTIVE: '#ff9800',
    HEALED: '#4caf50',
    INFECTED: '#f44336',
    ARCHIVED: '#9e9e9e',
  };

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <circle
        cx={x}
        cy={y}
        r={20}
        fill={colors[status]}
        stroke="#fff"
        strokeWidth={2}
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={14}
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  );
};
```

---

#### 2.3 AnatomicalLabels Component
**File:** `src/components/wounds/AnatomicalLabels.tsx`

```tsx
import { BODY_AREAS, type BodyView } from '../../types/wounds';

interface AnatomicalLabelsProps {
  view: BodyView;
  onLabelClick: (area_code: string, area_name: string, x: number, y: number) => void;
}

// Predefined label positions for each anatomical region
const LABEL_POSITIONS_FRONT = [
  { code: 'HEAD', x: 256, y: 80, label: 'Tête' },
  { code: 'NECK', x: 256, y: 140, label: 'Cou' },
  { code: 'SHOULDER_LEFT', x: 150, y: 180, label: 'Épaule G' },
  { code: 'SHOULDER_RIGHT', x: 362, y: 180, label: 'Épaule D' },
  { code: 'CHEST', x: 256, y: 240, label: 'Poitrine' },
  // ... 40+ total labels
];

const LABEL_POSITIONS_BACK = [
  { code: 'SHOULDER-BACK-LEFT', x: 150, y: 180, label: 'Épaule G (Dos)' },
  { code: 'SHOULDER-BACK-RIGHT', x: 362, y: 180, label: 'Épaule D (Dos)' },
  { code: 'BACK-UPPER', x: 256, y: 240, label: 'Dos supérieur' },
  // ... more labels
];

export const AnatomicalLabels = ({ view, onLabelClick }: AnatomicalLabelsProps) => {
  const labels = view === 'FRONT' ? LABEL_POSITIONS_FRONT : LABEL_POSITIONS_BACK;

  return (
    <g className="anatomical-labels">
      {labels.map(({ code, x, y, label }) => (
        <g
          key={code}
          onClick={() => onLabelClick(code, label, x, y)}
          style={{ cursor: 'pointer' }}
        >
          <rect
            x={x - 50}
            y={y - 15}
            width={100}
            height={30}
            fill="rgba(33, 150, 243, 0.9)"
            rx={4}
            className="label-background"
          />
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff"
            fontSize={12}
          >
            {label}
          </text>
        </g>
      ))}
    </g>
  );
};
```

---

### Phase 3: Dialog Components

#### 3.1 WoundEvolutionDialog Component
**File:** `src/components/wounds/WoundEvolutionDialog.tsx`

```tsx
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useDataProvider, useNotify } from 'react-admin';
import { EVOLUTION_TYPE_LABELS, SEVERITY_LABELS } from '../../types/wounds';

interface WoundEvolutionDialogProps {
  open: boolean;
  onClose: () => void;
  woundId: number;
  onSuccess: () => void;
  evolution?: any; // For editing existing evolution
}

export const WoundEvolutionDialog = ({ open, onClose, woundId, onSuccess, evolution }: WoundEvolutionDialogProps) => {
  const { control, handleSubmit } = useForm({
    defaultValues: evolution || {
      evolution_type: 'PROGRESS',
      observations: '',
      severity: '',
      size_length_mm: '',
      size_width_mm: '',
      size_depth_mm: '',
      treatment_applied: '',
      recorded_by: '',
    },
  });

  const dataProvider = useDataProvider();
  const notify = useNotify();

  const onSubmit = async (data: any) => {
    try {
      if (evolution) {
        await dataProvider.updateWoundEvolution(woundId, evolution.id, data);
        notify('Évolution mise à jour', { type: 'success' });
      } else {
        await dataProvider.createWoundEvolution(woundId, data);
        notify('Évolution créée', { type: 'success' });
      }
      onSuccess();
      onClose();
    } catch (error) {
      notify('Erreur lors de la sauvegarde', { type: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{evolution ? 'Modifier' : 'Ajouter'} une évolution</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Controller
            name="evolution_type"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth margin="normal">
                <InputLabel>Type</InputLabel>
                <Select {...field}>
                  {Object.entries(EVOLUTION_TYPE_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />

          <Controller
            name="observations"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Observations"
                multiline
                rows={4}
                fullWidth
                margin="normal"
              />
            )}
          />

          {/* Add all other fields: severity, measurements, treatment, etc. */}

        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="contained">Enregistrer</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
```

---

#### 3.2 WoundImageGallery Component
**File:** `src/components/wounds/WoundImageGallery.tsx`

```tsx
import { Box, ImageList, ImageListItem, ImageListItemBar, IconButton, Dialog } from '@mui/material';
import { Delete, ZoomIn } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useDataProvider, useNotify } from 'react-admin';

interface WoundImageGalleryProps {
  woundId: number;
}

export const WoundImageGallery = ({ woundId }: WoundImageGalleryProps) => {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const dataProvider = useDataProvider();
  const notify = useNotify();

  useEffect(() => {
    if (woundId) {
      loadImages();
    }
  }, [woundId]);

  const loadImages = async () => {
    try {
      const response = await dataProvider.getWoundImages(woundId);
      setImages(response);
    } catch (error) {
      notify('Erreur lors du chargement des images', { type: 'error' });
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm('Supprimer cette image ?')) return;

    try {
      await dataProvider.deleteWoundImage(woundId, imageId);
      notify('Image supprimée', { type: 'success' });
      loadImages();
    } catch (error) {
      notify('Erreur lors de la suppression', { type: 'error' });
    }
  };

  return (
    <Box>
      <ImageList cols={3} gap={8}>
        {images.map((image) => (
          <ImageListItem key={image.id}>
            <img
              src={image.image}
              alt={image.comment || 'Wound photo'}
              loading="lazy"
              onClick={() => setSelectedImage(image.image)}
            />
            <ImageListItemBar
              actionIcon={
                <>
                  <IconButton onClick={() => setSelectedImage(image.image)}>
                    <ZoomIn />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(image.id)}>
                    <Delete />
                  </IconButton>
                </>
              }
            />
          </ImageListItem>
        ))}
      </ImageList>

      {/* Full-screen image dialog */}
      <Dialog open={!!selectedImage} onClose={() => setSelectedImage(null)} maxWidth="lg">
        <img src={selectedImage || ''} alt="Wound photo" style={{ width: '100%' }} />
      </Dialog>
    </Box>
  );
};
```

---

### Phase 4: Utility Functions

#### 4.1 Coordinate Mapping Utilities
**File:** `src/utils/woundCoordinates.ts`

```typescript
import { BodyView, BodyAreaCode, BODY_AREAS } from '../types/wounds';

const SVG_WIDTH = 512;
const SVG_HEIGHT = 1024;
const CENTER_LINE = 185; // Visual midline for left/right detection

interface BodyRegion {
  area_code: BodyAreaCode;
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  view: BodyView;
}

// Comprehensive body region mappings
const BODY_REGIONS: BodyRegion[] = [
  // Front view - Head and neck
  { area_code: 'HEAD', x_min: 180, x_max: 332, y_min: 0, y_max: 120, view: 'FRONT' },
  { area_code: 'NECK', x_min: 200, x_max: 312, y_min: 120, y_max: 160, view: 'FRONT' },

  // Front view - Shoulders
  { area_code: 'SHOULDER_LEFT', x_min: 80, x_max: CENTER_LINE, y_min: 160, y_max: 220, view: 'FRONT' },
  { area_code: 'SHOULDER_RIGHT', x_min: CENTER_LINE, x_max: 432, y_min: 160, y_max: 220, view: 'FRONT' },

  // Front view - Torso
  { area_code: 'CHEST', x_min: 150, x_max: 362, y_min: 220, y_max: 340, view: 'FRONT' },
  { area_code: 'STOMACH', x_min: 170, x_max: 342, y_min: 340, y_max: 420, view: 'FRONT' },
  { area_code: 'ABDOMEN', x_min: 180, x_max: 332, y_min: 420, y_max: 500, view: 'FRONT' },

  // Front view - Arms (left)
  { area_code: 'ARM_LEFT', x_min: 40, x_max: CENTER_LINE, y_min: 220, y_max: 380, view: 'FRONT' },
  { area_code: 'FOREARM_LEFT', x_min: 50, x_max: CENTER_LINE, y_min: 380, y_max: 540, view: 'FRONT' },
  { area_code: 'HAND_LEFT', x_min: 60, x_max: CENTER_LINE, y_min: 540, y_max: 640, view: 'FRONT' },

  // Front view - Arms (right)
  { area_code: 'ARM_RIGHT', x_min: CENTER_LINE, x_max: 472, y_min: 220, y_max: 380, view: 'FRONT' },
  { area_code: 'FOREARM_RIGHT', x_min: CENTER_LINE, x_max: 462, y_min: 380, y_max: 540, view: 'FRONT' },
  { area_code: 'HAND_RIGHT', x_min: CENTER_LINE, x_max: 452, y_min: 540, y_max: 640, view: 'FRONT' },

  // Front view - Legs (left)
  { area_code: 'THIGH_LEFT', x_min: 140, x_max: CENTER_LINE + 20, y_min: 500, y_max: 680, view: 'FRONT' },
  { area_code: 'KNEE_LEFT', x_min: 150, x_max: CENTER_LINE + 15, y_min: 680, y_max: 740, view: 'FRONT' },
  { area_code: 'SHIN_LEFT', x_min: 155, x_max: CENTER_LINE + 10, y_min: 740, y_max: 920, view: 'FRONT' },
  { area_code: 'FOOT_LEFT', x_min: 145, x_max: CENTER_LINE + 20, y_min: 920, y_max: 1024, view: 'FRONT' },

  // Front view - Legs (right)
  { area_code: 'THIGH_RIGHT', x_min: CENTER_LINE - 20, x_max: 372, y_min: 500, y_max: 680, view: 'FRONT' },
  { area_code: 'KNEE_RIGHT', x_min: CENTER_LINE - 15, x_max: 362, y_min: 680, y_max: 740, view: 'FRONT' },
  { area_code: 'SHIN_RIGHT', x_min: CENTER_LINE - 10, x_max: 357, y_min: 740, y_max: 920, view: 'FRONT' },
  { area_code: 'FOOT_RIGHT', x_min: CENTER_LINE - 20, x_max: 367, y_min: 920, y_max: 1024, view: 'FRONT' },

  // Back view regions
  { area_code: 'HEAD', x_min: 180, x_max: 332, y_min: 0, y_max: 120, view: 'BACK' },
  { area_code: 'NECK', x_min: 200, x_max: 312, y_min: 120, y_max: 160, view: 'BACK' },
  { area_code: 'SHOULDER-BACK-LEFT', x_min: 80, x_max: CENTER_LINE, y_min: 160, y_max: 220, view: 'BACK' },
  { area_code: 'SHOULDER-BACK-RIGHT', x_min: CENTER_LINE, x_max: 432, y_min: 160, y_max: 220, view: 'BACK' },
  { area_code: 'BACK-UPPER', x_min: 150, x_max: 362, y_min: 220, y_max: 340, view: 'BACK' },
  { area_code: 'BACK-MIDDLE', x_min: 170, x_max: 342, y_min: 340, y_max: 420, view: 'BACK' },
  { area_code: 'BACK-LOWER', x_min: 180, x_max: 332, y_min: 420, y_max: 500, view: 'BACK' },
  { area_code: 'BUTT_LEFT', x_min: 180, x_max: CENTER_LINE + 20, y_min: 480, y_max: 560, view: 'BACK' },
  { area_code: 'BUTT_RIGHT', x_min: CENTER_LINE - 20, x_max: 332, y_min: 480, y_max: 560, view: 'BACK' },

  // ... Add remaining back view regions
];

/**
 * Detect body area based on clicked coordinates
 */
export function detectBodyArea(x: number, y: number, view: BodyView): BodyAreaCode {
  // Find matching region
  for (const region of BODY_REGIONS) {
    if (
      region.view === view &&
      x >= region.x_min &&
      x <= region.x_max &&
      y >= region.y_min &&
      y <= region.y_max
    ) {
      return region.area_code;
    }
  }

  // Fallback to generic areas based on Y coordinate
  if (y < 160) return 'HEAD';
  if (y < 500) return view === 'FRONT' ? 'CHEST' : 'BACK-UPPER';
  if (y < 740) return x < CENTER_LINE ? 'THIGH_LEFT' : 'THIGH_RIGHT';
  return x < CENTER_LINE ? 'SHIN_LEFT' : 'SHIN_RIGHT';
}

/**
 * Get French label for body area
 */
export function getBodyAreaLabel(area_code: BodyAreaCode): string {
  return BODY_AREAS[area_code] || area_code;
}
```

---

### Phase 5: Registration

#### 5.1 Register Wounds Resource
**File:** `src/App.tsx`

Add to the Admin component:

```tsx
import { WoundList, WoundCreate, WoundEdit, WoundShow } from './components/wounds';

// Inside <Admin>
<Resource
  name="wounds"
  list={WoundList}
  create={WoundCreate}
  edit={WoundEdit}
  show={WoundShow}
  options={{ label: "Gestion des plaies" }}
/>
```

---

### Phase 6: SVG Diagrams

#### 6.1 Add SVG Files
Copy the SVG body diagrams from inur.django to `/public/body-diagrams/`:
- `male-front.svg`
- `male-back.svg`
- `female-front.svg`
- `female-back.svg`

Source files from Django:
- `/medical/static/images/body-front.svg`
- `/medical/static/images/body-back.svg`
- `/medical/static/images/male_zones_interactives.svg`
- `/medical/static/images/female_zones_interactives.svg`

---

## Backend API Requirements

The FastAPI backend needs these endpoints (to be implemented in inur.django):

### Wounds
- `GET /fast/wounds?patient_id={id}` - List wounds
- `POST /fast/wounds` - Create wound
- `GET /fast/wounds/{id}` - Get wound details
- `PUT /fast/wounds/{id}` - Update wound
- `DELETE /fast/wounds/{id}` - Delete wound

### Evolutions
- `GET /fast/wounds/{id}/evolutions` - List evolutions
- `POST /fast/wounds/{id}/evolutions` - Create evolution
- `PUT /fast/wounds/{id}/evolutions/{evo_id}` - Update evolution
- `DELETE /fast/wounds/{id}/evolutions/{evo_id}` - Delete evolution

### Images
- `GET /fast/wounds/{id}/images` - List images
- `POST /fast/wounds/{id}/images` - Upload image (multipart/form-data)
- `DELETE /fast/wounds/{id}/images/{img_id}` - Delete image

### Statistics
- `GET /fast/wounds/statistics?patient_id={id}` - Get statistics

### Patient Diagrams
- `GET /fast/wounds/patient-diagrams/{patient_id}` - Get patient SVG diagram

---

## Testing Checklist

- [ ] List wounds for a patient
- [ ] Create wound by clicking body map
- [ ] Create wound by clicking anatomical label
- [ ] View wound details
- [ ] Add evolution entry
- [ ] Edit evolution
- [ ] Delete evolution
- [ ] Upload wound image
- [ ] View image gallery
- [ ] Delete image
- [ ] Edit wound status
- [ ] Zoom in/out on body map
- [ ] Pan body map
- [ ] Toggle click/drag modes
- [ ] Use keyboard shortcuts
- [ ] View minimap
- [ ] Toggle anatomical labels
- [ ] View trend indicators
- [ ] Calculate size changes
- [ ] Mobile responsive layout
- [ ] Archive wound with evolutions
- [ ] Delete wound without evolutions

---

## Mobile Responsiveness

Key considerations:
- Stack body map and wound list vertically on mobile
- Touch-friendly buttons (minimum 48x48px)
- Simplified controls on small screens
- Collapsible sections
- Full-screen mode for body map
- Swipe gestures for image gallery
- Bottom sheet for forms on mobile

---

## Performance Optimizations

- Lazy load SVG diagrams
- Virtualize wound evolution timeline for long lists
- Debounce coordinate detection
- Cache wound images
- Use React.memo for marker components
- Implement pagination for wound lists
- Compress uploaded images

---

## Accessibility

- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader announcements for actions
- High contrast mode support
- Focus indicators
- Alt text for images
- Semantic HTML structure

---

## Next Steps

1. Copy SVG files to `/public/body-diagrams/`
2. Implement backend FastAPI endpoints in inur.django
3. Complete BodyMapViewer implementation with full coordinate mapping
4. Add comprehensive unit tests
5. Test on real devices (iOS/Android)
6. Add internationalization (i18n) if needed
7. Create user documentation
8. Performance profiling and optimization

---

## Resources

- React Admin docs: https://marmelab.com/react-admin/
- react-zoom-pan-pinch: https://github.com/prc5/react-zoom-pan-pinch
- Material-UI: https://mui.com/
- SVG manipulation: https://developer.mozilla.org/en-US/docs/Web/SVG
- Django wound models: `/inur.django/medical/models.py`
- Existing Django UI: `/inur.django/medical/templates/medical/add_wound.html`

---

This implementation guide provides the complete roadmap for the wound management system. Start with Phase 1 (core components) and progressively build out the features.
