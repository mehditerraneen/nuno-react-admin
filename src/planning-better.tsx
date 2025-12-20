/**
 * Better Planning System - React Admin
 * Direct inline editing, no CSV imports!
 */
import React, { useState, useEffect } from 'react';
import {
    List,
    Datagrid,
    TextField,
    NumberField,
    SelectField,
    Show,
    Create,
    Edit,
    SimpleForm,
    TextInput,
    NumberInput,
    SelectInput,
    useDataProvider,
    useNotify,
    useRefresh,
    Loading,
    Button,
    TopToolbar,
    CreateButton,
} from 'react-admin';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    IconButton,
    Tooltip,
    Alert,
    Avatar,
    TextField as MuiTextField,
    Grid,
    Fab,
    Checkbox,
    ToggleButtonGroup,
    ToggleButton,
    ListItemText,
    OutlinedInput,
    InputAdornment,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PsychologyIcon from '@mui/icons-material/Psychology';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CircularProgress from '@mui/material/CircularProgress';
import { SchoolCalendarUpdateBanner } from './components/SchoolCalendarUpdateBanner';
import { OptimizerAIChat } from './components/OptimizerAIChat';
import { authenticatedFetch } from './dataProvider';

const statusChoices = [
    { id: 'DRAFT', name: 'Brouillon' },
    { id: 'PUBLISHED', name: 'Publié' },
    { id: 'LOCKED', name: 'Verrouillé' },
];

// =============== PLANNING LIST ===============
const PlanningListActions = () => (
    <TopToolbar>
        <CreateButton label="Créer un planning" />
    </TopToolbar>
);

export const PlanningList = () => (
    <List actions={<PlanningListActions />}>
        <Datagrid rowClick="show">
            <TextField source="month_name" label="Mois" />
            <NumberField source="year" label="Année" />
            <NumberField source="working_days" label="Jours ouvrés" />
            <SelectField source="status" choices={statusChoices} label="Statut" />
            <NumberField source="total_assignments" label="Affectations" />
            <NumberField source="total_hours" label="Total heures" />
        </Datagrid>
    </List>
);

// =============== CREATE PLANNING ===============
export const PlanningCreate = () => {
    const monthChoices = [
        { id: 'JANVIER', name: 'Janvier', num: 1 },
        { id: 'FÉVRIER', name: 'Février', num: 2 },
        { id: 'MARS', name: 'Mars', num: 3 },
        { id: 'AVRIL', name: 'Avril', num: 4 },
        { id: 'MAI', name: 'Mai', num: 5 },
        { id: 'JUIN', name: 'Juin', num: 6 },
        { id: 'JUILLET', name: 'Juillet', num: 7 },
        { id: 'AOÛT', name: 'Août', num: 8 },
        { id: 'SEPTEMBRE', name: 'Septembre', num: 9 },
        { id: 'OCTOBRE', name: 'Octobre', num: 10 },
        { id: 'NOVEMBRE', name: 'Novembre', num: 11 },
        { id: 'DÉCEMBRE', name: 'Décembre', num: 12 },
    ];

    return (
        <Create>
            <SimpleForm>
                <NumberInput source="year" label="Année" required defaultValue={new Date().getFullYear()} />
                <SelectInput
                    source="month"
                    label="Mois (numéro)"
                    choices={monthChoices.map(m => ({ id: m.num, name: m.name }))}
                    required
                />
                <SelectInput
                    source="month_name"
                    label="Nom du mois"
                    choices={monthChoices.map(m => ({ id: m.id, name: m.name }))}
                    required
                />
                <NumberInput source="working_days" label="Jours ouvrés" required defaultValue={20} />
                <SelectInput source="status" choices={statusChoices} label="Statut" defaultValue="DRAFT" />
                <TextInput source="notes" label="Notes" multiline rows={3} fullWidth />
                <Alert severity="info" sx={{ mt: 2 }}>
                    Après création, utilisez le bouton "Générer planning" pour créer automatiquement les affectations.
                </Alert>
            </SimpleForm>
        </Create>
    );
};

// =============== EDIT PLANNING ===============
export const PlanningEdit = () => {
    const planningId = parseInt(window.location.hash.match(/\/(\d+)$/)?.[1] || '0');

    return (
        <Edit>
            <SimpleForm>
                <NumberInput source="year" label="Année" disabled />
                <NumberInput source="month" label="Mois" disabled />
                <TextInput source="month_name" label="Nom du mois" disabled />
                <NumberInput source="working_days" label="Jours ouvrés" />
                <SelectInput source="status" choices={statusChoices} label="Statut" />
                <TextInput source="notes" label="Notes" multiline rows={4} fullWidth />
            </SimpleForm>

            {/* Add calendar view here too */}
            <Box mt={3}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Calendrier des affectations
                        </Typography>
                        <PlanningCalendar planningId={planningId} />
                    </CardContent>
                </Card>
            </Box>
        </Edit>
    );
};

// =============== CALENDAR GRID WITH INLINE EDITING ===============

/**
 * Get source information with icon and label
 */
const getSourceInfo = (source: string) => {
    switch(source) {
        case 'OPTIMIZER':
            return {
                icon: '🤖',
                label: 'Généré automatiquement',
                borderColor: '#2196F3'
            };
        case 'MANUAL':
            return {
                icon: '✏️',
                label: 'Saisie manuelle',
                borderColor: '#4CAF50'
            };
        case 'IMPORT':
            return {
                icon: '📥',
                label: 'Importé',
                borderColor: '#FF9800'
            };
        default:
            return {
                icon: '',
                label: '',
                borderColor: 'transparent'
            };
    }
};

interface ShiftCellProps {
    planningId: number;
    employeeId: number;
    employeeName: string;  // Employee name for tooltip
    employeeDailyHours: number;  // Contract hours per day
    date: string;
    day: number;
    shift: any;
    shiftTypes: any[];
    onUpdate: () => void;
    onOptimisticUpdate?: (employeeId: number, day: number, shiftData: any) => void;
}

const ShiftCell: React.FC<ShiftCellProps> = ({
    planningId,
    employeeId,
    employeeName,
    employeeDailyHours,
    date,
    day,
    shift,
    shiftTypes,
    onUpdate,
    onOptimisticUpdate,
}) => {
    const [editing, setEditing] = useState(false);
    const [selectedShiftType, setSelectedShiftType] = useState(shift?.shift_type_id || '');
    const [isDragOver, setIsDragOver] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const notify = useNotify();

    // Filter shifts based on employee's contract hours
    // Show shifts within ±1 hour of contract (to account for breaks)
    const filteredShiftTypes = shiftTypes.filter(st => {
        // Always show OFF, CP, CONG, FORM shifts
        const nonWorkCodes = ['OFF', 'CP6.4', 'CP8', 'CONG', 'FORM'];
        if (nonWorkCodes.includes(st.code)) {
            return true;
        }
        // Show shifts that match contract hours (±1 hour tolerance for breaks)
        return Math.abs(st.hours - employeeDailyHours) <= 1.5;
    });

    const handleSave = async () => {
        try {
            const shiftType = shiftTypes.find(st => st.id === selectedShiftType);

            // Optimistic update: Update UI immediately
            if (onOptimisticUpdate && shiftType) {
                onOptimisticUpdate(employeeId, day, {
                    shift_type_id: shiftType.id,
                    shift_code: shiftType.code,
                    hours: shiftType.hours,
                    color: shiftType.color_code,
                    notes: '',
                    source: 'MANUAL'  // Mark as manually set
                });
            }

            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/assignments`, {
                method: 'POST',
                body: JSON.stringify({
                    employee_id: employeeId,
                    date,
                    shift_type_id: selectedShiftType,
                    shift_code: shiftType?.code || '',
                    hours: shiftType?.hours || 0,
                    notes: '',
                    source: 'MANUAL'  // Backend will set this, but we include it for clarity
                }),
            });

            if (!response.ok) {
                // Rollback on error - reload from server
                onUpdate();
                throw new Error('Failed to save');
            }

            notify('Affectation mise à jour', { type: 'success' });
            setEditing(false);
            // No need for onUpdate() here - already updated optimistically
        } catch (error) {
            console.error('Error saving shift:', error);
            notify('Erreur lors de la mise à jour', { type: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Supprimer cette affectation ?')) return;

        try {
            // Optimistic update: Remove shift from UI immediately
            if (onOptimisticUpdate) {
                onOptimisticUpdate(employeeId, day, null);
            }

            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await fetch(
                `${apiUrl}/planning/monthly-planning/${planningId}/assignments/${date}/${employeeId}`,
                { method: 'DELETE' }
            );

            if (!response.ok) {
                // Rollback on error
                onUpdate();
                throw new Error('Failed to delete');
            }

            notify('Affectation supprimée', { type: 'success' });
            // No need for onUpdate() - already updated optimistically
        } catch (error) {
            console.error('Error deleting shift:', error);
            notify('Erreur lors de la suppression', { type: 'error' });
        }
    };

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent) => {
        if (!shift) return;
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'copy';

        // Find shift_type_id from shift_code if not present
        let shiftTypeId = shift.shift_type_id;
        if (!shiftTypeId && shift.shift_code) {
            const matchingShiftType = shiftTypes.find(st => st.code === shift.shift_code);
            shiftTypeId = matchingShiftType?.id;
        }

        const dragData = {
            shift_type_id: shiftTypeId,
            shift_code: shift.shift_code,
            hours: shift.hours,
            color: shift.color,
        };

        console.log('🚀 Drag start - data:', dragData);
        e.dataTransfer.setData('application/json', JSON.stringify(dragData));

        // Visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setIsDragging(false);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        try {
            const data = e.dataTransfer.getData('application/json');
            console.log('🎯 Drop event - Raw data:', data);

            if (!data) {
                console.error('❌ No data in drop event');
                return;
            }

            const draggedShift = JSON.parse(data);
            console.log('🎯 Parsed shift data:', draggedShift);
            console.log('🎯 Target employee:', employeeId, 'date:', date);

            if (!draggedShift.shift_type_id) {
                console.error('❌ No shift_type_id in dragged data');
                return;
            }

            // Optimistic update: Update UI immediately
            if (onOptimisticUpdate) {
                onOptimisticUpdate(employeeId, day, {
                    shift_type_id: draggedShift.shift_type_id,
                    shift_code: draggedShift.shift_code,
                    hours: draggedShift.hours,
                    color: draggedShift.color,
                    notes: '',
                    source: 'MANUAL'  // Drag-drop is a manual action
                });
            }

            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const payload = {
                employee_id: employeeId,
                date,
                shift_type_id: draggedShift.shift_type_id,
                shift_code: draggedShift.shift_code,
                hours: draggedShift.hours,
                notes: '',
                source: 'MANUAL'  // Mark as manually set
            };

            console.log('📤 Sending to API:', `${apiUrl}/planning/monthly-planning/${planningId}/assignments`, payload);

            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/assignments`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            const responseData = await response.json();
            console.log('📥 API Response:', response.status, responseData);

            if (!response.ok) {
                // Rollback on error
                onUpdate();
                throw new Error(`API Error: ${response.status} - ${JSON.stringify(responseData)}`);
            }

            notify('✅ Shift copié', { type: 'success' });
            // No need for onUpdate() - already updated optimistically
        } catch (error: any) {
            console.error('❌ Error dropping shift:', error);
            notify(`❌ Erreur: ${error.message}`, { type: 'error' });
        }
    };

    if (editing) {
        return (
            <TableCell align="center" sx={{ minWidth: 120 }}>
                <Box display="flex" flexDirection="column" gap={0.5}>
                    <Select
                        value={selectedShiftType}
                        onChange={(e) => setSelectedShiftType(e.target.value as number)}
                        size="small"
                        fullWidth
                    >
                        {filteredShiftTypes.map((st) => (
                            <MenuItem key={st.id} value={st.id}>
                                {st.code} ({st.hours}h)
                            </MenuItem>
                        ))}
                    </Select>
                    <Box display="flex" gap={0.5}>
                        <IconButton size="small" color="primary" onClick={handleSave}>
                            <SaveIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => setEditing(false)}>
                            ×
                        </IconButton>
                    </Box>
                </Box>
            </TableCell>
        );
    }

    return (
        <Tooltip title={employeeName} placement="top" arrow>
            <TableCell
                align="center"
                sx={(theme) => ({
                    cursor: 'pointer',
                    '&:hover': {
                        background: theme.palette.mode === 'dark'
                            ? theme.palette.grey[700]
                            : theme.palette.grey[200]
                    },
                    minWidth: 80,
                    border: isDragOver ? '2px dashed #2196f3' : undefined,
                    background: isDragOver
                        ? theme.palette.mode === 'dark'
                            ? 'rgba(33, 150, 243, 0.2)'
                            : 'rgba(33, 150, 243, 0.1)'
                        : undefined,
                })}
                onClick={() => !isDragging && setEditing(true)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
            {shift ? (
                <Tooltip title={
                    `${shift.shift_code} (${shift.hours || 0}h)${shift.source ? ' - ' + getSourceInfo(shift.source).label : ''} | Glisser-déposer pour copier | Cliquer pour modifier`
                }>
                    <Chip
                        label={
                            <Box display="flex" alignItems="center" gap={0.5}>
                                <span>{shift.shift_code}</span>
                                {shift.source && getSourceInfo(shift.source).icon && (
                                    <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                                        {getSourceInfo(shift.source).icon}
                                    </span>
                                )}
                            </Box>
                        }
                        size="small"
                        draggable
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        sx={{
                            background: shift.color,
                            color: '#fff',
                            fontSize: '0.7rem',
                            cursor: 'grab',
                            borderLeft: shift.source ? `3px solid ${getSourceInfo(shift.source).borderColor}` : undefined,
                            '&:active': {
                                cursor: 'grabbing',
                            },
                        }}
                        onDelete={handleDelete}
                        deleteIcon={<DeleteIcon style={{ color: '#fff', fontSize: 16 }} />}
                    />
                </Tooltip>
            ) : (
                <Tooltip title="Déposer un shift ici | Cliquer pour ajouter">
                    <Typography variant="caption" color="textSecondary">
                        +
                    </Typography>
                </Tooltip>
            )}
            </TableCell>
        </Tooltip>
    );
};

