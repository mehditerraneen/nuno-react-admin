/**
 * FullCalendar-based Planning View
 * An alternative visualization using FullCalendar DayGrid Month view
 */
import React, { useState, useEffect, useCallback } from 'react';
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
    Chip,
    ToggleButtonGroup,
    ToggleButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    OutlinedInput,
    ListItemText,
    Checkbox,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssessmentIcon from '@mui/icons-material/Assessment';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
import TableChartIcon from '@mui/icons-material/TableChart';
import { Link as RouterLink } from 'react-router-dom';

// FullCalendar imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventContentArg, DayCellContentArg, DateClickArg, EventClickArg } from '@fullcalendar/core';

import { authenticatedFetch } from './dataProvider';
import './planning-fullcalendar.css';

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

export const PlanningFullCalendarList = () => (
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
export const PlanningFullCalendarCreate = () => {
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
export const PlanningFullCalendarEdit = () => {
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
        </Edit>
    );
};

// =============== DAY DETAIL VIEW (Modal for day click) ===============
interface DayDetailViewProps {
    day: number;
    date: string;
    employees: any[];
    shiftTypes: any[];
    planningId: number;
    planning: any;
    onClose: () => void;
    onUpdate: () => void;
}

const DayDetailView: React.FC<DayDetailViewProps> = ({
    day,
    date,
    employees,
    shiftTypes,
    planningId,
    planning,
    onClose,
    onUpdate
}) => {
    const notify = useNotify();
    const [editingEmployee, setEditingEmployee] = useState<number | null>(null);
    const [selectedShift, setSelectedShift] = useState<number | null>(null);

    const handleSaveShift = async (employeeId: number) => {
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

                const shiftCode = shift.shift_code || '';
                const nonWorkCodes = ['OFF', 'CP6.4', 'CP8', 'CONG', 'FORM'];
                if (nonWorkCodes.includes(shiftCode)) return;

                const shiftType = shiftTypes.find(st => st.code === shiftCode);
                if (!shiftType || !shiftType.start_time || !shiftType.end_time) return;

                let startMin = timeToMinutes(shiftType.start_time);
                let endMin = timeToMinutes(shiftType.end_time);

                if (endMin <= startMin) endMin += 24 * 60;

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

    // Get employees with OFF or leave
    const offEmployees = employees.filter(emp => {
        const shift = emp.shifts?.[day];
        if (!shift) return false;

        const shiftCode = shift.shift_code || '';
        const nonWorkCodes = ['OFF', 'CP6.4', 'CP8', 'CONG', 'FORM'];

        return nonWorkCodes.includes(shiftCode);
    });

    // Get employees with no assignment
    const unassignedEmployees = employees.filter(emp => {
        const shift = emp.shifts?.[day];
        return !shift;
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
                                    <Grid item xs={3}>
                                        <Typography variant="caption" color="text.secondary">
                                            Personnel en service
                                        </Typography>
                                        <Typography variant="h4" color="primary">
                                            {workingEmployees.length}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={3}>
                                        <Typography variant="caption" color="text.secondary">
                                            Couverture maximale
                                        </Typography>
                                        <Typography variant="h4" color="success.main">
                                            {maxCoverage} personnes
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={3}>
                                        <Typography variant="caption" color="text.secondary">
                                            OFF / Congé
                                        </Typography>
                                        <Typography variant="h4" color="warning.main">
                                            {offEmployees.length}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={3}>
                                        <Typography variant="caption" color="text.secondary">
                                            Non assignés
                                        </Typography>
                                        <Typography variant="h4" color="error.main">
                                            {unassignedEmployees.length}
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
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 100, mt: 2 }}>
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

                    {/* Employees Table */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                            Affectations du jour
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Employé</TableCell>
                                        <TableCell>Poste</TableCell>
                                        <TableCell>Shift</TableCell>
                                        <TableCell>Heures</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {employees.map((emp: any) => {
                                        const shift = emp.shifts?.[day];
                                        const shiftCode = shift?.shift_code || '';
                                        const shiftType = shiftTypes.find(st => st.code === shiftCode);
                                        const isEditing = editingEmployee === emp.employee_id;

                                        return (
                                            <TableRow key={emp.employee_id} hover>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <Avatar
                                                            src={emp.avatar_url}
                                                            sx={{
                                                                width: 28,
                                                                height: 28,
                                                                bgcolor: emp.color_cell,
                                                                color: emp.color_text,
                                                                fontSize: '0.7rem'
                                                            }}
                                                        >
                                                            {!emp.avatar_url && emp.abbreviation}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="body2">{emp.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {emp.abbreviation}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption">{emp.job_position}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {isEditing ? (
                                                        <Select
                                                            size="small"
                                                            value={selectedShift || shiftType?.id || ''}
                                                            onChange={(e) => setSelectedShift(Number(e.target.value))}
                                                            sx={{ minWidth: 120 }}
                                                        >
                                                            <MenuItem value="">-- Aucun --</MenuItem>
                                                            {shiftTypes
                                                                .filter(st => Math.abs(st.hours - (emp.daily_hours || 8)) <= 1.5 || ['OFF', 'CP6.4', 'CP8', 'CONG', 'FORM'].includes(st.code))
                                                                .map(st => (
                                                                    <MenuItem key={st.id} value={st.id}>
                                                                        {st.code} ({st.hours}h)
                                                                    </MenuItem>
                                                                ))
                                                            }
                                                        </Select>
                                                    ) : shift ? (
                                                        <Chip
                                                            label={shiftCode}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: shift.color || shiftType?.color_code || '#CCCCCC',
                                                                color: '#fff',
                                                                fontWeight: 'bold'
                                                            }}
                                                        />
                                                    ) : (
                                                        <Typography variant="caption" color="text.secondary">-</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {shift ? `${shift.hours || 0}h` : '-'}
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
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => {
                                                                setEditingEmployee(emp.employee_id);
                                                                setSelectedShift(shiftType?.id || null);
                                                            }}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
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

// =============== FULLCALENDAR MAIN COMPONENT ===============
interface PlanningFCCalendarProps {
    planningId: number;
}

const PlanningFCCalendar: React.FC<PlanningFCCalendarProps> = ({ planningId }) => {
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const refresh = useRefresh();
    const [loading, setLoading] = useState(true);
    const [calendarData, setCalendarData] = useState<any>(null);
    const [shiftTypes, setShiftTypes] = useState<any[]>([]);

    // Day detail view state
    const [dayDetailView, setDayDetailView] = useState<{ day: number; date: string } | null>(null);

    // Dialog states
    const [optimizeDialog, setOptimizeDialog] = useState(false);
    const [csvImportDialog, setCsvImportDialog] = useState(false);
    const [validationDialog, setValidationDialog] = useState(false);

    // Operation states
    const [optimizing, setOptimizing] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [validating, setValidating] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    // CSV file state
    const [csvFile, setCsvFile] = useState<File | null>(null);

    // Algorithm selection
    const [selectedAlgorithm, setSelectedAlgorithm] = useState<'CP-SAT' | 'GA' | 'HYBRID'>('CP-SAT');

    // Validation results
    const [validationResults, setValidationResults] = useState<any>(null);

    // Filter state
    const [filterEmployees, setFilterEmployees] = useState<number[]>([]);
    const [filterJobPositions, setFilterJobPositions] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, [planningId]);

    const loadData = async () => {
        try {
            setLoading(true);

            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const calendarResponse = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/calendar`);
            const calendarData = await calendarResponse.json();

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

    // Convert planning data to FullCalendar events
    const getCalendarEvents = useCallback(() => {
        if (!calendarData || !calendarData.employees) return [];

        const { planning, employees } = calendarData;
        const events: any[] = [];

        // Filter employees
        let filteredEmployees = employees;
        if (filterEmployees.length > 0) {
            filteredEmployees = employees.filter((emp: any) => filterEmployees.includes(emp.employee_id));
        }
        if (filterJobPositions.length > 0) {
            filteredEmployees = filteredEmployees.filter((emp: any) => filterJobPositions.includes(emp.job_position));
        }

        // Create events for each employee's shifts
        filteredEmployees.forEach((emp: any) => {
            if (!emp.shifts) return;

            Object.entries(emp.shifts).forEach(([day, shift]: [string, any]) => {
                if (!shift || !shift.shift_code) return;

                const dayNum = parseInt(day);
                const dateStr = `${planning.year}-${String(planning.month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

                const nonWorkCodes = ['OFF', 'CP6.4', 'CP8', 'CONG', 'FORM'];
                const isOff = nonWorkCodes.includes(shift.shift_code);

                events.push({
                    id: `${emp.employee_id}-${day}`,
                    start: dateStr,
                    allDay: true,
                    title: `${emp.abbreviation}: ${shift.shift_code}`,
                    backgroundColor: isOff ? '#9E9E9E' : (shift.color || '#4A90E2'),
                    borderColor: isOff ? '#757575' : (shift.color || '#4A90E2'),
                    textColor: '#fff',
                    extendedProps: {
                        employeeId: emp.employee_id,
                        employeeName: emp.name,
                        abbreviation: emp.abbreviation,
                        shiftCode: shift.shift_code,
                        hours: shift.hours,
                        source: shift.source,
                        isOff
                    }
                });
            });
        });

        return events;
    }, [calendarData, filterEmployees, filterJobPositions]);

    // Handle date click - open day detail view
    const handleDateClick = (arg: DateClickArg) => {
        const date = arg.date;
        const day = date.getDate();
        const dateStr = arg.dateStr;

        setDayDetailView({ day, date: dateStr });
    };

    // Handle event click
    const handleEventClick = (arg: EventClickArg) => {
        const date = arg.event.start;
        if (date) {
            const day = date.getDate();
            const dateStr = arg.event.startStr;
            setDayDetailView({ day, date: dateStr });
        }
    };

    // Render custom day cell content
    const renderDayCellContent = (arg: DayCellContentArg) => {
        if (!calendarData) return { html: String(arg.dayNumberText) };

        const day = arg.date.getDate();
        const month = arg.date.getMonth() + 1;
        const year = arg.date.getFullYear();

        // Only show staff count for the planning month
        if (month !== calendarData.planning?.month || year !== calendarData.planning?.year) {
            return { html: String(arg.dayNumberText) };
        }

        const staffCount = calendarData.daily_staff_count?.[day];
        const holiday = calendarData.luxembourg_holidays?.[day];

        return (
            <Box className="fc-day-cell-content">
                <Typography variant="body2" fontWeight="bold" className="fc-day-number">
                    {arg.dayNumberText}
                </Typography>
                {holiday && (
                    <Chip
                        label={holiday}
                        size="small"
                        color="secondary"
                        sx={{ fontSize: '0.6rem', height: 16, mt: 0.5 }}
                    />
                )}
                {staffCount && (
                    <Typography variant="caption" color="primary" display="block" sx={{ mt: 0.5 }}>
                        {staffCount.total_soignant || 0} staff
                    </Typography>
                )}
            </Box>
        );
    };

    // Render custom event content
    const renderEventContent = (arg: EventContentArg) => {
        const { abbreviation, shiftCode, hours, source, isOff } = arg.event.extendedProps;

        return (
            <Tooltip title={`${arg.event.extendedProps.employeeName} - ${shiftCode} (${hours}h)`}>
                <Box
                    className="fc-event-content"
                    sx={{
                        fontSize: '0.65rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        borderLeft: source === 'OPTIMIZER' ? '2px solid #2196F3' : undefined,
                        opacity: isOff ? 0.7 : 1,
                        pl: source === 'OPTIMIZER' ? 0.5 : 0,
                    }}
                >
                    {abbreviation}: {shiftCode}
                </Box>
            </Tooltip>
        );
    };

    // Get day cell class names for styling
    const getDayCellClassNames = (arg: { date: Date }) => {
        const classes: string[] = [];
        const dayOfWeek = arg.date.getDay();
        const day = arg.date.getDate();
        const month = arg.date.getMonth() + 1;
        const year = arg.date.getFullYear();

        // Weekend styling
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            classes.push('fc-day-weekend');
        }

        // Holiday styling
        if (calendarData?.luxembourg_holidays?.[day] &&
            month === calendarData.planning?.month &&
            year === calendarData.planning?.year) {
            classes.push('fc-day-holiday');
        }

        // Today styling
        const today = new Date();
        if (arg.date.toDateString() === today.toDateString()) {
            classes.push('fc-day-today-custom');
        }

        return classes;
    };

    // Optimization handler
    const handleOptimizePlanning = async () => {
        try {
            setOptimizing(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const timeLimit = selectedAlgorithm === 'HYBRID' ? 300 : 60;

            const response = await authenticatedFetch(
                `${apiUrl}/planning/monthly-planning/${planningId}/optimize`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        min_daily_coverage: 4,
                        morning_coverage_ratio: 0.63,
                        time_limit_seconds: timeLimit,
                        preserve_existing: false,
                        algorithm: selectedAlgorithm
                    })
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Optimization failed');
            }

            const result = await response.json();
            notify(
                `Optimisation réussie! ${result.assignments_created} affectations créées`,
                { type: 'success' }
            );

            setOptimizeDialog(false);
            loadData();
            refresh();
        } catch (error: any) {
            console.error('Error optimizing planning:', error);
            notify(`Erreur: ${error.message}`, { type: 'error' });
        } finally {
            setOptimizing(false);
        }
    };

    // Clear optimizer shifts
    const handleClearOptimizerShifts = async () => {
        if (!window.confirm('Effacer tous les shifts générés par l\'optimiseur?')) return;

        try {
            setClearing(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(
                `${apiUrl}/planning/monthly-planning/${planningId}/clear-optimizer-shifts`,
                { method: 'POST' }
            );

            if (!response.ok) throw new Error('Clear failed');

            const result = await response.json();
            notify(result.message, { type: 'success' });
            loadData();
        } catch (error: any) {
            notify(`Erreur: ${error.message}`, { type: 'error' });
        } finally {
            setClearing(false);
        }
    };

    // CSV Import handler
    const handleCsvImport = async () => {
        if (!csvFile) {
            notify('Veuillez sélectionner un fichier CSV', { type: 'error' });
            return;
        }

        try {
            setImporting(true);
            const text = await csvFile.text();
            const lines = text.split('\n').filter(line => line.trim());

            if (lines.length < 2) throw new Error('CSV file is empty');

            const headers = lines[0].split(',').map(h => h.toLowerCase().trim());
            const shifts = lines.slice(1).map(line => {
                const values = line.split(',');
                const row: any = {};
                headers.forEach((header, index) => {
                    row[header] = values[index]?.trim();
                });
                return row;
            }).filter(row => row.employee_id && row.date && row.shift_code);

            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/import-csv`, {
                method: 'POST',
                body: JSON.stringify({ shifts })
            });

            if (!response.ok) throw new Error('Import failed');

            const result = await response.json();
            notify(`${result.imported_count} shifts importés`, { type: 'success' });
            setCsvImportDialog(false);
            setCsvFile(null);
            loadData();
        } catch (error: any) {
            notify(`Erreur: ${error.message}`, { type: 'error' });
        } finally {
            setImporting(false);
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

            if (!response.ok) throw new Error('Validation failed');

            const data = await response.json();
            setValidationResults(data);
            setValidationDialog(true);
            notify('Validation terminée', { type: 'success' });
        } catch (error: any) {
            notify(`Erreur: ${error.message}`, { type: 'error' });
        } finally {
            setValidating(false);
        }
    };

    // PDF Export handler
    const handleExportPdf = async () => {
        try {
            setExportingPdf(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/pdf`);

            if (!response.ok) throw new Error('Export PDF failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `planning_${calendarData?.planning?.year || 'unknown'}_${String(calendarData?.planning?.month || 0).padStart(2, '0')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            notify('PDF exporté', { type: 'success' });
        } catch (error: any) {
            notify(`Erreur: ${error.message}`, { type: 'error' });
        } finally {
            setExportingPdf(false);
        }
    };

    // Refresh handler
    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            await loadData();
            notify('Données actualisées', { type: 'success' });
        } catch (error) {
            notify('Erreur lors de l\'actualisation', { type: 'error' });
        } finally {
            setRefreshing(false);
        }
    };

    // Status change handler
    const handleStatusChange = async (newStatus: string) => {
        try {
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) throw new Error('Failed to update status');

            notify(`Statut changé en ${newStatus === 'DRAFT' ? 'Brouillon' : newStatus === 'PUBLISHED' ? 'Publié' : 'Verrouillé'}`, { type: 'success' });
            loadData();
        } catch (error) {
            notify('Erreur lors du changement de statut', { type: 'error' });
        }
    };

    if (loading) return <Loading />;
    if (!calendarData) return <Typography>Aucune donnée</Typography>;

    const { planning, employees, luxembourg_holidays } = calendarData;
    const isDraft = planning?.status === 'DRAFT';

    // Get unique job positions for filter
    const uniqueJobPositions = [...new Set(employees.map((e: any) => e.job_position).filter(Boolean))].sort();

    // Status config
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'DRAFT':
                return { color: 'default' as const, label: 'Brouillon', icon: '📝' };
            case 'PUBLISHED':
                return { color: 'success' as const, label: 'Publié', icon: '✅' };
            case 'LOCKED':
                return { color: 'error' as const, label: 'Verrouillé', icon: '🔒' };
            default:
                return { color: 'default' as const, label: status, icon: '' };
        }
    };

    const initialDate = `${planning.year}-${String(planning.month).padStart(2, '0')}-01`;

    return (
        <Box className="planning-fullcalendar">
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h6">
                        {planning.month_name} {planning.year}
                    </Typography>
                    {/* Status selector */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                            value={planning.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            renderValue={(value) => (
                                <Chip
                                    label={`${getStatusConfig(value).icon} ${getStatusConfig(value).label}`}
                                    color={getStatusConfig(value).color}
                                    size="small"
                                />
                            )}
                            sx={{
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                            }}
                        >
                            <MenuItem value="DRAFT">📝 Brouillon</MenuItem>
                            <MenuItem value="PUBLISHED">✅ Publié</MenuItem>
                            <MenuItem value="LOCKED">🔒 Verrouillé</MenuItem>
                        </Select>
                    </FormControl>
                    {planning.last_optimized_at && (
                        <Chip
                            icon={<AutoAwesomeIcon />}
                            label={`Optimisé ${new Date(planning.last_optimized_at).toLocaleDateString('fr-FR')}`}
                            color="success"
                            size="small"
                            variant="outlined"
                        />
                    )}
                    {/* Link to standard view */}
                    <Tooltip title="Voir en vue tableau">
                        <Button
                            component={RouterLink}
                            to={`/planning/monthly-planning/${planningId}/show`}
                            startIcon={<TableChartIcon />}
                            size="small"
                            variant="outlined"
                            label="Vue tableau"
                        />
                    </Tooltip>
                </Box>
                <Box display="flex" gap={1} flexWrap="wrap">
                    <Button
                        startIcon={<RefreshIcon />}
                        onClick={handleRefresh}
                        disabled={refreshing}
                        label={refreshing ? 'Actualisation...' : 'Actualiser'}
                    />
                    <Tooltip title={!isDraft ? "Disponible uniquement en mode Brouillon" : ""}>
                        <span>
                            <Button
                                startIcon={<AutoAwesomeIcon />}
                                onClick={() => setOptimizeDialog(true)}
                                color="success"
                                variant="contained"
                                disabled={!isDraft}
                                label="Optimiser"
                            />
                        </span>
                    </Tooltip>
                    <Tooltip title={!isDraft ? "Disponible uniquement en mode Brouillon" : ""}>
                        <span>
                            <Button
                                startIcon={<DeleteSweepIcon />}
                                onClick={handleClearOptimizerShifts}
                                color="warning"
                                variant="outlined"
                                disabled={!isDraft || clearing}
                                label={clearing ? "Effacement..." : "Effacer auto"}
                            />
                        </span>
                    </Tooltip>
                    <Button
                        startIcon={<UploadFileIcon />}
                        onClick={() => setCsvImportDialog(true)}
                        disabled={!isDraft}
                        label="Importer CSV"
                    />
                    <Button
                        startIcon={<CheckCircleIcon />}
                        onClick={handleValidatePlanning}
                        disabled={validating}
                        color="info"
                        label={validating ? "Validation..." : "Valider"}
                    />
                    <Button
                        startIcon={<PictureAsPdfIcon />}
                        onClick={handleExportPdf}
                        disabled={exportingPdf}
                        label={exportingPdf ? "Export..." : "PDF"}
                    />
                </Box>
            </Box>

            {/* Filters */}
            <Box display="flex" gap={2} mb={2} flexWrap="wrap">
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Filtrer par employé</InputLabel>
                    <Select
                        multiple
                        value={filterEmployees}
                        onChange={(e) => setFilterEmployees(e.target.value as number[])}
                        input={<OutlinedInput label="Filtrer par employé" />}
                        renderValue={(selected) => `${selected.length} employé(s)`}
                    >
                        {employees.map((emp: any) => (
                            <MenuItem key={emp.employee_id} value={emp.employee_id}>
                                <Checkbox checked={filterEmployees.includes(emp.employee_id)} />
                                <ListItemText primary={`${emp.abbreviation} - ${emp.name}`} />
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Filtrer par poste</InputLabel>
                    <Select
                        multiple
                        value={filterJobPositions}
                        onChange={(e) => setFilterJobPositions(e.target.value as string[])}
                        input={<OutlinedInput label="Filtrer par poste" />}
                        renderValue={(selected) => selected.join(', ')}
                    >
                        {uniqueJobPositions.map((pos: string) => (
                            <MenuItem key={pos} value={pos}>
                                <Checkbox checked={filterJobPositions.includes(pos)} />
                                <ListItemText primary={pos} />
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                {(filterEmployees.length > 0 || filterJobPositions.length > 0) && (
                    <Button
                        size="small"
                        onClick={() => {
                            setFilterEmployees([]);
                            setFilterJobPositions([]);
                        }}
                        label="Effacer filtres"
                    />
                )}
            </Box>

            {/* FullCalendar */}
            <Card>
                <CardContent>
                    <FullCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        initialDate={initialDate}
                        locale="fr"
                        firstDay={1}
                        events={getCalendarEvents()}
                        eventContent={renderEventContent}
                        eventClick={handleEventClick}
                        dayCellContent={renderDayCellContent}
                        dayCellClassNames={getDayCellClassNames}
                        dateClick={handleDateClick}
                        headerToolbar={{
                            left: 'title',
                            center: '',
                            right: 'prev,next today'
                        }}
                        fixedWeekCount={false}
                        showNonCurrentDates={false}
                        height="auto"
                        dayMaxEvents={8}
                        moreLinkClick="day"
                    />
                </CardContent>
            </Card>

            {/* Day Detail View Dialog */}
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
                        <Typography variant="subtitle2">Choisir l'algorithme:</Typography>
                        <ToggleButtonGroup
                            value={selectedAlgorithm}
                            exclusive
                            onChange={(_, newValue) => newValue && setSelectedAlgorithm(newValue)}
                            fullWidth
                        >
                            <ToggleButton value="CP-SAT">
                                <Box textAlign="center">
                                    <Typography>🤖 CP-SAT</Typography>
                                    <Typography variant="caption">Standard</Typography>
                                </Box>
                            </ToggleButton>
                            <ToggleButton value="HYBRID">
                                <Box textAlign="center">
                                    <Typography>🔬 HYBRID</Typography>
                                    <Typography variant="caption">Recommandé</Typography>
                                </Box>
                            </ToggleButton>
                            <ToggleButton value="GA">
                                <Box textAlign="center">
                                    <Typography>🧬 GA</Typography>
                                    <Typography variant="caption">Expérimental</Typography>
                                </Box>
                            </ToggleButton>
                        </ToggleButtonGroup>

                        <Alert severity="success">
                            <Typography variant="subtitle2" gutterBottom>
                                L'optimiseur respecte:
                            </Typography>
                            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                <li>Heures contractuelles</li>
                                <li>Maximum 6 jours consécutifs</li>
                                <li>Pas de matin après soir</li>
                                <li>Couverture minimum 4 soignants/jour</li>
                            </ul>
                        </Alert>

                        <Alert severity="warning">
                            Cette opération remplacera toutes les affectations existantes!
                        </Alert>

                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<AutoAwesomeIcon />}
                            onClick={handleOptimizePlanning}
                            disabled={optimizing}
                            fullWidth
                        >
                            {optimizing ? 'Optimisation en cours...' : `Lancer l'optimisation (${selectedAlgorithm})`}
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOptimizeDialog(false)} disabled={optimizing}>
                        Annuler
                    </Button>
                </DialogActions>
            </Dialog>

            {/* CSV Import Dialog */}
            <Dialog open={csvImportDialog} onClose={() => setCsvImportDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Importer un fichier CSV</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={2}>
                        <Alert severity="info">
                            Format attendu: employee_id, date (YYYY-MM-DD), shift_code
                        </Alert>
                        <MuiTextField
                            type="file"
                            inputProps={{ accept: '.csv' }}
                            onChange={(e: any) => setCsvFile(e.target.files?.[0] || null)}
                            fullWidth
                        />
                        <Button
                            variant="contained"
                            onClick={handleCsvImport}
                            disabled={importing || !csvFile}
                            startIcon={<UploadFileIcon />}
                        >
                            {importing ? 'Import en cours...' : 'Importer'}
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCsvImportDialog(false)} disabled={importing}>
                        Annuler
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Validation Dialog */}
            <Dialog open={validationDialog} onClose={() => setValidationDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Résultats de validation</DialogTitle>
                <DialogContent>
                    {validationResults && (
                        <Box>
                            <Alert
                                severity={validationResults.is_valid ? 'success' : 'warning'}
                                sx={{ mb: 2 }}
                            >
                                {validationResults.is_valid
                                    ? 'Le planning est valide!'
                                    : `${validationResults.errors?.length || 0} problème(s) détecté(s)`}
                            </Alert>
                            {validationResults.errors?.length > 0 && (
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Type</TableCell>
                                                <TableCell>Employé</TableCell>
                                                <TableCell>Message</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {validationResults.errors.map((error: any, index: number) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <Chip
                                                            label={error.type}
                                                            size="small"
                                                            color={error.severity === 'error' ? 'error' : 'warning'}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{error.employee_name || '-'}</TableCell>
                                                    <TableCell>{error.message}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setValidationDialog(false)}>Fermer</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

// =============== PLANNING SHOW WITH FULLCALENDAR ===============
export const PlanningFullCalendarShow = () => {
    const planningId = parseInt(window.location.hash.match(/\/(\d+)\/show/)?.[1] || '0');

    return (
        <Show>
            <Box p={2}>
                <Card>
                    <CardContent>
                        <PlanningFCCalendar planningId={planningId} />
                    </CardContent>
                </Card>
            </Box>
        </Show>
    );
};