// =============== DAY DETAIL VIEW (Timeline) ===============
const DayDetailView = ({
    day,
    date,
    employees,
    shiftTypes,
    planningId,
    planning,
    onClose,
    onUpdate
}: {
    day: number;
    date: string;
    employees: any[];
    shiftTypes: any[];
    planningId: number;
    planning: any;
    onClose: () => void;
    onUpdate: () => void;
}) => {
    const notify = useNotify();
    const [editingEmployee, setEditingEmployee] = useState<number | null>(null);
    const [selectedShift, setSelectedShift] = useState<number | null>(null);

    const handleSaveShift = async (employeeId: number) => {
        // Construct proper date in YYYY-MM-DD format
        const shiftDate = `${planning.year}-${String(planning.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (!selectedShift) return;

        try {
            const shiftType = shiftTypes.find(st => st.id === selectedShift);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;

            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/assignments`, {
                method: 'POST',
                body: JSON.stringify({
                    employee_id: employeeId,
                    date: shiftDate,
                    shift_type_id: selectedShift,
                    shift_code: shiftType?.code || '',
                    hours: shiftType?.hours || 0,
                })
            });

            if (!response.ok) throw new Error('Failed to update shift');

            notify('Shift mis à jour', { type: 'success' });
            setEditingEmployee(null);
            onUpdate();
        } catch (error) {
            console.error('Error updating shift:', error);
            notify('Erreur lors de la mise à jour', { type: 'error' });
        }
    };

    // Parse time string to minutes since midnight
    const timeToMinutes = (timeStr: string) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // Calculate coverage at each hour
    const calculateCoverage = () => {
        const coverage: { hour: number; count: number; employees: string[] }[] = [];

        for (let hour = 0; hour < 24; hour++) {
            const hourStart = hour * 60;
            const hourEnd = (hour + 1) * 60;
            const workingEmployees: string[] = [];

            employees.forEach(emp => {
                const shift = emp.shifts?.[day];
                if (!shift) return;

                // Skip non-work codes
                const shiftCode = shift.shift_code || '';
                const nonWorkCodes = ['OFF', 'CP6.4', 'CP8', 'CONG', 'FORM'];
                if (nonWorkCodes.includes(shiftCode)) return;

                // Find shift type by code (backend only returns shift_code, not shift_type_id)
                const shiftType = shiftTypes.find(st => st.code === shiftCode);
                if (!shiftType || !shiftType.start_time || !shiftType.end_time) return;

                let startMin = timeToMinutes(shiftType.start_time);
                let endMin = timeToMinutes(shiftType.end_time);

                // Handle overnight shifts
                if (endMin <= startMin) endMin += 24 * 60;

                // Check if shift overlaps with this hour
                if (startMin < hourEnd && endMin > hourStart) {
                    workingEmployees.push(emp.abbreviation);
                }
            });

            coverage.push({
                hour,
                count: workingEmployees.length,
                employees: workingEmployees
            });
        }

        return coverage;
    };

    const coverage = calculateCoverage();
    const maxCoverage = Math.max(...coverage.map(c => c.count), 1);
    const peakHours = coverage.filter(c => c.count === maxCoverage);

    // Get employees working this day
    const workingEmployees = employees.filter(emp => {
        const shift = emp.shifts?.[day];
        if (!shift) return false;

        const shiftCode = shift.shift_code || '';
        const nonWorkCodes = ['OFF', 'CP6.4', 'CP8', 'CONG', 'FORM'];

        return shiftCode && !nonWorkCodes.includes(shiftCode);
    });

    return (
        <Dialog open={true} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        Vue détaillée - {date}
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={3}>
                    {/* Stats Summary */}
                    <Grid item xs={12}>
                        <Card variant="outlined">
                            <CardContent>
                                <Grid container spacing={2}>
                                    <Grid item xs={4}>
                                        <Typography variant="caption" color="text.secondary">
                                            Personnel en service
                                        </Typography>
                                        <Typography variant="h4" color="primary">
                                            {workingEmployees.length}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Typography variant="caption" color="text.secondary">
                                            Couverture maximale
                                        </Typography>
                                        <Typography variant="h4" color="success.main">
                                            {maxCoverage} personnes
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Typography variant="caption" color="text.secondary">
                                            Heures de pointe
                                        </Typography>
                                        <Typography variant="h4" color="info.main">
                                            {peakHours.length > 0 ? `${peakHours[0].hour}h-${peakHours[peakHours.length - 1].hour + 1}h` : '-'}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Coverage Chart */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                            Couverture par heure
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 150, mt: 2 }}>
                            {coverage.map((cov) => (
                                <Tooltip
                                    key={cov.hour}
                                    title={
                                        <Box>
                                            <Typography variant="caption" display="block">
                                                {cov.hour}h - {cov.hour + 1}h
                                            </Typography>
                                            <Typography variant="caption" display="block">
                                                {cov.count} personne{cov.count > 1 ? 's' : ''}
                                            </Typography>
                                            {cov.employees.length > 0 && (
                                                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                                    {cov.employees.join(', ')}
                                                </Typography>
                                            )}
                                        </Box>
                                    }
                                >
                                    <Box
                                        sx={{
                                            flex: 1,
                                            height: `${(cov.count / maxCoverage) * 100}%`,
                                            bgcolor: cov.count === maxCoverage ? 'success.main' : 'primary.main',
                                            borderRadius: 1,
                                            minHeight: cov.count > 0 ? 10 : 0,
                                            cursor: 'pointer',
                                            opacity: cov.count === 0 ? 0.2 : 1,
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                opacity: 0.8
                                            }
                                        }}
                                    />
                                </Tooltip>
                            ))}
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">0h</Typography>
                            <Typography variant="caption" color="text.secondary">6h</Typography>
                            <Typography variant="caption" color="text.secondary">12h</Typography>
                            <Typography variant="caption" color="text.secondary">18h</Typography>
                            <Typography variant="caption" color="text.secondary">24h</Typography>
                        </Box>
                    </Grid>

                    {/* Timeline View */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                            Planning chronologique
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ minWidth: 100, width: '10%' }}>Employé</TableCell>
                                        <TableCell sx={{ minWidth: 500, width: '50%' }}>Horaire (0h → 24h)</TableCell>
                                        <TableCell sx={{ minWidth: 120, width: '20%' }}>Shift</TableCell>
                                        <TableCell sx={{ minWidth: 150, width: '20%' }}>Heures</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {workingEmployees.map((emp: any) => {
                                        const shift = emp.shifts[day];
                                        const shiftCode = shift.shift_code || '';
                                        // Find shift type by code (backend returns shift_code, not shift_type_id)
                                        const shiftType = shiftTypes.find(st => st.code === shiftCode);

                                        if (!shiftType || !shiftType.start_time || !shiftType.end_time) return null;

                                        const isEditing = editingEmployee === emp.employee_id;

                                        let startMin = timeToMinutes(shiftType.start_time);
                                        let endMin = timeToMinutes(shiftType.end_time);

                                        // Handle overnight shifts
                                        const isOvernight = endMin <= startMin;
                                        if (isOvernight) endMin += 24 * 60;

                                        const totalMinutes = 24 * 60;
                                        const startPercent = (startMin / totalMinutes) * 100;
                                        const widthPercent = ((endMin - startMin) / totalMinutes) * 100;

                                        return (
                                            <TableRow key={emp.employee_id}>
                                                <TableCell>
                                                    <Box display="flex" flexDirection="column" gap={0.5}>
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <Avatar
                                                                src={emp.avatar_url}
                                                                sx={{
                                                                    width: 24,
                                                                    height: 24,
                                                                    bgcolor: emp.color_cell,
                                                                    color: emp.color_text,
                                                                    fontSize: '0.65rem'
                                                                }}
                                                            >
                                                                {!emp.avatar_url && emp.abbreviation}
                                                            </Avatar>
                                                            <Typography variant="body2">
                                                                {emp.abbreviation}
                                                            </Typography>
                                                        </Box>
                                                        {/* Labor law warnings */}
                                                        <Box display="flex" gap={0.5} flexWrap="wrap">
                                                            {emp.hours_exceeded && (
                                                                <Tooltip title={`Dépassement de ${emp.hours_over_limit?.toFixed(1)}h sur le maximum mensuel`}>
                                                                    <Chip
                                                                        label={`⚠️ +${emp.hours_over_limit?.toFixed(1)}h`}
                                                                        size="small"
                                                                        color="error"
                                                                        sx={{ fontSize: '0.65rem', height: 16 }}
                                                                    />
                                                                </Tooltip>
                                                            )}
                                                            {emp.consecutive_days_violation && (
                                                                <Tooltip title={`${emp.max_consecutive_days} jours consécutifs - Loi: max 6 jours (44h repos)`}>
                                                                    <Chip
                                                                        label={`🚨 ${emp.max_consecutive_days}j`}
                                                                        size="small"
                                                                        color="warning"
                                                                        sx={{ fontSize: '0.65rem', height: 16 }}
                                                                    />
                                                                </Tooltip>
                                                            )}
                                                            {emp.evening_to_morning_violation && (
                                                                <Tooltip title={`Soir→Matin interdit: ${emp.evening_to_morning_violations?.length} violation(s)`}>
                                                                    <Chip
                                                                        label={`🔴 Soir→Matin`}
                                                                        size="small"
                                                                        color="error"
                                                                        sx={{ fontSize: '0.65rem', height: 16 }}
                                                                    />
                                                                </Tooltip>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={(theme) => ({
                                                        position: 'relative',
                                                        height: 40,
                                                        bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
                                                        borderRadius: 1,
                                                        overflow: 'visible'
                                                    })}>
                                                        {/* Hour markers - render first so they're behind */}
                                                        {[6, 12, 18].map(h => (
                                                            <Box
                                                                key={h}
                                                                sx={(theme) => ({
                                                                    position: 'absolute',
                                                                    left: `${(h / 24) * 100}%`,
                                                                    top: 0,
                                                                    bottom: 0,
                                                                    width: 1,
                                                                    bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[300],
                                                                    zIndex: 0,
                                                                    pointerEvents: 'none'
                                                                })}
                                                            />
                                                        ))}
                                                        {/* Shift bar - render after so it's on top */}
                                                        <Tooltip title={`${shiftType.code}: ${shiftType.start_time} - ${shiftType.end_time} (${shiftType.hours}h)`}>
                                                            <Box
                                                                onClick={() => {
                                                                    console.log('Shift bar clicked:', {
                                                                        code: shiftType.code,
                                                                        color: shiftType.color_code,
                                                                        startPercent,
                                                                        widthPercent,
                                                                        startTime: shiftType.start_time,
                                                                        endTime: shiftType.end_time
                                                                    });
                                                                }}
                                                                sx={{
                                                                    position: 'absolute',
                                                                    left: `${startPercent}%`,
                                                                    width: `${widthPercent}%`,
                                                                    height: '100%',
                                                                    bgcolor: shiftType.color_code || '#4A90E2',
                                                                    borderRadius: 1,
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: 'white',
                                                                    fontWeight: 'bold',
                                                                    boxShadow: 2,
                                                                    border: '2px solid rgba(255,255,255,0.8)',
                                                                    cursor: 'pointer',
                                                                    zIndex: 10,
                                                                    minWidth: widthPercent < 5 ? '60px' : 'auto',
                                                                    '&:hover': {
                                                                        boxShadow: 4,
                                                                        border: '3px solid rgba(255,255,255,1)',
                                                                        transform: 'scaleY(1.1)'
                                                                    }
                                                                }}
                                                            >
                                                                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 'bold', lineHeight: 1.2, color: 'white' }}>
                                                                    {shiftType.code}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.95, lineHeight: 1.2, color: 'white' }}>
                                                                    {shiftType.start_time}-{shiftType.end_time}
                                                                </Typography>
                                                            </Box>
                                                        </Tooltip>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    {isEditing ? (
                                                        <Box>
                                                            <Select
                                                                size="small"
                                                                value={selectedShift || shiftType.id}
                                                                onChange={(e) => setSelectedShift(Number(e.target.value))}
                                                                fullWidth
                                                            >
                                                                {shiftTypes
                                                                    .filter(st => Math.abs(st.hours - emp.daily_hours) <= 1.5 || ['OFF', 'CP6.4', 'CP8', 'CONG', 'FORM'].includes(st.code))
                                                                    .map(st => (
                                                                        <MenuItem key={st.id} value={st.id}>
                                                                            {st.code} ({st.hours}h)
                                                                        </MenuItem>
                                                                    ))
                                                                }
                                                            </Select>
                                                        </Box>
                                                    ) : (
                                                        <Chip
                                                            label={shiftType.code}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: shiftType.color_code || 'primary.main',
                                                                color: 'white',
                                                                fontWeight: 'bold'
                                                            }}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {isEditing ? (
                                                        <Box display="flex" gap={0.5}>
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={() => handleSaveShift(emp.employee_id)}
                                                            >
                                                                <SaveIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => {
                                                                    setEditingEmployee(null);
                                                                    setSelectedShift(null);
                                                                }}
                                                            >
                                                                <CloseIcon fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    ) : (
                                                        <Box display="flex" alignItems="center" gap={0.5}>
                                                            <Chip
                                                                label={`${shiftType.hours}h`}
                                                                size="small"
                                                                color="primary"
                                                                variant="outlined"
                                                            />
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => {
                                                                    setEditingEmployee(emp.employee_id);
                                                                    setSelectedShift(shiftType.id);
                                                                }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Fermer</Button>
            </DialogActions>
        </Dialog>
    );
};

const PlanningCalendar = ({ planningId }: { planningId: number }) => {
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const refresh = useRefresh();
    const [loading, setLoading] = useState(true);
    const [calendarData, setCalendarData] = useState<any>(null);
    const [shiftTypes, setShiftTypes] = useState<any[]>([]);
    const [templateDialog, setTemplateDialog] = useState(false);
    const [optimizeDialog, setOptimizeDialog] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [optimizing, setOptimizing] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [createShiftDialog, setCreateShiftDialog] = useState(false);
    const [newShift, setNewShift] = useState({
        code: '',
        name: '',
        start_time: '',
        end_time: '',
        break_minutes: 0,
        hours: 8,
        shift_category: 'MORNING',
        color_code: '#4A90E2'
    });
    const [shiftValidationError, setShiftValidationError] = useState<string>('');
    const [dayDetailView, setDayDetailView] = useState<{ day: number; date: string } | null>(null);

    // AI Chat state
    const [aiChatOpen, setAiChatOpen] = useState(false);
    const [optimizerFailureMessage, setOptimizerFailureMessage] = useState<string | undefined>(undefined);

    // Algorithm selection state
    const [selectedAlgorithm, setSelectedAlgorithm] = useState<'CP-SAT' | 'GA' | 'HYBRID'>('CP-SAT');

    // Selected employee for highlighting
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

    // CSV Import state
    const [csvImportDialog, setCsvImportDialog] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);

    // Analysis Dialog state
    const [analysisDialog, setAnalysisDialog] = useState(false);
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [applyingSuggestions, setApplyingSuggestions] = useState(false);

    // Validation state
    const [validationDialog, setValidationDialog] = useState(false);
    const [validationResults, setValidationResults] = useState<any>(null);
    const [validating, setValidating] = useState(false);

    // Grouping state
    const [groupBy, setGroupBy] = useState<'none' | 'job_position' | 'job_type' | 'alphabetical' | 'hours'>('none');
    const [groupedData, setGroupedData] = useState<any>(null);
    const [reordering, setReordering] = useState(false);

    // Hide/Show Employees state
    const [hiddenEmployees, setHiddenEmployees] = useState<Set<number>>(new Set());
    const [togglingVisibility, setTogglingVisibility] = useState<number | null>(null);

    // PDF Export state
    const [exportingPdf, setExportingPdf] = useState(false);

    // Refresh state
    const [refreshing, setRefreshing] = useState(false);

    // Filter state
    const [filterVisibility, setFilterVisibility] = useState<'all' | 'visible' | 'hidden'>('all');
    const [filterJobPositions, setFilterJobPositions] = useState<string[]>([]);
    const [filterJobTypes, setFilterJobTypes] = useState<string[]>([]);
    const [filterHoursStatus, setFilterHoursStatus] = useState<'all' | 'over_limit' | 'under_50' | 'ok'>('all');
    const [filterNameSearch, setFilterNameSearch] = useState('');

    useEffect(() => {
        loadData();
    }, [planningId]);

    // Load hidden employees on mount
    useEffect(() => {
        const loadHiddenEmployees = async () => {
            try {
                const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
                const response = await authenticatedFetch(
                    `${apiUrl}/planning/monthly-planning/${planningId}/hidden-employees`
                );
                if (response.ok) {
                    const data = await response.json();
                    setHiddenEmployees(new Set(data.hidden_employee_ids || []));
                }
            } catch (error) {
                console.error('Error loading hidden employees:', error);
            }
        };
        loadHiddenEmployees();
    }, [planningId]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Fetch calendar data directly with auth token
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const calendarResponse = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/calendar`);
            const calendarData = await calendarResponse.json();

            // Fetch shift types using dataProvider
            const shiftsRes = await dataProvider.getList('planning/shift-types', {
                pagination: { page: 1, perPage: 100 },
                sort: { field: 'code', order: 'ASC' },
                filter: { active_only: true },
            });

            setCalendarData(calendarData);
            setShiftTypes(shiftsRes.data);
        } catch (error) {
            console.error('Error loading calendar:', error);
            notify('Erreur lors du chargement', { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Optimistic update: update local state immediately without reloading
    const updateShiftOptimistically = (employeeId: number, day: number, shiftData: any) => {
        console.log('🔄 Optimistic update:', { employeeId, day, shiftData });

        setCalendarData((prevData: any) => {
            if (!prevData || !prevData.employees) {
                console.error('❌ Invalid calendar data structure');
                return prevData;
            }

            const updatedEmployees = prevData.employees.map((emp: any) => {
                if (emp.employee_id === employeeId) {
                    // Create a clean copy of shifts, filtering out any undefined values
                    const currentShifts = emp.shifts || {};
                    const updatedShifts: Record<number, any> = {};

                    // Copy existing shifts (excluding the one we're updating)
                    Object.entries(currentShifts).forEach(([key, shift]) => {
                        if (shift != null && Number(key) !== day) {
                            updatedShifts[Number(key)] = shift;
                        }
                    });

                    // Add/update the new shift (if not null)
                    // Ensure shift data has required fields
                    if (shiftData != null) {
                        updatedShifts[day] = {
                            shift_type_id: shiftData.shift_type_id,
                            shift_code: shiftData.shift_code || '',
                            hours: Number(shiftData.hours) || 0,
                            color: shiftData.color || '#CCCCCC',
                            notes: shiftData.notes || '',
                            source: shiftData.source || 'MANUAL'  // Preserve source or default to MANUAL
                        };
                    }

                    // Recalculate total hours for this employee
                    const non_work_codes = ['OFF', 'CP6.4', 'CP8', 'CONG', 'FORM'];
                    let total_work_hours = 0;
                    let total_days = 0;

                    Object.values(updatedShifts).forEach((shift: any) => {
                        if (shift && typeof shift === 'object') {
                            total_days += 1;
                            const shiftCode = shift.shift_code || '';
                            const shiftHours = Number(shift.hours) || 0;
                            if (!non_work_codes.includes(shiftCode) && !isNaN(shiftHours)) {
                                total_work_hours += shiftHours;
                            }
                        }
                    });

                    console.log('✅ Updated employee:', emp.abbreviation, {
                        total_days,
                        total_work_hours,
                        shifts_count: Object.keys(updatedShifts).length
                    });

                    return {
                        ...emp,
                        shifts: updatedShifts,
                        total_work_hours,
                        total_days
                    };
                }
                return emp;
            });

            return {
                ...prevData,
                employees: updatedEmployees
            };
        });
    };

    const handleGenerateTemplate = async (templateType: string) => {
        try {
            setGenerating(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await fetch(
                `${apiUrl}/planning/monthly-planning/${planningId}/generate-template?template_type=${templateType}`,
                { method: 'POST' }
            );

            if (!response.ok) {
                throw new Error('Failed to generate template');
            }

            notify(`Planning ${templateType} généré avec succès!`, { type: 'success' });
            setTemplateDialog(false);
            loadData();
            refresh();
        } catch (error) {
            console.error('Error generating template:', error);
            notify('Erreur lors de la génération', { type: 'error' });
        } finally {
            setGenerating(false);
        }
    };

    const handleOptimizePlanning = async () => {
        try {
            setOptimizing(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;

            // Adjust time limit based on algorithm
            const timeLimit = selectedAlgorithm === 'HYBRID' ? 300 : 60;  // 5 min for HYBRID, 60s otherwise

            const response = await authenticatedFetch(
                `${apiUrl}/planning/monthly-planning/${planningId}/optimize`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        min_daily_coverage: 4,  // Minimum 4 people/day (based on actual data: avg 4-5 employees/day)
                        morning_coverage_ratio: 0.63,  // 63% morning, 37% evening (based on Nov 2025 actual data)
                        time_limit_seconds: timeLimit,
                        preserve_existing: false,
                        algorithm: selectedAlgorithm  // Use selected algorithm
                    })
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Optimization failed');
            }

            const result = await response.json();
            const orShiftsMsg = result.or_shifts_created > 0
                ? ` | ${result.or_shifts_created} nouveau(x) shift(s) OR créé(s)`
                : '';
            const algorithmBadge = result.algorithm === 'GA' ? ' 🧬 GA' :
                                   result.algorithm === 'HYBRID' ? ' 🔬 HYBRID' : ' 🤖 CP-SAT';

            // Show success notification
            notify(
                `✅ ${result.message} (${result.assignments_created} affectations${orShiftsMsg} en ${result.optimization_time.toFixed(1)}s)${algorithmBadge}`,
                { type: 'success' }
            );

            // If AI summary is available, show it in the AI chat
            if (result.ai_summary) {
                setOptimizerFailureMessage(result.ai_summary);
                setAiChatOpen(true);
            }

            setOptimizeDialog(false);
            loadData();
            refresh();
        } catch (error: any) {
            console.error('Error optimizing planning:', error);
            notify(`❌ ${error.message}`, { type: 'error' });

            // Auto-open AI chat on optimization failure
            setOptimizerFailureMessage(error.message);
            setAiChatOpen(true);
            setOptimizeDialog(false);
        } finally {
            setOptimizing(false);
        }
    };

    const handleClearOptimizerShifts = async () => {
        if (!window.confirm('Êtes-vous sûr de vouloir effacer tous les shifts générés par l\'optimiseur? Les shifts manuels seront conservés.')) {
            return;
        }

        try {
            setClearing(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await fetch(
                `${apiUrl}/planning/monthly-planning/${planningId}/clear-optimizer-shifts`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Clear failed');
            }

            const result = await response.json();
            notify(
                `✅ ${result.message}`,
                { type: 'success' }
            );
            loadData();
            refresh();
        } catch (error: any) {
            console.error('Error clearing optimizer shifts:', error);
            notify(`❌ ${error.message}`, { type: 'error' });
        } finally {
            setClearing(false);
        }
    };

    const calculateWorkedHours = (startTime: string, endTime: string, breakMinutes: number) => {
        if (!startTime || !endTime) return null;

        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        let startMinutes = startHour * 60 + startMin;
        let endMinutes = endHour * 60 + endMin;

        // Handle overnight shifts
        if (endMinutes <= startMinutes) {
            endMinutes += 24 * 60;
        }

        const totalMinutes = endMinutes - startMinutes;
        const workedHours = (totalMinutes - breakMinutes) / 60;

        return Math.round(workedHours * 10) / 10; // Round to 1 decimal
    };

    const validateShiftData = () => {
        // Reset error
        setShiftValidationError('');

        // Check required fields
        if (!newShift.code || !newShift.name || !newShift.start_time || !newShift.end_time) {
            setShiftValidationError('Tous les champs obligatoires doivent être remplis');
            return false;
        }

        // Check if code already exists
        if (shiftTypes.some(st => st.code.toUpperCase() === newShift.code.toUpperCase())) {
            setShiftValidationError(`Le code "${newShift.code}" existe déjà. Veuillez choisir un code unique.`);
            return false;
        }

        // Parse times
        const [startHour, startMin] = newShift.start_time.split(':').map(Number);
        const [endHour, endMin] = newShift.end_time.split(':').map(Number);

        // Convert to minutes since midnight
        let startMinutes = startHour * 60 + startMin;
        let endMinutes = endHour * 60 + endMin;

        // Handle overnight shifts (e.g., 21:00 to 07:00)
        if (endMinutes <= startMinutes) {
            endMinutes += 24 * 60; // Add 24 hours
        }

        // Calculate total duration in hours
        const totalMinutes = endMinutes - startMinutes;
        const totalHours = totalMinutes / 60;

        // Calculate worked hours (total - break)
        const workedHours = (totalMinutes - newShift.break_minutes) / 60;

        // Validation checks
        if (newShift.break_minutes < 0) {
            setShiftValidationError('La pause ne peut pas être négative');
            return false;
        }

        if (newShift.break_minutes >= totalMinutes) {
            setShiftValidationError('La pause ne peut pas être supérieure ou égale à la durée totale du shift');
            return false;
        }

        if (totalHours > 24) {
            setShiftValidationError('La durée du shift ne peut pas dépasser 24 heures');
            return false;
        }

        // Check if hours field matches calculated hours (with 0.1h tolerance)
        if (Math.abs(newShift.hours - workedHours) > 0.1) {
            setShiftValidationError(
                `Les heures travaillées (${newShift.hours}h) ne correspondent pas au calcul: ${totalHours.toFixed(1)}h - ${(newShift.break_minutes / 60).toFixed(1)}h pause = ${workedHours.toFixed(1)}h`
            );
            return false;
        }

        return true;
    };

    const handleCreateShift = async () => {
        // Validate before submitting
        if (!validateShiftData()) {
            notify('Données invalides: ' + shiftValidationError, { type: 'error' });
            return;
        }

        try {
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(`${apiUrl}/planning/shift-types`, {
                method: 'POST',
                body: JSON.stringify({
                    ...newShift,
                    is_active: true
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create shift');
            }

            notify('Shift créé avec succès!', { type: 'success' });
            setCreateShiftDialog(false);
            setShiftValidationError('');
            setNewShift({
                code: '',
                name: '',
                start_time: '',
                end_time: '',
                break_minutes: 0,
                hours: 8,
                shift_category: 'MORNING',
                color_code: '#4A90E2'
            });
            loadData();
        } catch (error) {
            console.error('Error creating shift:', error);
            notify('Erreur lors de la création', { type: 'error' });
        }
    };

    const handleCsvImport = async () => {
        if (!csvFile) {
            notify('Veuillez sélectionner un fichier CSV', { type: 'error' });
            return;
        }

        try {
            setImporting(true);

            // Parse CSV file
            const text = await csvFile.text();

            // Helper to parse CSV properly (handles quoted fields)
            const parseCSV = (text: string): string[][] => {
                const lines: string[][] = [];
                const rows = text.split('\n');

                for (const row of rows) {
                    if (!row.trim()) continue;

                    const cells: string[] = [];
                    let currentCell = '';
                    let insideQuotes = false;

                    for (let i = 0; i < row.length; i++) {
                        const char = row[i];

                        if (char === '"') {
                            insideQuotes = !insideQuotes;
                        } else if (char === ',' && !insideQuotes) {
                            cells.push(currentCell.trim());
                            currentCell = '';
                        } else {
                            currentCell += char;
                        }
                    }
                    cells.push(currentCell.trim());
                    lines.push(cells);
                }

                return lines;
            };

            const lines = parseCSV(text);

            if (lines.length < 2) {
                throw new Error('CSV file is empty or invalid');
            }

            // Detect format: simple (employee_id,date,shift_code) vs grid (employees as rows, days as columns)
            const headers = lines[0].map(h => h.toLowerCase().trim());
            const isSimpleFormat = headers.includes('employee_id') || headers.includes('abbreviation');

            let shifts: any[] = [];

            if (isSimpleFormat) {
                // Simple format: employee_id/abbreviation,date,shift_code
                console.log('📋 Detected simple format');

                shifts = lines.slice(1).map(values => {
                    const row: any = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index];
                    });
                    return row;
                }).filter(row => (row.employee_id || row.abbreviation) && row.date && row.shift_code);

            } else {
                // Grid format: employees as rows, days as columns
                console.log('📋 Detected grid format - parsing...');

                // Employee rows start at line 9 (index 8)
                for (let rowIdx = 8; rowIdx < Math.min(lines.length, 25); rowIdx++) {
                    const row = lines[rowIdx];

                    if (row.length < 10) continue;

                    let abbreviation = row[1]?.trim();

                    // Skip empty rows or rows with error messages
                    if (!abbreviation || abbreviation === '' || abbreviation.includes('TOUTES LES CELLULES')) {
                        continue;
                    }

                    // Clean abbreviation - remove text in parentheses
                    // "AC (ANA)" -> "AC", "NK (Nadine)" -> "NK"
                    abbreviation = abbreviation.split('(')[0].trim();

                    console.log(`   Processing employee: ${abbreviation}`);

                    // Extract shifts for each day (columns 5-35 for days 1-31)
                    const daysInMonth = new Date(planning.year, planning.month, 0).getDate();
                    for (let day = 1; day <= daysInMonth; day++) {
                        const colIdx = 4 + day; // Column 5 is day 1
                        if (colIdx >= row.length) continue;

                        const shiftCode = row[colIdx]?.trim();

                        // Skip only empty cells
                        if (!shiftCode || shiftCode === '') {
                            continue;
                        }

                        shifts.push({
                            abbreviation: abbreviation,
                            date: `${planning.year}-${String(planning.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                            shift_code: shiftCode
                        });
                    }
                }

                console.log(`✅ Parsed ${shifts.length} shifts from grid format`);
            }

            if (shifts.length === 0) {
                throw new Error('No valid shifts found in CSV');
            }

            console.log('📤 Sending to backend:', { count: shifts.length, sample: shifts.slice(0, 3) });

            // Send to backend
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/import-csv`, {
                method: 'POST',
                body: JSON.stringify({ shifts })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Import failed');
            }

            const result = await response.json();
            console.log('✅ Import result:', result);

            if (result.errors && result.errors.length > 0) {
                console.warn('⚠️ Import errors:', result.errors);
                notify(`⚠️ ${result.imported_count} shifts importés, ${result.errors.length} erreurs`, { type: 'warning' });
            } else {
                notify(`✅ ${result.imported_count} shifts importés avec succès!`, { type: 'success' });
            }

            setCsvImportDialog(false);
            setCsvFile(null);
            loadData();
        } catch (error: any) {
            console.error('❌ Error importing CSV:', error);
            notify(`Erreur d'import: ${error.message}`, { type: 'error' });
        } finally {
            setImporting(false);
        }
    };

    // Analysis handlers
    const handleAnalyzePlanning = async () => {
        try {
            setAnalyzing(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/compare-alternatives`);

            if (!response.ok) {
                throw new Error('Failed to analyze planning');
            }

            const data = await response.json();
            setAnalysisData(data);
            setAnalysisDialog(true);

            notify('Analyse terminée', { type: 'success' });
        } catch (error: any) {
            console.error('❌ Error analyzing planning:', error);
            notify(`Erreur d'analyse: ${error.message}`, { type: 'error' });
        } finally {
            setAnalyzing(false);
        }
    };

    const handleApplySuggestions = async (dryRun: boolean = false) => {
        try {
            setApplyingSuggestions(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/apply-suggestions`, {
                method: 'POST',
                body: JSON.stringify({
                    dry_run: dryRun,
                    max_shifts_to_create: 50,
                    preferred_shift_types: ['M6.5-15', 'S13.5-22']
                })
            });

            if (!response.ok) {
                throw new Error('Failed to apply suggestions');
            }

            const result = await response.json();

            if (dryRun) {
                notify(`Aperçu: ${result.shifts_created} shifts seraient créés`, { type: 'info' });
            } else {
                notify(`✅ ${result.shifts_created} shifts créés avec succès!`, { type: 'success' });
                setAnalysisDialog(false);
                loadData();
            }
        } catch (error: any) {
            console.error('❌ Error applying suggestions:', error);
            notify(`Erreur: ${error.message}`, { type: 'error' });
        } finally {
            setApplyingSuggestions(false);
        }
    };

    // Refresh handler
    const handleRefreshData = async () => {
        try {
            setRefreshing(true);
            await loadData();
            notify('Données actualisées', { type: 'success' });
        } catch (error: any) {
            console.error('Error refreshing data:', error);
            notify(`Erreur: ${error.message}`, { type: 'error' });
        } finally {
            setRefreshing(false);
        }
    };

    // PDF Export handler
    const handleExportPdf = async () => {
        try {
            setExportingPdf(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(
                `${apiUrl}/planning/monthly-planning/${planningId}/pdf`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error('Échec de l\'export PDF');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `planning_${calendarData?.planning?.year || 'unknown'}_${String(calendarData?.planning?.month || 0).padStart(2, '0')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            notify('PDF exporté avec succès', { type: 'success' });
        } catch (error: any) {
            console.error('Error exporting PDF:', error);
            notify(`Erreur d'export: ${error.message}`, { type: 'error' });
        } finally {
            setExportingPdf(false);
        }
    };

    // Validation handler
    const handleValidatePlanning = async () => {
        try {
            setValidating(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(
                `${apiUrl}/planning/monthly-planning/${planningId}/validate`,
                { method: 'POST' }
            );

            if (!response.ok) {
                throw new Error('Échec de la validation');
            }

            const data = await response.json();
            setValidationResults(data);
            setValidationDialog(true);
            notify('Validation terminée', { type: 'success' });
        } catch (error: any) {
            console.error('Error validating planning:', error);
            notify(`Erreur de validation: ${error.message}`, { type: 'error' });
        } finally {
            setValidating(false);
        }
    };

    // Toggle employee visibility handler
    const handleToggleEmployeeVisibility = async (employeeId: number) => {
        try {
            setTogglingVisibility(employeeId);
            const isCurrentlyHidden = hiddenEmployees.has(employeeId);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;

            const response = await authenticatedFetch(
                `${apiUrl}/planning/monthly-planning/${planningId}/employee/${employeeId}/visibility`,
                {
                    method: 'POST',
                    body: JSON.stringify({ hidden: !isCurrentlyHidden })
                }
            );

            if (!response.ok) {
                throw new Error('Échec du changement de visibilité');
            }

            setHiddenEmployees((prev) => {
                const newSet = new Set(prev);
                if (isCurrentlyHidden) {
                    newSet.delete(employeeId);
                } else {
                    newSet.add(employeeId);
                }
                return newSet;
            });

            notify(
                isCurrentlyHidden ? 'Employé affiché' : 'Employé masqué',
                { type: 'info' }
            );
        } catch (error: any) {
            console.error('Error toggling visibility:', error);
            notify(`Erreur: ${error.message}`, { type: 'error' });
        } finally {
            setTogglingVisibility(null);
        }
    };

    // Reorder employees handler
    const handleReorderEmployees = async (orderBy: string) => {
        if (orderBy === 'none') {
            setGroupBy('none');
            setGroupedData(null);
            // Reload original data to restore default order
            loadData();
            return;
        }

        try {
            setReordering(true);
            setGroupBy(orderBy as any);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(
                `${apiUrl}/planning/monthly-planning/${planningId}/reorder`,
                {
                    method: 'POST',
                    body: JSON.stringify({ group_by: orderBy })
                }
            );

            if (!response.ok) {
                throw new Error('Échec du regroupement');
            }

            const data = await response.json();
            setGroupedData(data);

            // For flat responses (alphabetical, hours), update calendarData with reordered employees
            if (data.employees && !data.groups) {
                setCalendarData((prev: any) => {
                    if (!prev) return prev;
                    // Map the reordered employee list to full employee data
                    const reorderedEmployees = data.employees.map((emp: any) => {
                        const fullEmployee = prev.employees.find((e: any) => e.employee_id === emp.id);
                        return fullEmployee || emp;
                    }).filter(Boolean);
                    return {
                        ...prev,
                        employees: reorderedEmployees
                    };
                });
            }

            notify('Employés regroupés', { type: 'success' });
        } catch (error: any) {
            console.error('Error reordering employees:', error);
            notify(`Erreur: ${error.message}`, { type: 'error' });
            setGroupBy('none');
            setGroupedData(null);
        } finally {
            setReordering(false);
        }
    };

    if (loading) return <Loading />;
    if (!calendarData) return <Typography>Aucune donnée</Typography>;

    const { planning, employees: rawEmployees, daily_staff_count, luxembourg_holidays } = calendarData;
    const daysInMonth = new Date(planning.year, planning.month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Extract unique job positions and types for filter options
    const uniqueJobPositions = [...new Set(rawEmployees.map((e: any) => e.job_position).filter(Boolean))].sort();
    const uniqueJobTypes = [...new Set(rawEmployees.map((e: any) => e.job_type).filter(Boolean))].sort();

    // Apply filters to employees
    const employees = rawEmployees.filter((employee: any) => {
        // Visibility filter
        if (filterVisibility === 'visible' && hiddenEmployees.has(employee.employee_id)) return false;
        if (filterVisibility === 'hidden' && !hiddenEmployees.has(employee.employee_id)) return false;

        // Job position filter
        if (filterJobPositions.length > 0 && !filterJobPositions.includes(employee.job_position)) return false;

        // Job type filter
        if (filterJobTypes.length > 0 && !filterJobTypes.includes(employee.job_type)) return false;

        // Hours status filter
        if (filterHoursStatus !== 'all') {
            const utilization = employee.max_monthly_hours > 0
                ? (employee.total_work_hours / employee.max_monthly_hours) * 100
                : 0;
            if (filterHoursStatus === 'over_limit' && !employee.hours_exceeded) return false;
            if (filterHoursStatus === 'under_50' && utilization >= 50) return false;
            if (filterHoursStatus === 'ok' && (employee.hours_exceeded || utilization < 50)) return false;
        }

        // Name search filter
        if (filterNameSearch.trim()) {
            const search = filterNameSearch.toLowerCase().trim();
            const matchesName = employee.name?.toLowerCase().includes(search);
            const matchesAbbr = employee.abbreviation?.toLowerCase().includes(search);
            if (!matchesName && !matchesAbbr) return false;
        }

        return true;
    });

    // Check if any filters are active
    const hasActiveFilters = filterVisibility !== 'all' ||
        filterJobPositions.length > 0 ||
        filterJobTypes.length > 0 ||
        filterHoursStatus !== 'all' ||
        filterNameSearch.trim() !== '';

    // Clear all filters function
    const clearAllFilters = () => {
        setFilterVisibility('all');
        setFilterJobPositions([]);
        setFilterJobTypes([]);
        setFilterHoursStatus('all');
        setFilterNameSearch('');
    };

    const getWeekday = (day: number) => {
        const date = new Date(planning.year, planning.month - 1, day);
        const weekdays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        return weekdays[date.getDay()];
    };

    const isWeekend = (day: number) => {
        const date = new Date(planning.year, planning.month - 1, day);
        return date.getDay() === 0 || date.getDay() === 6;
    };

    const isHoliday = (day: number) => {
        return luxembourg_holidays && luxembourg_holidays[day];
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                    {planning.month_name} {planning.year}
                </Typography>
                <Box display="flex" gap={1}>
                    <Button
                        startIcon={<AddIcon />}
                        onClick={() => setCreateShiftDialog(true)}
                        color="secondary"
                        variant="outlined"
                        label="Créer un shift"
                    />
                    <Button
                        startIcon={<AutoFixHighIcon />}
                        onClick={() => setTemplateDialog(true)}
                        color="primary"
                        variant="contained"
                        label="Générer planning automatique"
                    />
                    <Button
                        startIcon={<AutoAwesomeIcon />}
                        onClick={() => setOptimizeDialog(true)}
                        color="success"
                        variant="contained"
                        label="Optimiser avec OR-Tools"
                    />
                    <Button
                        startIcon={<DeleteSweepIcon />}
                        onClick={handleClearOptimizerShifts}
                        color="warning"
                        variant="outlined"
                        disabled={clearing}
                        label={clearing ? "Effacement..." : "Effacer shifts auto"}
                    />
                    <Button
                        startIcon={<UploadFileIcon />}
                        onClick={() => setCsvImportDialog(true)}
                        color="info"
                        variant="outlined"
                        label="Importer CSV"
                    />
                    <Button
                        startIcon={<AssessmentIcon />}
                        onClick={handleAnalyzePlanning}
                        color="secondary"
                        variant="contained"
                        disabled={analyzing}
                        label={analyzing ? "Analyse..." : "Analyser le planning"}
                    />
                    <Button
                        startIcon={exportingPdf ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdfIcon />}
                        onClick={handleExportPdf}
                        color="error"
                        variant="outlined"
                        disabled={exportingPdf}
                        label={exportingPdf ? "Export..." : "PDF"}
                    />
                    <Button
                        startIcon={validating ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                        onClick={handleValidatePlanning}
                        color="primary"
                        variant="contained"
                        disabled={validating}
                        label={validating ? "Validation..." : "Valider"}
                    />
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel id="group-by-label">Grouper par</InputLabel>
                        <Select
                            labelId="group-by-label"
                            value={groupBy}
                            label="Grouper par"
                            onChange={(e) => handleReorderEmployees(e.target.value)}
                            disabled={reordering}
                        >
                            <MenuItem value="none">Aucun</MenuItem>
                            <MenuItem value="job_position">Poste</MenuItem>
                            <MenuItem value="job_type">Type</MenuItem>
                            <MenuItem value="alphabetical">Alphabétique</MenuItem>
                            <MenuItem value="hours">Heures</MenuItem>
                        </Select>
                    </FormControl>
                    <Tooltip title="Rafraîchir les données">
                        <IconButton
                            onClick={handleRefreshData}
                            disabled={refreshing || loading}
                            color="primary"
                        >
                            {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Filter Row */}
            <Paper variant="outlined" sx={{ p: 1, mb: 1, display: 'inline-block' }}>
                <Box
                    component="span"
                    sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 1,
                        flexWrap: 'nowrap',
                    }}
                >
                <FilterListIcon color="action" fontSize="small" />

                {/* Visibility Filter */}
                <FormControl size="small" variant="outlined" sx={{ width: 110 }}>
                    <InputLabel id="filter-visibility-label">Visibilité</InputLabel>
                    <Select
                        labelId="filter-visibility-label"
                        value={filterVisibility}
                        label="Visibilité"
                        onChange={(e) => setFilterVisibility(e.target.value as any)}
                    >
                        <MenuItem value="all">Tous</MenuItem>
                        <MenuItem value="visible">Visibles</MenuItem>
                        <MenuItem value="hidden">Masqués</MenuItem>
                    </Select>
                </FormControl>

                {/* Job Position Filter (Multi-select) - only show if positions exist */}
                {uniqueJobPositions.length > 0 && (
                    <FormControl size="small" variant="outlined" sx={{ width: 130 }}>
                        <InputLabel id="filter-position-label">Poste</InputLabel>
                        <Select
                            labelId="filter-position-label"
                            multiple
                            value={filterJobPositions}
                            onChange={(e) => setFilterJobPositions(e.target.value as string[])}
                            input={<OutlinedInput label="Poste" />}
                            renderValue={(selected) => selected.length === 0 ? '' : `${selected.length} sél.`}
                        >
                            {uniqueJobPositions.map((position: string) => (
                                <MenuItem key={position} value={position}>
                                    <Checkbox checked={filterJobPositions.includes(position)} size="small" />
                                    <ListItemText primary={position} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                {/* Job Type Filter (Multi-select) - only show if types exist */}
                {uniqueJobTypes.length > 0 && (
                    <FormControl size="small" variant="outlined" sx={{ width: 120 }}>
                        <InputLabel id="filter-type-label">Type</InputLabel>
                        <Select
                            labelId="filter-type-label"
                            multiple
                            value={filterJobTypes}
                            onChange={(e) => setFilterJobTypes(e.target.value as string[])}
                            input={<OutlinedInput label="Type" />}
                            renderValue={(selected) => selected.length === 0 ? '' : `${selected.length} sél.`}
                        >
                            {uniqueJobTypes.map((type: string) => (
                                <MenuItem key={type} value={type}>
                                    <Checkbox checked={filterJobTypes.includes(type)} size="small" />
                                    <ListItemText primary={type} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                {/* Hours Status Filter */}
                <FormControl size="small" variant="outlined" sx={{ width: 120 }}>
                    <InputLabel id="filter-hours-label">Heures</InputLabel>
                    <Select
                        labelId="filter-hours-label"
                        value={filterHoursStatus}
                        label="Heures"
                        onChange={(e) => setFilterHoursStatus(e.target.value as any)}
                    >
                        <MenuItem value="all">Tous</MenuItem>
                        <MenuItem value="over_limit">Dépassement</MenuItem>
                        <MenuItem value="under_50">&lt; 50%</MenuItem>
                        <MenuItem value="ok">OK</MenuItem>
                    </Select>
                </FormControl>

                {/* Name Search */}
                <MuiTextField
                    size="small"
                    placeholder="Nom..."
                    value={filterNameSearch}
                    onChange={(e) => setFilterNameSearch(e.target.value)}
                    sx={{ width: 130 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: filterNameSearch && (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setFilterNameSearch('')} sx={{ p: 0.25 }}>
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />

                {/* Results count and clear button */}
                {hasActiveFilters && (
                    <>
                        <Chip
                            label={`${employees.length}/${rawEmployees.length}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                        <Tooltip title="Effacer filtres">
                            <IconButton size="small" onClick={clearAllFilters} color="error" sx={{ p: 0.25 }}>
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </>
                )}
                </Box>
            </Paper>

            <TableContainer
                component={Paper}
                sx={{
                    maxHeight: '70vh',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    position: 'relative',
                }}
            >
                <Table stickyHeader size="small" sx={{ minWidth: 'max-content' }}>
                    <TableHead>
                        <TableRow>
                            <TableCell
                                sx={(theme) => ({
                                    position: 'sticky',
                                    left: 0,
                                    backgroundColor: theme.palette.background.paper,
                                    zIndex: 999,
                                    fontWeight: 'bold',
                                    minWidth: 220,
                                    maxWidth: 220,
                                    width: 220,
                                    borderRight: `2px solid ${theme.palette.divider}`,
                                    padding: '8px',
                                    boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                                })}
                            >
                                Employé
                            </TableCell>
                            {days.map((day) => {
                                const staffCount = daily_staff_count?.[day] || {
                                    infirmier: 0,
                                    aide_soignant: 0,
                                    stagiaire: 0,
                                    total_soignant: 0
                                };
                                const holiday = isHoliday(day);
                                return (
                                    <TableCell
                                        key={day}
                                        align="center"
                                        sx={(theme) => ({
                                            minWidth: 100,
                                            background: holiday
                                                ? theme.palette.mode === 'dark'
                                                    ? '#4A148C'  // Deep purple for holidays in dark mode
                                                    : '#E1BEE7'  // Light purple for holidays
                                                : isWeekend(day)
                                                    ? theme.palette.mode === 'dark'
                                                        ? theme.palette.grey[800]
                                                        : theme.palette.grey[100]
                                                    : theme.palette.background.paper,
                                            fontWeight: 'bold',
                                            border: holiday ? '2px solid #9C27B0' : undefined,
                                        })}
                                    >
                                        <Box>
                                            <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                                <Typography variant="caption" display="block">
                                                    {getWeekday(day)}
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setDayDetailView({
                                                        day,
                                                        date: `${getWeekday(day)} ${day} ${planning.month_name} ${planning.year}`
                                                    })}
                                                    sx={{ p: 0.25 }}
                                                >
                                                    <ZoomInIcon fontSize="small" sx={{ fontSize: 14 }} />
                                                </IconButton>
                                            </Box>
                                            <Typography variant="body2" fontWeight="bold">
                                                {day} {holiday && '🇱🇺'}
                                            </Typography>
                                            {holiday && (
                                                <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', fontStyle: 'italic', mb: 0.5 }}>
                                                    {holiday}
                                                </Typography>
                                            )}
                                            <Box sx={{ mt: 0.5, fontSize: '0.65rem', lineHeight: 1.2 }}>
                                                <Typography variant="caption" display="block" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                                                    Total: {staffCount.total_soignant}
                                                </Typography>
                                                <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                                                    👨‍⚕️ {staffCount.infirmier} | 🤝 {staffCount.aide_soignant} | 🎓 {staffCount.stagiaire}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {/* Render employees with optional grouping */}
                        {(() => {
                            // Function to render a single employee row
                            const renderEmployeeRow = (employee: any) => {
                            // Calculate total hours safely - filter out undefined/null shifts
                            let totalHours = 0;
                            if (employee.shifts && typeof employee.shifts === 'object') {
                                try {
                                    const shiftValues = Object.values(employee.shifts).filter((shift: any) => shift != null);
                                    totalHours = shiftValues.reduce((sum: number, shift: any) => {
                                        const hours = typeof shift === 'object' && shift.hours != null ? Number(shift.hours) : 0;
                                        return sum + (isNaN(hours) ? 0 : hours);
                                    }, 0);
                                } catch (e) {
                                    console.error('Error calculating total hours for employee:', employee.employee_id, e);
                                    totalHours = 0;
                                }
                            }

                            // Ensure totalHours is a valid number
                            totalHours = isNaN(totalHours) || totalHours == null ? 0 : Number(totalHours);

                            // Check if employee is inactive (off entire month)
                            const isInactive = employee.is_inactive || false;
                            const textOpacity = isInactive ? 0.5 : 1;

                            const isSelected = selectedEmployeeId === employee.employee_id;

                            const isHiddenEmployee = hiddenEmployees.has(employee.employee_id);

                            return (
                                <TableRow
                                    key={employee.employee_id}
                                    hover
                                    sx={(theme) => ({
                                        backgroundColor: isSelected
                                            ? theme.palette.mode === 'dark'
                                                ? 'rgba(255, 193, 7, 0.15)'
                                                : 'rgba(255, 243, 224, 0.8)'
                                            : isInactive
                                                ? theme.palette.mode === 'dark'
                                                    ? theme.palette.grey[800]
                                                    : theme.palette.grey[200]
                                                : theme.palette.background.paper,
                                        opacity: isHiddenEmployee ? 0.4 : textOpacity,
                                        filter: isHiddenEmployee ? 'grayscale(80%)' : 'none',
                                        borderLeft: isSelected ? '4px solid #FFA726' : 'none',
                                        '&:hover': {
                                            backgroundColor: isSelected
                                                ? theme.palette.mode === 'dark'
                                                    ? 'rgba(255, 193, 7, 0.25)'
                                                    : 'rgba(255, 243, 224, 1)'
                                                : isInactive
                                                    ? theme.palette.mode === 'dark'
                                                        ? theme.palette.grey[700]
                                                        : theme.palette.grey[300]
                                                    : undefined
                                        }
                                    })}
                                >
                                    <TableCell
                                        sx={(theme) => ({
                                            position: 'sticky',
                                            left: 0,
                                            backgroundColor: isInactive
                                                ? theme.palette.mode === 'dark'
                                                    ? theme.palette.grey[800]
                                                    : theme.palette.grey[200]
                                                : theme.palette.background.paper,
                                            zIndex: 998,
                                            fontWeight: 'bold',
                                            minWidth: 220,
                                            maxWidth: 220,
                                            width: 220,
                                            borderRight: `2px solid ${theme.palette.divider}`,
                                            verticalAlign: 'top',
                                            padding: '8px',
                                            boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                                        })}
                                    >
                                        <Box display="flex" alignItems="flex-start" gap={1}>
                                            <Tooltip title={hiddenEmployees.has(employee.employee_id) ? "Afficher l'employé" : "Masquer l'employé"}>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleEmployeeVisibility(employee.employee_id);
                                                    }}
                                                    disabled={togglingVisibility === employee.employee_id}
                                                    sx={{ padding: 0.25 }}
                                                >
                                                    {togglingVisibility === employee.employee_id ? (
                                                        <CircularProgress size={16} />
                                                    ) : hiddenEmployees.has(employee.employee_id) ? (
                                                        <VisibilityOffIcon fontSize="small" color="disabled" />
                                                    ) : (
                                                        <VisibilityIcon fontSize="small" />
                                                    )}
                                                </IconButton>
                                            </Tooltip>
                                            <Checkbox
                                                checked={isSelected}
                                                onChange={() => setSelectedEmployeeId(isSelected ? null : employee.employee_id)}
                                                size="small"
                                                sx={{ padding: 0, marginRight: 0.5 }}
                                            />
                                            <Avatar
                                                src={employee.avatar_url || undefined}
                                                alt={employee.abbreviation}
                                                sx={{
                                                    width: 28,
                                                    height: 28,
                                                    bgcolor: employee.color_cell || '#FF0000',
                                                    color: employee.color_text || '#FFFFFF',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {!employee.avatar_url && employee.abbreviation}
                                            </Avatar>
                                            <Box minWidth={0} flex={1}>
                                                <Typography variant="body2" fontWeight="600" sx={{ lineHeight: 1.2, mb: 0.3 }}>
                                                    {employee.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.1, mb: 0.3 }}>
                                                    {employee.abbreviation} • {employee.job_position}
                                                </Typography>
                                                <Typography variant="caption" color={employee.hours_exceeded ? 'error' : 'text.secondary'} display="block" sx={{ lineHeight: 1.1, mb: 0.5 }}>
                                                    {totalHours.toFixed(1)}h / {employee.max_monthly_hours?.toFixed(1)}h
                                                </Typography>
                                                {(isInactive || employee.hours_exceeded || employee.consecutive_days_violation || employee.evening_to_morning_violation) && (
                                                    <Box display="flex" flexWrap="wrap" gap={0.3}>
                                                        {isInactive && <Chip label="Absent" size="small" sx={{ fontSize: '0.6rem', height: 14 }} />}
                                                        {employee.hours_exceeded && (
                                                            <Chip
                                                                label={`⚠️ +${employee.hours_over_limit?.toFixed(1)}h`}
                                                                size="small"
                                                                color="error"
                                                                sx={{ fontSize: '0.6rem', height: 14 }}
                                                            />
                                                        )}
                                                        {employee.consecutive_days_violation && (
                                                            <Tooltip title={`${employee.max_consecutive_days} jours consécutifs - Loi: max 6 jours (44h repos)`}>
                                                                <Chip
                                                                    label={`🚨 ${employee.max_consecutive_days}j`}
                                                                    size="small"
                                                                    color="warning"
                                                                    sx={{ fontSize: '0.6rem', height: 14 }}
                                                                />
                                                            </Tooltip>
                                                        )}
                                                        {employee.evening_to_morning_violation && (
                                                            <Tooltip title={`Soir→Matin interdit: ${employee.evening_to_morning_violations?.length} violation(s)`}>
                                                                <Chip
                                                                    label={`🔴 S→M`}
                                                                    size="small"
                                                                    color="error"
                                                                    sx={{ fontSize: '0.6rem', height: 14 }}
                                                                />
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    {days.map((day) => (
                                        <ShiftCell
                                            key={day}
                                            planningId={planningId}
                                            employeeId={employee.employee_id}
                                            employeeName={employee.name}
                                            employeeDailyHours={employee.daily_hours || 8}
                                            date={`${planning.year}-${String(planning.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
                                            day={day}
                                            shift={employee.shifts[day]}
                                            shiftTypes={shiftTypes}
                                            onUpdate={loadData}
                                            onOptimisticUpdate={updateShiftOptimistically}
                                        />
                                    ))}
                                </TableRow>
                            );
                            };

                            // If grouping is active with group headers (job_position, job_type)
                            if (groupBy !== 'none' && groupedData?.groups) {
                                return groupedData.groups.flatMap((group: { group: string; employees: any[] }, groupIndex: number) => {
                                    const groupEmployees = group.employees || [];
                                    return [
                                        // Group Header Row
                                        <TableRow key={`group-header-${groupIndex}`}>
                                            <TableCell
                                                colSpan={days.length + 1}
                                                sx={(theme) => ({
                                                    backgroundColor: theme.palette.mode === 'dark'
                                                        ? theme.palette.grey[800]
                                                        : theme.palette.grey[200],
                                                    fontWeight: 'bold',
                                                    fontSize: '0.9rem',
                                                    py: 1,
                                                    position: 'sticky',
                                                    left: 0,
                                                    zIndex: 997,
                                                })}
                                            >
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Chip
                                                        label={groupEmployees.length}
                                                        size="small"
                                                        color="primary"
                                                    />
                                                    <Typography variant="subtitle2">
                                                        {group.group}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                        </TableRow>,
                                        // Employee rows for this group
                                        ...groupEmployees.map((emp: any) => {
                                            // Find the full employee data from the calendar employees array
                                            // emp.id comes from API, employee_id is in calendar data
                                            const employee = employees.find((e: any) =>
                                                e.employee_id === emp.id || e.employee_id === emp.employee_id
                                            ) || emp;
                                            return renderEmployeeRow(employee);
                                        })
                                    ];
                                });
                            }

                            // Default: no grouping or flat reordering (alphabetical, hours)
                            // The employees array is already reordered by handleReorderEmployees for flat responses
                            return employees.map((employee: any) => renderEmployeeRow(employee));
                        })()}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Template Generator Dialog */}
            <Dialog open={templateDialog} onClose={() => setTemplateDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Générer planning automatique</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={2}>
                        <Button
                            variant="outlined"
                            onClick={() => handleGenerateTemplate('default')}
                            disabled={generating}
                            fullWidth
                        >
                            Modèle par défaut (tous en matin)
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => handleGenerateTemplate('weekend_off')}
                            disabled={generating}
                            fullWidth
                        >
                            Modèle avec weekends OFF
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => handleGenerateTemplate('rotate_shifts')}
                            disabled={generating}
                            fullWidth
                        >
                            Modèle alterné (matin/soir)
                        </Button>
                        <Alert severity="warning" sx={{ mt: 1 }}>
                            Attention: ceci remplacera toutes les affectations existantes!
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTemplateDialog(false)}>Annuler</Button>
                </DialogActions>
            </Dialog>

            {/* Optimization Dialog */}
            <Dialog open={optimizeDialog} onClose={() => setOptimizeDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <AutoAwesomeIcon color="success" />
                        Optimiser le planning
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={2}>
                        {/* Algorithm Selector */}
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Choisir l'algorithme:
                            </Typography>
                            <ToggleButtonGroup
                                value={selectedAlgorithm}
                                exclusive
                                onChange={(event, newAlgorithm) => {
                                    if (newAlgorithm !== null) {
                                        setSelectedAlgorithm(newAlgorithm);
                                    }
                                }}
                                fullWidth
                                color="primary"
                            >
                                <ToggleButton value="CP-SAT">
                                    <Box display="flex" flexDirection="column" alignItems="center" p={1}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <span>🤖</span>
                                            <Typography variant="body1" fontWeight="bold">CP-SAT</Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Standard
                                        </Typography>
                                    </Box>
                                </ToggleButton>
                                <ToggleButton value="HYBRID">
                                    <Box display="flex" flexDirection="column" alignItems="center" p={1}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <span>🔬</span>
                                            <Typography variant="body1" fontWeight="bold">HYBRID</Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">
                                            GA + CP-SAT (Recommandé)
                                        </Typography>
                                    </Box>
                                </ToggleButton>
                                <ToggleButton value="GA">
                                    <Box display="flex" flexDirection="column" alignItems="center" p={1}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <span>🧬</span>
                                            <Typography variant="body1" fontWeight="bold">GA</Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Expérimental
                                        </Typography>
                                    </Box>
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        {/* Algorithm Description */}
                        {selectedAlgorithm === 'CP-SAT' && (
                            <Alert severity="info">
                                <Typography variant="subtitle2" gutterBottom>
                                    <strong>CP-SAT (Constraint Programming)</strong> - Approche standard
                                </Typography>
                                <Typography variant="body2">
                                    Utilise Google OR-Tools avec configuration par défaut. Rapide et fiable pour
                                    la plupart des plannings. Temps d'exécution: ~60 secondes.
                                </Typography>
                            </Alert>
                        )}

                        {selectedAlgorithm === 'HYBRID' && (
                            <Alert severity="success">
                                <Typography variant="subtitle2" gutterBottom>
                                    <strong>HYBRID (GA + CP-SAT)</strong> - Meilleure qualité (Recommandé)
                                </Typography>
                                <Typography variant="body2">
                                    Combine les deux approches: l'algorithme génétique trouve les meilleurs paramètres,
                                    puis CP-SAT génère la solution. Résultats optimaux mais plus lent (~5 minutes).
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    <strong>⚡ Avantages:</strong> Meilleure qualité de solution, auto-optimisation des paramètres
                                </Typography>
                            </Alert>
                        )}

                        {selectedAlgorithm === 'GA' && (
                            <Alert severity="warning">
                                <Typography variant="subtitle2" gutterBottom>
                                    <strong>GA (Algorithme Génétique Pur)</strong> - Expérimental
                                </Typography>
                                <Typography variant="body2">
                                    Approche purement évolutionnaire. Non recommandé - utilisez HYBRID à la place.
                                    Peut violer certaines contraintes.
                                </Typography>
                            </Alert>
                        )}

                        <Alert severity="success">
                            <Typography variant="subtitle2" gutterBottom>
                                L'optimiseur va créer un planning optimal en respectant:
                            </Typography>
                            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                <li>✅ Heures contractuelles (±1.5h pour les pauses)</li>
                                <li>✅ Maximum mensuel d'heures</li>
                                <li>✅ Maximum 6 jours consécutifs (loi 44h repos)</li>
                                <li>✅ Pas de matin après soir</li>
                                <li>✅ Demandes de congés</li>
                                <li>🏥 <strong>Couverture CONSTANTE: 4 soignants/jour</strong> (TOUS les jours: semaine, weekend, fériés)</li>
                                <li>👨‍⚕️ <strong>Au moins 1 infirmier(ère) en matin ET 1 en soir</strong> (chaque jour)</li>
                                <li>⏰ Au moins 1 personne en matin ET 1 en soir (chaque jour)</li>
                                <li>📊 63% matin / 37% soir (ratio mensuel optimal)</li>
                                <li>⚖️ Distribution équitable et équilibrée (max 3:1 matin/soir)</li>
                            </ul>
                        </Alert>

                        <Alert severity="warning">
                            <strong>Attention:</strong> Cette opération remplacera toutes les affectations existantes!
                            <br />
                            Temps d'optimisation: {selectedAlgorithm === 'HYBRID' ? '~5 minutes' : '~60 secondes'} (max)
                        </Alert>

                        <Box display="flex" justifyContent="center" mt={2}>
                            <Button
                                variant="contained"
                                color="success"
                                size="large"
                                startIcon={<AutoAwesomeIcon />}
                                onClick={handleOptimizePlanning}
                                disabled={optimizing}
                                fullWidth
                            >
                                {optimizing ? 'Optimisation en cours...' : `Lancer l'optimisation (${selectedAlgorithm})`}
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOptimizeDialog(false)} disabled={optimizing}>
                        Annuler
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Shift Creation Dialog */}
            <Dialog open={createShiftDialog} onClose={() => setCreateShiftDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Créer un nouveau shift</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                            <MuiTextField
                                label="Code"
                                value={newShift.code}
                                onChange={(e) => setNewShift({ ...newShift, code: e.target.value.toUpperCase() })}
                                fullWidth
                                required
                                helperText="Ex: M6.5-15, S14-22, N21-7"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <MuiTextField
                                label="Nom"
                                value={newShift.name}
                                onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                                fullWidth
                                required
                                helperText="Ex: Matin 6h30-15h"
                            />
                        </Grid>
                        <Grid item xs={3}>
                            <MuiTextField
                                label="Heure début"
                                type="time"
                                value={newShift.start_time}
                                onChange={(e) => {
                                    const newStartTime = e.target.value;
                                    setNewShift({ ...newShift, start_time: newStartTime });
                                    // Auto-calculate hours if end time is set
                                    if (newShift.end_time) {
                                        const calculatedHours = calculateWorkedHours(newStartTime, newShift.end_time, newShift.break_minutes);
                                        if (calculatedHours !== null) {
                                            setNewShift({ ...newShift, start_time: newStartTime, hours: calculatedHours });
                                        }
                                    }
                                }}
                                fullWidth
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={3}>
                            <MuiTextField
                                label="Heure fin"
                                type="time"
                                value={newShift.end_time}
                                onChange={(e) => {
                                    const newEndTime = e.target.value;
                                    setNewShift({ ...newShift, end_time: newEndTime });
                                    // Auto-calculate hours if start time is set
                                    if (newShift.start_time) {
                                        const calculatedHours = calculateWorkedHours(newShift.start_time, newEndTime, newShift.break_minutes);
                                        if (calculatedHours !== null) {
                                            setNewShift({ ...newShift, end_time: newEndTime, hours: calculatedHours });
                                        }
                                    }
                                }}
                                fullWidth
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={3}>
                            <MuiTextField
                                label="Pause (minutes)"
                                type="number"
                                value={newShift.break_minutes}
                                onChange={(e) => {
                                    const breakMinutes = parseInt(e.target.value) || 0;
                                    setNewShift({ ...newShift, break_minutes: breakMinutes });
                                    // Auto-recalculate hours
                                    if (newShift.start_time && newShift.end_time) {
                                        const calculatedHours = calculateWorkedHours(newShift.start_time, newShift.end_time, breakMinutes);
                                        if (calculatedHours !== null) {
                                            setNewShift({ ...newShift, break_minutes: breakMinutes, hours: calculatedHours });
                                        }
                                    }
                                }}
                                fullWidth
                                inputProps={{ min: 0, max: 120, step: 5 }}
                                helperText="0, 30, 60 min..."
                            />
                        </Grid>
                        <Grid item xs={3}>
                            <MuiTextField
                                label="Heures travaillées"
                                type="number"
                                value={newShift.hours}
                                onChange={(e) => setNewShift({ ...newShift, hours: parseFloat(e.target.value) || 0 })}
                                fullWidth
                                required
                                inputProps={{ step: 0.5, min: 0, max: 12 }}
                                helperText="Auto-calculé"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Catégorie</InputLabel>
                                <Select
                                    value={newShift.shift_category}
                                    onChange={(e) => setNewShift({ ...newShift, shift_category: e.target.value })}
                                    label="Catégorie"
                                >
                                    <MenuItem value="MORNING">Matin</MenuItem>
                                    <MenuItem value="EVENING">Soir</MenuItem>
                                    <MenuItem value="NIGHT">Nuit</MenuItem>
                                    <MenuItem value="DAY">Journée</MenuItem>
                                    <MenuItem value="OFF">Jour OFF</MenuItem>
                                    <MenuItem value="LEAVE">Congé</MenuItem>
                                    <MenuItem value="TRAINING">Formation</MenuItem>
                                    <MenuItem value="OTHER">Autre</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <MuiTextField
                                label="Couleur"
                                type="color"
                                value={newShift.color_code}
                                onChange={(e) => setNewShift({ ...newShift, color_code: e.target.value })}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            {shiftValidationError && (
                                <Alert severity="error" sx={{ mb: 1 }}>
                                    {shiftValidationError}
                                </Alert>
                            )}
                            {newShift.start_time && newShift.end_time && !shiftValidationError && (
                                <Alert severity="info" sx={{ mb: 1 }}>
                                    Calcul: {(() => {
                                        const [startHour, startMin] = newShift.start_time.split(':').map(Number);
                                        const [endHour, endMin] = newShift.end_time.split(':').map(Number);
                                        let startMinutes = startHour * 60 + startMin;
                                        let endMinutes = endHour * 60 + endMin;
                                        if (endMinutes <= startMinutes) endMinutes += 24 * 60;
                                        const totalMinutes = endMinutes - startMinutes;
                                        const totalHours = (totalMinutes / 60).toFixed(1);
                                        const breakHours = (newShift.break_minutes / 60).toFixed(1);
                                        const workedHours = ((totalMinutes - newShift.break_minutes) / 60).toFixed(1);
                                        return `${totalHours}h total - ${breakHours}h pause = ${workedHours}h travaillées`;
                                    })()}
                                </Alert>
                            )}
                            <Alert severity="info">
                                Les shifts créés seront disponibles immédiatement dans le planning pour tous les employés.
                            </Alert>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateShiftDialog(false)}>Annuler</Button>
                    <Button
                        onClick={handleCreateShift}
                        variant="contained"
                        color="primary"
                        disabled={!newShift.code || !newShift.name || !newShift.start_time || !newShift.end_time}
                    >
                        Créer le shift
                    </Button>
                </DialogActions>
            </Dialog>

            {/* CSV Import Dialog */}
            <Dialog open={csvImportDialog} onClose={() => setCsvImportDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Importer des shifts depuis un fichier CSV</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={2}>
                        <Alert severity="info">
                            <Typography variant="body2" gutterBottom>
                                <strong>Formats CSV supportés:</strong>
                            </Typography>

                            <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                                <strong>1. Format simple (ID ou abréviation):</strong>
                            </Typography>
                            <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace', backgroundColor: '#f5f5f5', p: 1, borderRadius: 1 }}>
{`abbreviation,date,shift_code
AC,2025-12-01,M6.5-15
BH,2025-12-01,S13.5-22`}
                            </Typography>

                            <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                                <strong>2. Format grille (plannings officiels):</strong>
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                                Format automatiquement détecté - employés en lignes, jours en colonnes
                            </Typography>

                            <Typography variant="body2" sx={{ mt: 2 }}>
                                ℹ️ <strong>Notes:</strong><br/>
                                • Vous pouvez utiliser <strong>abbreviation</strong> (ex: AC, BH) ou <strong>employee_id</strong><br/>
                                • Format de date: YYYY-MM-DD<br/>
                                • Les codes OFF, CP (congés), et "cours" sont ignorés<br/>
                                • Les shifts importés seront <strong>protégés de l'optimiseur</strong>
                            </Typography>
                        </Alert>

                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                            style={{
                                padding: '10px',
                                border: '2px dashed #ccc',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        />

                        {csvFile && (
                            <Alert severity="success">
                                Fichier sélectionné: <strong>{csvFile.name}</strong>
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setCsvImportDialog(false);
                        setCsvFile(null);
                    }}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleCsvImport}
                        variant="contained"
                        color="primary"
                        disabled={!csvFile || importing}
                        startIcon={importing ? null : <UploadFileIcon />}
                    >
                        {importing ? 'Import en cours...' : 'Importer'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Analysis Dialog */}
            <Dialog open={analysisDialog} onClose={() => setAnalysisDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <AssessmentIcon />
                        <Typography variant="h6">Analyse de Planning</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {analysisData && (
                        <Box display="flex" flexDirection="column" gap={3} mt={2}>
                            {/* Efficiency Score */}
                            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                                <CardContent>
                                    <Box display="flex" alignItems="center" justifyContent="space-between">
                                        <Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                {analysisData.efficiency_score?.toFixed(1) || 0}%
                                            </Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                                Score d'Efficacité
                                            </Typography>
                                        </Box>
                                        <TrendingUpIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                                    </Box>
                                </CardContent>
                            </Card>

                            {/* Current State Summary */}
                            <Box>
                                <Typography variant="h6" gutterBottom>État Actuel</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="h5" color="primary">
                                                {analysisData.current_state.total_assignments}
                                            </Typography>
                                            <Typography variant="caption">Affectations Totales</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="h5" color="success.main">
                                                {analysisData.current_state.manual_assignments}
                                            </Typography>
                                            <Typography variant="caption">Affectations Manuelles</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="h5" color="info.main">
                                                {analysisData.current_state.optimizer_assignments}
                                            </Typography>
                                            <Typography variant="caption">Affectations Auto</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography variant="h5" color="warning.main">
                                                {analysisData.current_state.total_hours?.toFixed(1) || 0}h
                                            </Typography>
                                            <Typography variant="caption">Heures Totales</Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* Optimization Opportunities */}
                            {analysisData.unassigned_opportunities?.underutilized_employees?.length > 0 && (
                                <Box>
                                    <Typography variant="h6" gutterBottom color="warning.main">
                                        💡 Opportunités d'amélioration ({analysisData.unassigned_opportunities.underutilized_employees.length})
                                    </Typography>
                                    <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Nom</TableCell>
                                                    <TableCell align="right">Utilisation</TableCell>
                                                    <TableCell align="right">Heures</TableCell>
                                                    <TableCell align="right">Jours consécutifs</TableCell>
                                                    <TableCell>Problèmes</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {analysisData.unassigned_opportunities.underutilized_employees.map((emp: any) => (
                                                    <TableRow key={emp.employee_id}>
                                                        <TableCell>
                                                            <strong>{emp.abbreviation}</strong> - {emp.name}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Chip
                                                                label={`${emp.utilization?.toFixed(0) || 0}%`}
                                                                color={emp.utilization < 80 ? 'error' : 'warning'}
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {emp.current_hours?.toFixed(1) || 0}h / {emp.max_hours?.toFixed(1) || 0}h
                                                            <br/>
                                                            <Typography variant="caption" color="warning.main">
                                                                +{emp.available_hours?.toFixed(1) || 0}h disponible
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Chip
                                                                label={emp.max_consecutive_days || 0}
                                                                color={emp.max_consecutive_days >= 6 ? 'error' : 'default'}
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            {emp.issues?.map((issue: string, idx: number) => (
                                                                <Typography key={idx} variant="caption" display="block" color="text.secondary">
                                                                    • {issue}
                                                                </Typography>
                                                            ))}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}

                            {/* Proposed Changes */}
                            {analysisData.proposed_changes?.length > 0 && (
                                <Box>
                                    <Typography variant="h6" gutterBottom color="success.main">
                                        🔧 Modifications Proposées ({analysisData.proposed_changes.length})
                                    </Typography>
                                    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Employé</TableCell>
                                                    <TableCell>Action</TableCell>
                                                    <TableCell align="right">Shifts</TableCell>
                                                    <TableCell align="right">Heures</TableCell>
                                                    <TableCell align="right">Utilisation cible</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {analysisData.proposed_changes.map((change: any, idx: number) => (
                                                    <TableRow key={idx}>
                                                        <TableCell>
                                                            <strong>{change.employee_abbr}</strong>
                                                            <Typography variant="caption" display="block" color="text.secondary">
                                                                {change.employee_name}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2">
                                                                {change.action}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {change.reason}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Chip
                                                                label={change.shifts_needed || 0}
                                                                color="primary"
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            +{change.hours_to_add?.toFixed(1) || 0}h
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {change.current_utilization?.toFixed(0)}%
                                                                </Typography>
                                                                <Typography variant="caption">→</Typography>
                                                                <Typography variant="caption" color="success.main" fontWeight="bold">
                                                                    {change.target_utilization}%
                                                                </Typography>
                                                            </Box>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}

                            {/* Suggestions */}
                            {analysisData.improvement_suggestions?.length > 0 && (
                                <Box>
                                    <Typography variant="h6" gutterBottom>
                                        💡 Résumé des Suggestions
                                    </Typography>
                                    <Box display="flex" flexDirection="column" gap={1}>
                                        {analysisData.improvement_suggestions.map((suggestion: any, idx: number) => (
                                            <Alert
                                                key={idx}
                                                severity={suggestion.priority === 'high' ? 'error' : suggestion.priority === 'medium' ? 'warning' : 'info'}
                                                icon={
                                                    suggestion.type === 'underutilization' ? <TrendingUpIcon /> :
                                                    suggestion.type === 'low_coverage' ? <AssessmentIcon /> :
                                                    <AssessmentIcon />
                                                }
                                            >
                                                <Typography variant="body2" fontWeight="bold">
                                                    {suggestion.type === 'underutilization' ? '📊 Sous-utilisation' :
                                                     suggestion.type === 'low_coverage' ? '⚠️ Couverture faible' :
                                                     '📈 Déséquilibre de charge'}
                                                </Typography>
                                                <Typography variant="body2">{suggestion.title}</Typography>
                                                {suggestion.description && (
                                                    <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.8 }}>
                                                        {suggestion.description}
                                                    </Typography>
                                                )}
                                            </Alert>
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {/* No Suggestions */}
                            {(!analysisData.improvement_suggestions || analysisData.improvement_suggestions.length === 0) && (
                                <Alert severity="success">
                                    ✅ Aucune suggestion d'amélioration - le planning semble optimal!
                                </Alert>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAnalysisDialog(false)}>
                        Fermer
                    </Button>
                    {analysisData && analysisData.improvement_suggestions?.length > 0 && (
                        <Button
                            onClick={() => handleApplySuggestions(false)}
                            variant="contained"
                            color="primary"
                            disabled={applyingSuggestions}
                            startIcon={applyingSuggestions ? null : <AutoAwesomeIcon />}
                        >
                            {applyingSuggestions ? 'Application...' : 'Appliquer les suggestions'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Validation Results Dialog */}
            <Dialog
                open={validationDialog}
                onClose={() => setValidationDialog(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <CheckCircleIcon color={validationResults?.employees_with_errors === 0 ? 'success' : 'error'} />
                        <Typography variant="h6">
                            Résultats de Validation - {planning?.month_name} {planning?.year}
                        </Typography>
                        {validationResults?.employees_with_errors === 0 ? (
                            <Chip label="Valide" color="success" size="small" />
                        ) : (
                            <Chip label="Erreurs détectées" color="error" size="small" />
                        )}
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {validationResults && (
                        <Box display="flex" flexDirection="column" gap={3} mt={2}>
                            {/* Summary Cards */}
                            <Grid container spacing={2}>
                                <Grid item xs={3}>
                                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="h4" color="primary">
                                            {validationResults.total_employees || 0}
                                        </Typography>
                                        <Typography variant="caption">Employés</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={3}>
                                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="h4" color="success.main">
                                            {(validationResults.total_employees || 0) - (validationResults.employees_with_errors || 0) - (validationResults.employees_with_warnings || 0)}
                                        </Typography>
                                        <Typography variant="caption">OK</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={3}>
                                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="h4" color="warning.main">
                                            {validationResults.employees_with_warnings || 0}
                                        </Typography>
                                        <Typography variant="caption">Avertissements</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={3}>
                                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="h4" color="error">
                                            {validationResults.employees_with_errors || 0}
                                        </Typography>
                                        <Typography variant="caption">Erreurs</Typography>
                                    </Paper>
                                </Grid>
                            </Grid>

                            {/* Employee-by-Employee Results */}
                            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Employé</TableCell>
                                            <TableCell align="center">Heures</TableCell>
                                            <TableCell align="center">Jours consécutifs</TableCell>
                                            <TableCell align="center">Soir→Matin</TableCell>
                                            <TableCell>Statut</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {validationResults.results?.map((emp: any) => (
                                            <TableRow
                                                key={emp.employee_id}
                                                sx={{
                                                    backgroundColor: emp.has_errors
                                                        ? 'rgba(244, 67, 54, 0.1)'
                                                        : emp.has_warnings
                                                            ? 'rgba(255, 152, 0, 0.1)'
                                                            : 'inherit'
                                                }}
                                            >
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                                                            {emp.abbreviation}
                                                        </Avatar>
                                                        <Typography variant="body2">{emp.name}</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title={emp.checks?.hours?.message || ''}>
                                                        <Box>
                                                            <Typography
                                                                color={emp.checks?.hours?.status === 'error' ? 'error' : 'inherit'}
                                                                fontWeight={emp.checks?.hours?.status === 'error' ? 'bold' : 'normal'}
                                                            >
                                                                {emp.checks?.hours?.current?.toFixed(1)}h / {emp.checks?.hours?.limit?.toFixed(1)}h
                                                            </Typography>
                                                            {emp.checks?.hours?.status === 'error' && (
                                                                <Typography variant="caption" color="error">
                                                                    +{emp.checks?.hours?.over_by?.toFixed(1)}h
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title={emp.checks?.consecutive_days?.message || ''}>
                                                        <Chip
                                                            label={`${emp.checks?.consecutive_days?.max_consecutive || 0}j`}
                                                            size="small"
                                                            color={emp.checks?.consecutive_days?.status === 'error' ? 'error' : 'default'}
                                                        />
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title={emp.checks?.evening_morning?.message || ''}>
                                                        {emp.checks?.evening_morning?.violations > 0 ? (
                                                            <Chip
                                                                label={emp.checks?.evening_morning?.violations}
                                                                size="small"
                                                                color="error"
                                                            />
                                                        ) : (
                                                            <CheckCircleIcon color="success" fontSize="small" />
                                                        )}
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>
                                                    {emp.has_errors ? (
                                                        <Chip label="Erreur" size="small" color="error" />
                                                    ) : emp.has_warnings ? (
                                                        <Chip label="Avertissement" size="small" color="warning" />
                                                    ) : (
                                                        <Chip label="OK" size="small" color="success" />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setValidationDialog(false)}>Fermer</Button>
                    <Button
                        onClick={handleRefreshData}
                        startIcon={<RefreshIcon />}
                        variant="outlined"
                    >
                        Actualiser
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Day Detail View */}
            {dayDetailView && (
                <DayDetailView
                    day={dayDetailView.day}
                    date={dayDetailView.date}
                    employees={employees}
                    shiftTypes={shiftTypes}
                    planningId={planningId}
                    planning={planning}
                    onClose={() => setDayDetailView(null)}
                    onUpdate={loadData}
                />
            )}

            {/* AI Assistant FAB Button */}
            <Fab
                color="secondary"
                aria-label="AI Assistant"
                onClick={() => setAiChatOpen(true)}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    },
                }}
            >
                <PsychologyIcon />
            </Fab>

            {/* AI Chat Dialog */}
            <Dialog
                open={aiChatOpen}
                onClose={() => setAiChatOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogContent sx={{ p: 0 }}>
                    <OptimizerAIChat
                        planningId={planningId}
                        month={planning.month}
                        year={planning.year}
                        failureMessage={optimizerFailureMessage}
                        onClose={() => setAiChatOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </Box>
    );
};

// =============== PLANNING SHOW WITH CALENDAR ===============
export const PlanningShow = () => {
    const planningId = parseInt(window.location.hash.match(/\/(\d+)\/show/)?.[1] || '0');

    return (
        <Show>
            <Box p={2}>
                {/* School Calendar Update Banner */}
                <SchoolCalendarUpdateBanner />

                <Card>
                    <CardContent>
                        <PlanningCalendar planningId={planningId} />
                    </CardContent>
                </Card>
            </Box>
        </Show>
    );
};
