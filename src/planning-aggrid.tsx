/**
 * AG Grid Planning View
 * Full-featured planning with pinned employee column using AG Grid
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    TopToolbar,
    CreateButton,
    Button,
} from 'react-admin';
import {
    Box,
    Typography,
    Chip,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
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
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Collapse,
    Button as MuiButton,
    CircularProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HistoryIcon from '@mui/icons-material/History';
import PsychologyIcon from '@mui/icons-material/Psychology';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import EmailIcon from '@mui/icons-material/Email';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { authenticatedFetch } from './dataProvider';
import { Link as RouterLink } from 'react-router-dom';
import { OptimizerAIChat } from './components/OptimizerAIChat';
import ShiftHistoryPopover from './components/planning/ShiftHistoryPopover';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const statusChoices = [
    { id: 'DRAFT', name: 'Brouillon' },
    { id: 'PUBLISHED', name: 'Publié' },
    { id: 'LOCKED', name: 'Verrouillé' },
];

// =============== LIST ===============
const PlanningListActions = () => (
    <TopToolbar>
        <CreateButton label="Créer un planning" />
    </TopToolbar>
);

export const PlanningAgGridList = () => (
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

// =============== CREATE ===============
export const PlanningAgGridCreate = () => {
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
            </SimpleForm>
        </Create>
    );
};

// =============== EDIT ===============
export const PlanningAgGridEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="month_name" label="Mois" disabled />
            <NumberInput source="year" label="Année" disabled />
            <SelectInput source="status" choices={statusChoices} label="Statut" />
        </SimpleForm>
    </Edit>
);

// =============== SOURCE INFO HELPER ===============
const getSourceInfo = (source: string) => {
    switch(source) {
        case 'OPTIMIZER':
            return { icon: '🤖', label: 'Généré automatiquement', borderColor: '#2196F3' };
        case 'MANUAL':
            return { icon: '✏️', label: 'Saisie manuelle', borderColor: '#4CAF50' };
        case 'IMPORT':
            return { icon: '📥', label: 'Importé', borderColor: '#FF9800' };
        default:
            return { icon: '', label: '', borderColor: 'transparent' };
    }
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

    const timeToMinutes = (timeStr: string) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

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

            coverage.push({ hour, count: workingEmployees.length, employees: workingEmployees });
        }

        return coverage;
    };

    const coverage = calculateCoverage();
    const maxCoverage = Math.max(...coverage.map(c => c.count), 1);
    const peakHours = coverage.filter(c => c.count === maxCoverage);

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
                    <Typography variant="h6">Vue détaillée - {date}</Typography>
                    <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
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
                                        <Typography variant="caption" color="text.secondary">Personnel en service</Typography>
                                        <Typography variant="h4" color="primary">{workingEmployees.length}</Typography>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Typography variant="caption" color="text.secondary">Couverture maximale</Typography>
                                        <Typography variant="h4" color="success.main">{maxCoverage} personnes</Typography>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Typography variant="caption" color="text.secondary">Heures de pointe</Typography>
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
                        <Typography variant="subtitle2" gutterBottom>Couverture par heure</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 150, mt: 2 }}>
                            {coverage.map((cov) => (
                                <Tooltip
                                    key={cov.hour}
                                    title={
                                        <Box>
                                            <Typography variant="caption" display="block">{cov.hour}h - {cov.hour + 1}h</Typography>
                                            <Typography variant="caption" display="block">{cov.count} personne{cov.count > 1 ? 's' : ''}</Typography>
                                            {cov.employees.length > 0 && (
                                                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>{cov.employees.join(', ')}</Typography>
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
                                            '&:hover': { opacity: 0.8 }
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
                        <Typography variant="subtitle2" gutterBottom>Planning chronologique</Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ minWidth: 100 }}>Employé</TableCell>
                                        <TableCell sx={{ minWidth: 500 }}>Horaire (0h → 24h)</TableCell>
                                        <TableCell sx={{ minWidth: 120 }}>Shift</TableCell>
                                        <TableCell sx={{ minWidth: 150 }}>Heures</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {workingEmployees.map((emp: any) => {
                                        const shift = emp.shifts[day];
                                        const shiftCode = shift.shift_code || '';
                                        const shiftType = shiftTypes.find(st => st.code === shiftCode);

                                        if (!shiftType || !shiftType.start_time || !shiftType.end_time) return null;

                                        const isEditing = editingEmployee === emp.employee_id;

                                        let startMin = timeToMinutes(shiftType.start_time);
                                        let endMin = timeToMinutes(shiftType.end_time);
                                        if (endMin <= startMin) endMin += 24 * 60;

                                        const totalMinutes = 24 * 60;
                                        const startPercent = (startMin / totalMinutes) * 100;
                                        const widthPercent = ((endMin - startMin) / totalMinutes) * 100;

                                        return (
                                            <TableRow key={emp.employee_id}>
                                                <TableCell>
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
                                                        <Typography variant="body2">{emp.abbreviation}</Typography>
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
                                                                })}
                                                            />
                                                        ))}
                                                        <Tooltip title={`${shiftType.code}: ${shiftType.start_time} - ${shiftType.end_time} (${shiftType.hours}h)`}>
                                                            <Box
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
                                                                    '&:hover': { boxShadow: 4, transform: 'scaleY(1.1)' }
                                                                }}
                                                            >
                                                                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'white' }}>
                                                                    {shiftType.code}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.95, color: 'white' }}>
                                                                    {shiftType.start_time}-{shiftType.end_time}
                                                                </Typography>
                                                            </Box>
                                                        </Tooltip>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    {isEditing ? (
                                                        <Select
                                                            size="small"
                                                            value={selectedShift || shiftType.id}
                                                            onChange={(e) => setSelectedShift(Number(e.target.value))}
                                                            fullWidth
                                                        >
                                                            {shiftTypes
                                                                .filter(st => Math.abs(st.hours - emp.daily_hours) <= 1.5 || ['OFF', 'CP6.4', 'CP8', 'CONG', 'FORM'].includes(st.code))
                                                                .map(st => (
                                                                    <MenuItem key={st.id} value={st.id}>{st.code} ({st.hours}h)</MenuItem>
                                                                ))
                                                            }
                                                        </Select>
                                                    ) : (
                                                        <Chip
                                                            label={shiftType.code}
                                                            size="small"
                                                            sx={{ bgcolor: shiftType.color_code || 'primary.main', color: 'white', fontWeight: 'bold' }}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {isEditing ? (
                                                        <Box display="flex" gap={0.5}>
                                                            <IconButton size="small" color="primary" onClick={() => handleSaveShift(emp.employee_id)}>
                                                                <SaveIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton size="small" onClick={() => { setEditingEmployee(null); setSelectedShift(null); }}>
                                                                <CloseIcon fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    ) : (
                                                        <Box display="flex" alignItems="center" gap={0.5}>
                                                            <Chip label={`${shiftType.hours}h`} size="small" color="primary" variant="outlined" />
                                                            <IconButton size="small" onClick={() => { setEditingEmployee(emp.employee_id); setSelectedShift(shiftType.id); }}>
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
                <MuiButton onClick={onClose}>Fermer</MuiButton>
            </DialogActions>
        </Dialog>
    );
};

// =============== AG GRID CALENDAR ===============
const PlanningAgGridCalendar = ({ planningId }: { planningId: number }) => {
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const refresh = useRefresh();

    // Data states
    const [loading, setLoading] = useState(true);
    const [calendarData, setCalendarData] = useState<any>(null);
    const [shiftTypes, setShiftTypes] = useState<any[]>([]);
    const [gridApi, setGridApi] = useState<any>(null);

    // Dialog states
    const [templateDialog, setTemplateDialog] = useState(false);
    const [optimizeDialog, setOptimizeDialog] = useState(false);
    const [createShiftDialog, setCreateShiftDialog] = useState(false);
    const [csvImportDialog, setCsvImportDialog] = useState(false);
    const [analysisDialog, setAnalysisDialog] = useState(false);
    const [validationDialog, setValidationDialog] = useState(false);
    const [dayDetailView, setDayDetailView] = useState<{ day: number; date: string } | null>(null);
    const [aiChatOpen, setAiChatOpen] = useState(false);

    // Action states
    const [generating, setGenerating] = useState(false);
    const [optimizing, setOptimizing] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [validating, setValidating] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Form/data states
    const [selectedAlgorithm, setSelectedAlgorithm] = useState<'CP-SAT' | 'GA' | 'HYBRID'>('CP-SAT');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [validationResults, setValidationResults] = useState<any>(null);
    const [optimizerFailureMessage, setOptimizerFailureMessage] = useState<string | undefined>(undefined);
    const [expandedValidationRows, setExpandedValidationRows] = useState<Set<number>>(new Set());

    // New shift form
    const [newShift, setNewShift] = useState({
        code: '', name: '', start_time: '', end_time: '',
        break_minutes: 0, hours: 8, shift_category: 'MORNING', color_code: '#4A90E2'
    });
    const [shiftValidationError, setShiftValidationError] = useState<string>('');

    // Filter states
    const [filterVisibility, setFilterVisibility] = useState<'all' | 'visible' | 'hidden'>('all');
    const [filterJobPositions, setFilterJobPositions] = useState<string[]>([]);
    const [filterJobTypes, setFilterJobTypes] = useState<string[]>([]);
    const [filterHoursStatus, setFilterHoursStatus] = useState<'all' | 'over_limit' | 'under_50' | 'ok'>('all');
    const [filterNameSearch, setFilterNameSearch] = useState('');
    const [hiddenEmployees, setHiddenEmployees] = useState<Set<number>>(new Set());
    const [togglingVisibility, setTogglingVisibility] = useState<number | null>(null);
    const [sendingEmail, setSendingEmail] = useState<number | null>(null);

    // Grouping state
    const [groupBy, setGroupBy] = useState<'none' | 'job_position' | 'job_type' | 'alphabetical' | 'hours'>('none');

    // Load data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;

            // Load calendar data
            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/calendar`);
            const data = await response.json();
            setCalendarData(data);

            // Load shift types using dataProvider
            const shiftsRes = await dataProvider.getList('planning/shift-types', {
                pagination: { page: 1, perPage: 100 },
                sort: { field: 'code', order: 'ASC' },
                filter: { active_only: true },
            });
            setShiftTypes(shiftsRes.data);

            // Load audit history to know which cells have changes (only for validated plannings)
            if (data?.planning?.status && data.planning.status !== 'DRAFT') {
                try {
                    // Use direct fetch instead of dataProvider to avoid parameter issues
                    const auditUrl = `${apiUrl}/planning/monthly-planning/${planningId}/audit-log`;
                    const auditResponse = await authenticatedFetch(auditUrl);

                    if (auditResponse.ok) {
                        const auditRes = await auditResponse.json();

                        if (auditRes?.changes && auditRes.changes.length > 0) {
                            const cellsSet = new Set<string>();
                            auditRes.changes.forEach((change: any) => {
                                // Create key from employeeId and date
                                const key = `${change.employee_id}-${change.date}`;
                                cellsSet.add(key);
                            });
                            setCellsWithHistory(cellsSet);
                        } else {
                            setCellsWithHistory(new Set());
                        }
                    } else {
                        console.warn('Audit API returned:', auditResponse.status);
                        setCellsWithHistory(new Set());
                    }
                } catch (auditError) {
                    console.warn('Could not load audit history:', auditError);
                    // Don't fail the whole load if audit fails
                    setCellsWithHistory(new Set());
                }
            } else {
                setCellsWithHistory(new Set());
            }

        } catch (error) {
            console.error('Error loading data:', error);
            notify('Erreur lors du chargement des données', { type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [planningId, dataProvider, notify]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Load hidden employees
    useEffect(() => {
        const loadHiddenEmployees = async () => {
            try {
                const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
                const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/hidden-employees`);
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

    // Helper function to update local state after shift change (avoids full reload)
    const updateLocalShift = useCallback((employeeId: number, day: number, shiftCode: string | null, shiftType: any | null) => {
        setCalendarData((prevData: any) => {
            if (!prevData?.employees) return prevData;

            const updatedEmployees = prevData.employees.map((emp: any) => {
                if (emp.employee_id !== employeeId) return emp;

                const updatedShifts = { ...emp.shifts };
                if (shiftCode && shiftType) {
                    updatedShifts[day] = {
                        shift_code: shiftCode,
                        color: shiftType.color_code || '#ccc',
                        hours: typeof shiftType.hours === 'number' ? shiftType.hours : parseFloat(shiftType.hours) || 0,
                        source: 'MANUAL',
                    };
                } else {
                    // Delete shift
                    delete updatedShifts[day];
                }

                return {
                    ...emp,
                    shifts: updatedShifts,
                };
            });

            return {
                ...prevData,
                employees: updatedEmployees,
            };
        });
        // AG Grid with controlled rowData will auto-detect changes and re-render
    }, []);

    // Handle shift update (from AG Grid cell edit)
    const handleShiftUpdate = useCallback(async (employeeId: number, day: number, shiftCode: string) => {
        try {
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const date = `${calendarData.planning.year}-${String(calendarData.planning.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const shiftType = shiftTypes.find(st => st.code === shiftCode);

            await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/assignments`, {
                method: 'POST',
                body: JSON.stringify({
                    employee_id: employeeId,
                    date: date,
                    shift_type_id: shiftType?.id || null,
                    shift_code: shiftCode || null,
                    hours: shiftType?.hours || 0,
                    source: 'MANUAL',
                }),
            });

            // Update local state instead of full reload
            updateLocalShift(employeeId, day, shiftCode, shiftType);
            notify('Shift mis à jour', { type: 'success' });
        } catch (error) {
            console.error('Error updating shift:', error);
            notify('Erreur lors de la mise à jour', { type: 'error' });
            loadData();
        }
    }, [calendarData, planningId, shiftTypes, notify, loadData, updateLocalShift]);

    // Status change handler
    const handleStatusChange = async (newStatus: string) => {
        try {
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus }),
            });
            notify(`Statut changé en ${newStatus === 'DRAFT' ? 'Brouillon' : newStatus === 'PUBLISHED' ? 'Publié' : 'Verrouillé'}`, { type: 'success' });
            loadData();
        } catch (error) {
            console.error('Error updating status:', error);
            notify('Erreur lors du changement de statut', { type: 'error' });
        }
    };

    // Template generation
    const handleGenerateTemplate = async (templateType: string) => {
        try {
            setGenerating(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await fetch(`${apiUrl}/planning/monthly-planning/${planningId}/generate-template?template_type=${templateType}`, { method: 'POST' });
            if (!response.ok) throw new Error('Failed to generate template');
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

    // Optimization
    const handleOptimizePlanning = async () => {
        try {
            setOptimizing(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const timeLimit = selectedAlgorithm === 'HYBRID' ? 300 : 60;

            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/optimize`, {
                method: 'POST',
                body: JSON.stringify({
                    min_daily_coverage: 4,
                    morning_coverage_ratio: 0.63,
                    time_limit_seconds: timeLimit,
                    preserve_existing: false,
                    algorithm: selectedAlgorithm
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Optimization failed');
            }

            const result = await response.json();
            const algorithmBadge = result.algorithm === 'GA' ? ' 🧬 GA' : result.algorithm === 'HYBRID' ? ' 🔬 HYBRID' : ' 🤖 CP-SAT';

            notify(`✅ ${result.message} (${result.assignments_created} affectations en ${result.optimization_time.toFixed(1)}s)${algorithmBadge}`, { type: 'success' });

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
            setOptimizerFailureMessage(error.message);
            setAiChatOpen(true);
            setOptimizeDialog(false);
        } finally {
            setOptimizing(false);
        }
    };

    // Clear optimizer shifts
    const handleClearOptimizerShifts = async () => {
        if (!window.confirm('Êtes-vous sûr de vouloir effacer tous les shifts générés par l\'optimiseur?')) return;

        try {
            setClearing(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await fetch(`${apiUrl}/planning/monthly-planning/${planningId}/clear-optimizer-shifts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Clear failed');
            }

            const result = await response.json();
            notify(`✅ ${result.message}`, { type: 'success' });
            loadData();
            refresh();
        } catch (error: any) {
            console.error('Error clearing optimizer shifts:', error);
            notify(`❌ ${error.message}`, { type: 'error' });
        } finally {
            setClearing(false);
        }
    };

    // CSV Import
    const handleCsvImport = async () => {
        if (!csvFile) {
            notify('Veuillez sélectionner un fichier CSV', { type: 'error' });
            return;
        }

        try {
            setImporting(true);
            const text = await csvFile.text();
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length < 2) throw new Error('CSV file is empty or invalid');

            const headers = lines[0].split(',').map(h => h.toLowerCase().trim());
            const shifts = lines.slice(1).map(line => {
                const values = line.split(',');
                const row: any = {};
                headers.forEach((header, index) => {
                    row[header] = values[index]?.trim();
                });
                return row;
            }).filter(row => (row.employee_id || row.abbreviation) && row.date && row.shift_code);

            if (shifts.length === 0) throw new Error('No valid shifts found in CSV');

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
            notify(`✅ ${result.imported_count} shifts importés avec succès!`, { type: 'success' });
            setCsvImportDialog(false);
            setCsvFile(null);
            loadData();
        } catch (error: any) {
            console.error('Error importing CSV:', error);
            notify(`Erreur d'import: ${error.message}`, { type: 'error' });
        } finally {
            setImporting(false);
        }
    };

    // Analysis
    const handleAnalyzePlanning = async () => {
        try {
            setAnalyzing(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/compare-alternatives`);
            if (!response.ok) throw new Error('Failed to analyze planning');
            const data = await response.json();
            setAnalysisData(data);
            setAnalysisDialog(true);
            notify('Analyse terminée', { type: 'success' });
        } catch (error: any) {
            console.error('Error analyzing planning:', error);
            notify(`Erreur d'analyse: ${error.message}`, { type: 'error' });
        } finally {
            setAnalyzing(false);
        }
    };

    // Validation
    const handleValidatePlanning = async () => {
        try {
            setValidating(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/validate`, { method: 'POST' });
            if (!response.ok) throw new Error('Échec de la validation');
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

    // PDF Export
    const handleExportPdf = async () => {
        try {
            setExportingPdf(true);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/pdf`, { method: 'GET' });
            if (!response.ok) throw new Error('Échec de l\'export PDF');

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

    // Toggle employee visibility
    const handleToggleEmployeeVisibility = async (employeeId: number) => {
        try {
            setTogglingVisibility(employeeId);
            const isCurrentlyHidden = hiddenEmployees.has(employeeId);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;

            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/employee/${employeeId}/visibility`, {
                method: 'POST',
                body: JSON.stringify({ hidden: !isCurrentlyHidden })
            });

            if (!response.ok) throw new Error('Échec du changement de visibilité');

            setHiddenEmployees((prev) => {
                const newSet = new Set(prev);
                if (isCurrentlyHidden) newSet.delete(employeeId);
                else newSet.add(employeeId);
                return newSet;
            });

            notify(isCurrentlyHidden ? 'Employé affiché' : 'Employé masqué', { type: 'info' });
        } catch (error: any) {
            console.error('Error toggling visibility:', error);
            notify(`Erreur: ${error.message}`, { type: 'error' });
        } finally {
            setTogglingVisibility(null);
        }
    };

    // Send planning email
    const handleSendPlanningEmail = async (employeeId: number, employeeName: string) => {
        try {
            setSendingEmail(employeeId);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;

            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/send-employee-planning/${employeeId}`, { method: 'POST' });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Échec de l\'envoi');
            }

            const result = await response.json();
            notify(`Planning envoyé à ${result.email}`, { type: 'success' });
        } catch (error: any) {
            console.error('Error sending planning email:', error);
            notify(`Erreur: ${error.message}`, { type: 'error' });
        } finally {
            setSendingEmail(null);
        }
    };

    // Create shift type
    const calculateWorkedHours = (startTime: string, endTime: string, breakMinutes: number) => {
        if (!startTime || !endTime) return null;
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        let startMinutes = startHour * 60 + startMin;
        let endMinutes = endHour * 60 + endMin;
        if (endMinutes <= startMinutes) endMinutes += 24 * 60;
        const totalMinutes = endMinutes - startMinutes;
        const workedHours = (totalMinutes - breakMinutes) / 60;
        return Math.round(workedHours * 10) / 10;
    };

    const handleCreateShift = async () => {
        if (!newShift.code || !newShift.name || !newShift.start_time || !newShift.end_time) {
            setShiftValidationError('Tous les champs obligatoires doivent être remplis');
            return;
        }

        try {
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const response = await authenticatedFetch(`${apiUrl}/planning/shift-types`, {
                method: 'POST',
                body: JSON.stringify({ ...newShift, is_active: true })
            });

            if (!response.ok) throw new Error('Failed to create shift');

            notify('Shift créé avec succès!', { type: 'success' });
            setCreateShiftDialog(false);
            setShiftValidationError('');
            setNewShift({ code: '', name: '', start_time: '', end_time: '', break_minutes: 0, hours: 8, shift_category: 'MORNING', color_code: '#4A90E2' });
            loadData();
        } catch (error) {
            console.error('Error creating shift:', error);
            notify('Erreur lors de la création', { type: 'error' });
        }
    };

    // Generate row data from calendar
    const rowData = useMemo(() => {
        if (!calendarData?.employees) return [];

        let filteredEmployees = calendarData.employees;

        // Apply filters
        filteredEmployees = filteredEmployees.filter((employee: any) => {
            if (filterVisibility === 'visible' && hiddenEmployees.has(employee.employee_id)) return false;
            if (filterVisibility === 'hidden' && !hiddenEmployees.has(employee.employee_id)) return false;
            if (filterJobPositions.length > 0 && !filterJobPositions.includes(employee.job_position)) return false;
            if (filterJobTypes.length > 0 && !filterJobTypes.includes(employee.job_type)) return false;
            if (filterHoursStatus !== 'all') {
                // Calculate hours from shifts (same logic as row data)
                let empTotalHours = 0;
                if (employee.shifts) {
                    Object.values(employee.shifts).forEach((shift: any) => {
                        if (shift && shift.hours && shift.shift_code !== 'OFF') {
                            empTotalHours += shift.hours;
                        }
                    });
                }
                const maxHours = employee.max_monthly_hours || 168;
                const utilization = maxHours > 0 ? (empTotalHours / maxHours) * 100 : 0;
                const isOverLimit = empTotalHours > maxHours;
                if (filterHoursStatus === 'over_limit' && !isOverLimit) return false;
                if (filterHoursStatus === 'under_50' && utilization >= 50) return false;
                if (filterHoursStatus === 'ok' && (isOverLimit || utilization < 50)) return false;
            }
            if (filterNameSearch.trim()) {
                const search = filterNameSearch.toLowerCase().trim();
                const matchesName = employee.name?.toLowerCase().includes(search);
                const matchesAbbr = employee.abbreviation?.toLowerCase().includes(search);
                if (!matchesName && !matchesAbbr) return false;
            }
            return true;
        });

        return filteredEmployees.map((emp: any) => {
            // Calculate total hours from shifts - including CP (paid leave)
            // OFF is the only shift that doesn't count towards hours
            let calculatedTotalHours = 0;
            if (emp.shifts) {
                Object.values(emp.shifts).forEach((shift: any) => {
                    if (shift && shift.hours && shift.shift_code !== 'OFF') {
                        calculatedTotalHours += shift.hours;
                    }
                });
            }

            const row: any = {
                employee_id: emp.employee_id,
                employee_name: emp.name,
                employee_abbr: emp.abbreviation,
                job_position: emp.job_position,
                job_type: emp.job_type,
                avatar_url: emp.avatar_url,
                color_cell: emp.color_cell,
                color_text: emp.color_text,
                max_monthly_hours: emp.max_monthly_hours || 168,
                daily_hours: emp.daily_hours || 8,
                hours_exceeded: calculatedTotalHours > (emp.max_monthly_hours || 168),
                hours_over_limit: Math.max(0, calculatedTotalHours - (emp.max_monthly_hours || 168)),
                consecutive_days_violation: emp.consecutive_days_violation,
                max_consecutive_days: emp.max_consecutive_days,
                evening_to_morning_violation: emp.evening_to_morning_violation,
                evening_to_morning_violations: emp.evening_to_morning_violations || [],
                is_inactive: emp.is_inactive || false,
                is_hidden: hiddenEmployees.has(emp.employee_id),
                total_hours: calculatedTotalHours, // Use calculated instead of backend value
                shifts: emp.shifts || {},
            };

            // Add shift data for each day
            if (emp.shifts) {
                Object.entries(emp.shifts).forEach(([day, shift]: [string, any]) => {
                    row[`day_${day}`] = shift?.shift_code || '';
                    row[`day_${day}_color`] = shift?.color || '';
                    row[`day_${day}_hours`] = shift?.hours || 0;
                    row[`day_${day}_source`] = shift?.source || '';
                });
            }

            // Add previous week shifts (read-only context)
            const previous_week = calendarData.previous_week;
            if (previous_week?.shifts && previous_week.shifts[emp.employee_id]) {
                Object.entries(previous_week.shifts[emp.employee_id]).forEach(([day, shift]: [string, any]) => {
                    row[`prev_day_${day}`] = shift || null;
                });
            }

            return row;
        });
    }, [calendarData, hiddenEmployees, filterVisibility, filterJobPositions, filterJobTypes, filterHoursStatus, filterNameSearch]);

    // State for editing shift - using dialog approach for reliability
    const [editDialog, setEditDialog] = useState<{ open: boolean; employeeId: number; employeeName: string; day: number; currentShift: string } | null>(null);
    const [editingShiftValue, setEditingShiftValue] = useState<string>('');
    const [editComment, setEditComment] = useState<string>('');
    const [editRequestedBy, setEditRequestedBy] = useState<'EMPLOYEE' | 'EMPLOYER' | 'OTHER'>('EMPLOYER');

    // State for history popover
    const [historyPopover, setHistoryPopover] = useState<{
        anchorEl: HTMLElement | null;
        employeeId: number;
        employeeName: string;
        date: string;
    } | null>(null);

    // Set of cells that have audit history (format: "employeeId-YYYY-MM-DD")
    const [cellsWithHistory, setCellsWithHistory] = useState<Set<string>>(new Set());

    // Force AG Grid to refresh cells when cellsWithHistory is populated
    useEffect(() => {
        if (gridApi && cellsWithHistory.size > 0) {
            gridApi.refreshCells({ force: true });
        }
    }, [gridApi, cellsWithHistory]);

    // Handle shift delete
    const handleShiftDelete = async (employeeId: number, day: number, comment?: string, requestedBy?: string) => {
        const isPublished = calendarData?.planning?.status === 'PUBLISHED';

        // Require comment in PUBLISHED mode
        if (isPublished && !comment?.trim()) {
            notify('Un commentaire est requis pour modifier un planning publié', { type: 'warning' });
            return;
        }

        try {
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const date = `${calendarData.planning.year}-${String(calendarData.planning.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Include audit params in query string for DELETE
            const params = new URLSearchParams();
            if (comment) params.append('change_comment', comment);
            if (requestedBy) params.append('requested_by', requestedBy);
            const queryString = params.toString() ? `?${params.toString()}` : '';

            const response = await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/assignments/${date}/${employeeId}${queryString}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete');

            // Update local state instead of full reload
            updateLocalShift(employeeId, day, null, null);

            // Mark cell as having history if published
            if (isPublished) {
                setCellsWithHistory(prev => new Set([...prev, `${employeeId}-${date}`]));
            }

            notify('Affectation supprimée', { type: 'success' });
        } catch (error) {
            console.error('Error deleting shift:', error);
            notify('Erreur lors de la suppression', { type: 'error' });
        }
    };

    // Handle shift save from edit mode
    const handleShiftSave = async (employeeId: number, day: number, shiftCode: string, comment?: string, requestedBy?: string) => {
        if (!shiftCode) return;

        const isPublished = calendarData?.planning?.status === 'PUBLISHED';

        // Require comment in PUBLISHED mode
        if (isPublished && !comment?.trim()) {
            notify('Un commentaire est requis pour modifier un planning publié', { type: 'warning' });
            return;
        }

        try {
            const shiftType = shiftTypes.find(st => st.code === shiftCode);
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const date = `${calendarData.planning.year}-${String(calendarData.planning.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/assignments`, {
                method: 'POST',
                body: JSON.stringify({
                    employee_id: employeeId,
                    date: date,
                    shift_type_id: shiftType?.id || null,
                    shift_code: shiftCode,
                    hours: shiftType?.hours || 0,
                    source: 'MANUAL',
                    // Audit fields for PUBLISHED mode
                    change_comment: comment || null,
                    requested_by: requestedBy || null,
                }),
            });

            // Update local state instead of full reload
            updateLocalShift(employeeId, day, shiftCode, shiftType);

            // Mark cell as having history if published
            if (isPublished) {
                setCellsWithHistory(prev => new Set([...prev, `${employeeId}-${date}`]));
            }

            notify('Shift mis à jour', { type: 'success' });
        } catch (error) {
            console.error('Error updating shift:', error);
            notify('Erreur lors de la mise à jour', { type: 'error' });
        }
    };

    // Handle drop
    const handleShiftDrop = async (employeeId: number, day: number, dragData: any) => {
        const isPublished = calendarData?.planning?.status === 'PUBLISHED';

        // In PUBLISHED mode, open edit dialog to require comment
        if (isPublished) {
            const employee = calendarData?.employees?.find((e: any) => e.employee_id === employeeId);
            setEditingShiftValue(dragData.shift_code);
            setEditComment('');
            setEditRequestedBy('EMPLOYER');
            setEditDialog({
                open: true,
                employeeId,
                employeeName: employee?.name || 'Employé',
                day,
                currentShift: '', // It's a new assignment from drag
            });
            notify('Veuillez ajouter un commentaire pour ce changement', { type: 'info' });
            return;
        }

        // In DRAFT mode, directly save
        try {
            const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
            const date = `${calendarData.planning.year}-${String(calendarData.planning.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            await authenticatedFetch(`${apiUrl}/planning/monthly-planning/${planningId}/assignments`, {
                method: 'POST',
                body: JSON.stringify({
                    employee_id: employeeId,
                    date: date,
                    shift_type_id: dragData.shift_type_id,
                    shift_code: dragData.shift_code,
                    hours: dragData.hours,
                    source: 'MANUAL',
                }),
            });

            // Update local state instead of full reload
            const shiftType = shiftTypes.find(st => st.code === dragData.shift_code);
            updateLocalShift(employeeId, day, dragData.shift_code, {
                ...shiftType,
                color_code: dragData.color || shiftType?.color_code,
                hours: dragData.hours,
            });

            notify('✅ Shift copié', { type: 'success' });
        } catch (error) {
            console.error('Error dropping shift:', error);
            notify('Erreur lors de la copie', { type: 'error' });
        }
    };

    // Shift cell renderer with history icon and drag-drop
    const ShiftCellRenderer = useCallback((params: any) => {
        const shiftCode = params.value;
        const field = params.colDef.field;
        const day = parseInt(field.replace('day_', ''));
        const employeeId = params.data.employee_id;
        const employeeName = params.data.employee_name;
        const colorField = field + '_color';
        const sourceField = field + '_source';
        const hoursField = field + '_hours';
        const color = params.data[colorField];
        const source = params.data[sourceField];
        const hours = params.data[hoursField] || 0;
        const sourceInfo = getSourceInfo(source);

        const status = calendarData?.planning?.status;
        const isEditable = status !== 'LOCKED';
        const isValidated = status && status !== 'DRAFT';

        // Format date for history
        const dateStr = `${calendarData?.planning?.year}-${String(calendarData?.planning?.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Check if this cell has history
        const historyKey = `${employeeId}-${dateStr}`;
        const hasHistory = cellsWithHistory.has(historyKey);

        // Handle history icon click
        const handleHistoryClick = (e: React.MouseEvent<HTMLElement>) => {
            e.stopPropagation();
            setHistoryPopover({
                anchorEl: e.currentTarget,
                employeeId,
                employeeName,
                date: dateStr,
            });
        };

        // Handle delete
        const handleDelete = (e: React.MouseEvent) => {
            e.stopPropagation();
            // Open edit dialog for deletion (with comment if published)
            setEditingShiftValue('');
            setEditComment('');
            setEditRequestedBy('EMPLOYER');
            setEditDialog({
                open: true,
                employeeId,
                employeeName,
                day,
                currentShift: shiftCode || '',
            });
        };

        // Drag start handler
        const handleDragStart = (e: React.DragEvent) => {
            if (!shiftCode || !isEditable) {
                e.preventDefault();
                return;
            }
            const shiftType = shiftTypes.find(st => st.code === shiftCode);
            const dragData = {
                shift_type_id: shiftType?.id,
                shift_code: shiftCode,
                hours: hours,
                color: color,
                source_employee_id: employeeId,
                source_day: day,
            };
            e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
            e.dataTransfer.effectAllowed = 'copy';
        };

        // Drop handler
        const handleDrop = (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            (e.currentTarget as HTMLElement).classList.remove('ag-cell-drag-over');

            if (!isEditable) return;

            try {
                const data = e.dataTransfer.getData('text/plain');
                if (data) {
                    const dragData = JSON.parse(data);
                    handleShiftDrop(employeeId, day, dragData);
                }
            } catch (error) {
                console.error('Error handling drop:', error);
            }
        };

        const handleDragOver = (e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            (e.currentTarget as HTMLElement).classList.add('ag-cell-drag-over');
        };

        const handleDragLeave = (e: React.DragEvent) => {
            (e.currentTarget as HTMLElement).classList.remove('ag-cell-drag-over');
        };

        return (
            <Box
                sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    cursor: isEditable ? 'pointer' : 'default',
                    '&:hover': isEditable ? { backgroundColor: 'rgba(0,0,0,0.04)' } : {},
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {shiftCode ? (
                    <>
                        <Tooltip title={`${shiftCode} (${hours}h)${source ? ' - ' + sourceInfo.label : ''} | Glisser pour copier`}>
                            <div
                                draggable={isEditable}
                                onDragStart={handleDragStart}
                                style={{ cursor: isEditable ? 'grab' : 'default' }}
                            >
                                <Chip
                                    label={
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <span>{shiftCode}</span>
                                            {sourceInfo.icon && <span style={{ fontSize: '0.65rem' }}>{sourceInfo.icon}</span>}
                                        </Box>
                                    }
                                    size="small"
                                    onDelete={isEditable ? handleDelete : undefined}
                                    deleteIcon={<CloseIcon style={{ fontSize: 12 }} />}
                                    sx={{
                                        backgroundColor: color || '#e0e0e0',
                                        color: '#000',
                                        fontWeight: 'bold',
                                        fontSize: '0.65rem',
                                        height: 22,
                                        borderLeft: source ? `3px solid ${sourceInfo.borderColor}` : undefined,
                                        '& .MuiChip-deleteIcon': { color: 'rgba(0,0,0,0.5)' },
                                    }}
                                />
                            </div>
                        </Tooltip>
                        {hasHistory && (
                            <Tooltip title="Voir l'historique des modifications">
                                <IconButton
                                    size="small"
                                    onClick={handleHistoryClick}
                                    sx={{ p: 0.25, opacity: 0.7, '&:hover': { opacity: 1 }, color: 'info.main' }}
                                >
                                    <HistoryIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </>
                ) : (
                    <>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '1rem' }}>
                            {isEditable ? '+' : ''}
                        </Typography>
                        {hasHistory && (
                            <Tooltip title="Voir l'historique des modifications">
                                <IconButton
                                    size="small"
                                    onClick={handleHistoryClick}
                                    sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1 }, color: 'info.main' }}
                                >
                                    <HistoryIcon sx={{ fontSize: 12 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </>
                )}
            </Box>
        );
    }, [calendarData, shiftTypes, cellsWithHistory, handleShiftDrop, setEditDialog, setEditingShiftValue, setEditComment, setEditRequestedBy, setHistoryPopover]);

    // Handle AG Grid cell click - opens edit dialog
    const onCellClicked = useCallback((event: any) => {
        const field = event.colDef.field;
        if (!field?.startsWith('day_')) return; // Only handle day columns

        const status = calendarData?.planning?.status;
        if (status === 'LOCKED') {
            notify('Planning verrouillé - modification impossible', { type: 'warning' });
            return;
        }

        const day = parseInt(field.replace('day_', ''));
        const employeeId = event.data.employee_id;
        const employeeName = event.data.employee_name;
        const currentShift = event.value || '';

        setEditingShiftValue(currentShift);
        setEditComment('');
        setEditRequestedBy('EMPLOYER');
        setEditDialog({
            open: true,
            employeeId,
            employeeName,
            day,
            currentShift,
        });
    }, [calendarData, notify]);

    // Employee cell renderer
    const EmployeeCellRenderer = useCallback((params: any) => {
        const data = params.data;
        const {
            employee_name, employee_abbr, job_position,
            avatar_url, color_cell, color_text, hours_exceeded,
            consecutive_days_violation, max_consecutive_days, evening_to_morning_violation,
            evening_to_morning_violations, is_hidden, is_inactive, employee_id
        } = data;
        // Ensure numeric values for toFixed()
        const total_hours = typeof data.total_hours === 'number' ? data.total_hours : parseFloat(data.total_hours) || 0;
        const max_monthly_hours = typeof data.max_monthly_hours === 'number' ? data.max_monthly_hours : parseFloat(data.max_monthly_hours) || 168;
        const hours_over_limit = typeof data.hours_over_limit === 'number' ? data.hours_over_limit : parseFloat(data.hours_over_limit) || 0;
        const hoursRatio = max_monthly_hours > 0 ? total_hours / max_monthly_hours : 0;
        const hasViolations = hours_exceeded || consecutive_days_violation || evening_to_morning_violation;

        return (
            <Box sx={{
                py: 0.5,
                opacity: is_hidden ? 0.4 : is_inactive ? 0.6 : 1,
                filter: is_hidden ? 'grayscale(80%)' : 'none',
                backgroundColor: is_inactive ? 'rgba(0,0,0,0.05)' : 'transparent',
            }}>
                <Box display="flex" alignItems="flex-start" gap={0.5}>
                    {/* Action buttons */}
                    <Box display="flex" flexDirection="column" gap={0.15}>
                        <Tooltip title={is_hidden ? "Afficher l'employé" : "Masquer l'employé"}>
                            <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleToggleEmployeeVisibility(employee_id); }}
                                disabled={togglingVisibility === employee_id}
                                sx={{ padding: 0.15 }}
                            >
                                {togglingVisibility === employee_id ? (
                                    <CircularProgress size={12} />
                                ) : is_hidden ? (
                                    <VisibilityOffIcon sx={{ fontSize: 12 }} color="disabled" />
                                ) : (
                                    <VisibilityIcon sx={{ fontSize: 12 }} />
                                )}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Envoyer planning par email">
                            <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleSendPlanningEmail(employee_id, employee_name); }}
                                disabled={sendingEmail === employee_id}
                                sx={{ padding: 0.15 }}
                                color="primary"
                            >
                                {sendingEmail === employee_id ? (
                                    <CircularProgress size={12} />
                                ) : (
                                    <EmailIcon sx={{ fontSize: 12 }} />
                                )}
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {/* Avatar */}
                    <Avatar
                        src={avatar_url}
                        sx={{
                            width: 26,
                            height: 26,
                            bgcolor: color_cell || '#FF0000',
                            color: color_text || '#FFFFFF',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            flexShrink: 0,
                        }}
                    >
                        {!avatar_url && employee_abbr}
                    </Avatar>

                    {/* Info */}
                    <Box minWidth={0} flex={1}>
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <Typography variant="body2" fontWeight="600" sx={{ lineHeight: 1.1, fontSize: '0.8rem' }}>
                                {employee_abbr}
                            </Typography>
                            <Chip
                                label={job_position === 'INFIRMIER' ? 'Inf' : job_position === 'AIDE_SOIGNANT' ? 'AS' : 'Stg'}
                                size="small"
                                color={job_position === 'INFIRMIER' ? 'primary' : job_position === 'AIDE_SOIGNANT' ? 'secondary' : 'default'}
                                sx={{ fontSize: '0.5rem', height: 14, '& .MuiChip-label': { px: 0.5 } }}
                            />
                        </Box>
                        <Tooltip title={employee_name}>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 110, fontSize: '0.65rem', lineHeight: 1.1 }}>
                                {employee_name}
                            </Typography>
                        </Tooltip>

                        {/* Hours display */}
                        <Typography
                            variant="caption"
                            sx={{
                                display: 'block',
                                fontSize: '0.65rem',
                                lineHeight: 1.2,
                                color: hours_exceeded ? 'error.main' : hoursRatio < 0.5 ? 'warning.main' : 'text.secondary',
                                fontWeight: hours_exceeded || hoursRatio < 0.5 ? 'bold' : 'normal',
                            }}
                        >
                            {total_hours?.toFixed(1) || 0}h / {max_monthly_hours?.toFixed(1) || 0}h
                            {hours_exceeded && hours_over_limit > 0 && (
                                <span style={{ color: '#d32f2f' }}> (+{hours_over_limit?.toFixed(1)}h)</span>
                            )}
                        </Typography>

                        {/* Warning chips for violations */}
                        {hasViolations && (
                            <Box display="flex" flexWrap="wrap" gap={0.25} mt={0.25}>
                                {hours_exceeded && (
                                    <Tooltip title={`Dépassement de ${hours_over_limit?.toFixed(1)}h sur le maximum mensuel`}>
                                        <Chip
                                            label={`⚠️ +${hours_over_limit?.toFixed(1)}h`}
                                            size="small"
                                            color="error"
                                            sx={{ fontSize: '0.5rem', height: 14, '& .MuiChip-label': { px: 0.5 } }}
                                        />
                                    </Tooltip>
                                )}
                                {consecutive_days_violation && (
                                    <Tooltip title={`${max_consecutive_days} jours consécutifs - Loi: max 6 jours (44h repos)`}>
                                        <Chip
                                            label={`🚨 ${max_consecutive_days}j consec.`}
                                            size="small"
                                            color="warning"
                                            sx={{ fontSize: '0.5rem', height: 14, '& .MuiChip-label': { px: 0.5 } }}
                                        />
                                    </Tooltip>
                                )}
                                {evening_to_morning_violation && (
                                    <Tooltip title={`Soir→Matin interdit: ${evening_to_morning_violations?.length || 1} violation(s)`}>
                                        <Chip
                                            label={`🔴 S→M (${evening_to_morning_violations?.length || 1})`}
                                            size="small"
                                            color="error"
                                            sx={{ fontSize: '0.5rem', height: 14, '& .MuiChip-label': { px: 0.5 } }}
                                        />
                                    </Tooltip>
                                )}
                            </Box>
                        )}

                        {/* Inactive indicator */}
                        {is_inactive && (
                            <Chip label="Absent" size="small" sx={{ fontSize: '0.5rem', height: 14, mt: 0.25 }} />
                        )}
                    </Box>
                </Box>
            </Box>
        );
    }, [togglingVisibility, sendingEmail, handleToggleEmployeeVisibility, handleSendPlanningEmail]);

    // Custom header component for day columns
    const DayHeaderComponent = useCallback((props: any) => {
        const { day, weekday, holiday, isToday, staffCount, planning } = props;

        return (
            <Box
                sx={{
                    textAlign: 'center',
                    py: 0.5,
                    cursor: 'pointer',
                }}
                onClick={() => setDayDetailView({
                    day,
                    date: `${weekday} ${day} ${planning.month_name} ${planning.year}`
                })}
            >
                <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{weekday}</Typography>
                    <ZoomInIcon sx={{ fontSize: 12, opacity: 0.6 }} />
                </Box>
                <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                    {day}{holiday ? ' 🇱🇺' : ''}
                </Typography>
                {holiday && (
                    <Typography variant="caption" sx={{ fontSize: '0.5rem', fontStyle: 'italic', display: 'block' }}>
                        {holiday.substring(0, 10)}
                    </Typography>
                )}
                <Box sx={{ fontSize: '0.55rem', lineHeight: 1.1, mt: 0.25 }}>
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold', fontSize: '0.6rem' }}>
                        Total: {staffCount.total_soignant || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', fontSize: '0.5rem', color: 'text.secondary' }}>
                        👨‍⚕️{staffCount.infirmier || 0} 🤝{staffCount.aide_soignant || 0} 🎓{staffCount.stagiaire || 0}
                    </Typography>
                </Box>
            </Box>
        );
    }, [setDayDetailView]);

    // Column definitions
    // Previous week cell renderer (read-only, grayed out)
    const PrevWeekCellRenderer = useCallback((params: any) => {
        const field = params.colDef.field;
        const shiftData = params.data[field];
        const shiftCode = shiftData?.shift_code || '';
        const color = shiftData?.color || '#e0e0e0';

        if (!shiftCode) {
            return (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                    <Typography variant="caption" color="text.disabled">-</Typography>
                </Box>
            );
        }

        return (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
                <Chip
                    label={shiftCode}
                    size="small"
                    sx={{
                        backgroundColor: color,
                        color: '#000',
                        fontWeight: 'bold',
                        fontSize: '0.6rem',
                        height: 20,
                        opacity: 0.8,
                    }}
                />
            </Box>
        );
    }, []);

    const columnDefs = useMemo(() => {
        if (!calendarData?.planning || !Array.isArray(shiftTypes)) return [];

        const planning = calendarData.planning;
        const holidays = calendarData.luxembourg_holidays || {};
        const daily_staff_count = calendarData.daily_staff_count || {};
        const previous_week = calendarData.previous_week;

        const daysInMonth = new Date(planning.year, planning.month, 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const cols: any[] = [
            {
                field: 'employee_name',
                headerName: 'Employé',
                pinned: 'left',
                width: 210,
                cellRenderer: EmployeeCellRenderer,
                sortable: true,
                filter: true,
            },
        ];

        // Add previous week columns (read-only context for rule checking)
        if (previous_week?.days && previous_week.days.length > 0) {
            previous_week.days.forEach((prevDay: number, index: number) => {
                const prevDate = new Date(previous_week.year, previous_week.month - 1, prevDay);
                const weekday = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][prevDate.getDay()];
                const isLastPrevDay = index === previous_week.days.length - 1;

                cols.push({
                    field: `prev_day_${prevDay}`,
                    headerName: `${weekday} ${prevDay}/${previous_week.month}`,
                    width: 75,
                    cellRenderer: PrevWeekCellRenderer,
                    valueFormatter: (params: any) => params.value?.shift_code || '', // Prevent AG Grid "object" warning
                    editable: false,
                    headerClass: 'ag-header-prev-week',
                    cellStyle: () => ({
                        backgroundColor: '#f0f0f0',
                        borderRight: isLastPrevDay ? '3px solid #9e9e9e' : undefined,
                        padding: '2px',
                    }),
                });
            });
        }

        // Add day columns
        days.forEach((day: number) => {
            const date = new Date(planning.year, planning.month - 1, day);
            const weekday = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()];
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const holiday = holidays[day];
            const isToday = new Date().toDateString() === date.toDateString();
            const staffCount = daily_staff_count[day] || { total_soignant: 0, infirmier: 0, aide_soignant: 0, stagiaire: 0 };

            cols.push({
                field: `day_${day}`,
                headerName: `${weekday} ${day}`,
                headerComponent: () => (
                    <DayHeaderComponent
                        day={day}
                        weekday={weekday}
                        holiday={holiday}
                        isToday={isToday}
                        staffCount={staffCount}
                        planning={planning}
                    />
                ),
                width: 90,
                cellRenderer: ShiftCellRenderer,
                editable: false, // We handle editing ourselves
                headerClass: isToday ? 'ag-header-today' : isWeekend ? 'ag-header-weekend' : holiday ? 'ag-header-holiday' : '',
                cellStyle: () => ({
                    backgroundColor: isToday ? '#BBDEFB' : isWeekend ? '#f5f5f5' : holiday ? '#E1BEE7' : 'transparent',
                    padding: '2px',
                }),
            });
        });

        return cols;
    }, [calendarData, shiftTypes, EmployeeCellRenderer, ShiftCellRenderer, DayHeaderComponent]);

    const defaultColDef = useMemo(() => ({
        sortable: false,
        resizable: true,
    }), []);

    // Handle cell value change
    const onCellValueChanged = useCallback((event: any) => {
        const field = event.colDef.field;
        const day = parseInt(field.replace('day_', ''));
        const employeeId = event.data.employee_id;
        const newValue = event.newValue;

        handleShiftUpdate(employeeId, day, newValue);
    }, [handleShiftUpdate]);

    const onGridReady = useCallback((params: any) => {
        setGridApi(params.api);
    }, []);

    if (loading) {
        return <Loading />;
    }

    if (!calendarData) {
        return <Typography>Aucune donnée disponible</Typography>;
    }

    const { planning, employees: rawEmployees, daily_staff_count } = calendarData;
    const isDraft = planning?.status === 'DRAFT';

    // Extract unique job positions and types for filters
    const uniqueJobPositions = [...new Set(rawEmployees.map((e: any) => e.job_position).filter(Boolean))].sort() as string[];
    const uniqueJobTypes = [...new Set(rawEmployees.map((e: any) => e.job_type).filter(Boolean))].sort() as string[];

    const hasActiveFilters = filterVisibility !== 'all' || filterJobPositions.length > 0 || filterJobTypes.length > 0 || filterHoursStatus !== 'all' || filterNameSearch.trim() !== '';

    const clearAllFilters = () => {
        setFilterVisibility('all');
        setFilterJobPositions([]);
        setFilterJobTypes([]);
        setFilterHoursStatus('all');
        setFilterNameSearch('');
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'DRAFT': return { color: 'default' as const, label: 'Brouillon', icon: '📝' };
            case 'PUBLISHED': return { color: 'success' as const, label: 'Publié', icon: '✅' };
            case 'LOCKED': return { color: 'error' as const, label: 'Verrouillé', icon: '🔒' };
            default: return { color: 'default' as const, label: status, icon: '' };
        }
    };

    return (
        <Box>
            {/* Header */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                    <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="h5">{planning.month_name} {planning.year}</Typography>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <Select
                                value={planning.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                renderValue={(value) => (
                                    <Chip label={`${getStatusConfig(value).icon} ${getStatusConfig(value).label}`} color={getStatusConfig(value).color} size="small" sx={{ fontWeight: 'bold' }} />
                                )}
                                sx={{ '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
                            >
                                <MenuItem value="DRAFT">📝 Brouillon</MenuItem>
                                <MenuItem value="PUBLISHED">✅ Publié</MenuItem>
                                <MenuItem value="LOCKED">🔒 Verrouillé</MenuItem>
                            </Select>
                        </FormControl>
                        {planning.status !== 'DRAFT' && (
                            <Chip icon={<HistoryIcon />} label="Suivi actif" color="info" size="small" variant="outlined" />
                        )}
                        {planning.last_optimized_at && (
                            <Tooltip title={`Algorithme: ${planning.last_optimization_algorithm || 'CP-SAT'}`}>
                                <Chip icon={<AutoAwesomeIcon />} label={`Optimisé ${new Date(planning.last_optimized_at).toLocaleDateString('fr-FR')}`} color="success" size="small" variant="outlined" />
                            </Tooltip>
                        )}
                    </Box>
                    <Box display="flex" gap={1} flexWrap="wrap">
                        <Button startIcon={<AddIcon />} onClick={() => setCreateShiftDialog(true)} color="secondary" variant="outlined" label="Créer shift" />
                        <Tooltip title={!isDraft ? "Mode Brouillon requis" : ""}>
                            <span>
                                <Button startIcon={<AutoFixHighIcon />} onClick={() => setTemplateDialog(true)} disabled={!isDraft} label="Générer" />
                            </span>
                        </Tooltip>
                        <Tooltip title={!isDraft ? "Mode Brouillon requis" : ""}>
                            <span>
                                <Button startIcon={<AutoAwesomeIcon />} onClick={() => setOptimizeDialog(true)} color="success" variant="contained" disabled={!isDraft} label="Optimiser" />
                            </span>
                        </Tooltip>
                        <Tooltip title={!isDraft ? "Mode Brouillon requis" : ""}>
                            <span>
                                <Button startIcon={<DeleteSweepIcon />} onClick={handleClearOptimizerShifts} color="warning" variant="outlined" disabled={!isDraft || clearing} label={clearing ? "..." : "Effacer auto"} />
                            </span>
                        </Tooltip>
                        <Tooltip title={!isDraft ? "Mode Brouillon requis" : ""}>
                            <span>
                                <Button startIcon={<UploadFileIcon />} onClick={() => setCsvImportDialog(true)} disabled={!isDraft} label="CSV" />
                            </span>
                        </Tooltip>
                        <Button startIcon={<AssessmentIcon />} onClick={handleAnalyzePlanning} disabled={analyzing} label={analyzing ? "..." : "Analyser"} />
                        <Button startIcon={exportingPdf ? <CircularProgress size={16} /> : <PictureAsPdfIcon />} onClick={handleExportPdf} color="error" variant="outlined" disabled={exportingPdf} label="PDF" />
                        {planning.status !== 'DRAFT' && (
                            <Button startIcon={<HistoryIcon />} component={RouterLink} to={`/planning/${planningId}/audit-log`} label="Historique" />
                        )}
                        <Button startIcon={validating ? <CircularProgress size={16} /> : <CheckCircleIcon />} onClick={handleValidatePlanning} color="primary" variant="contained" disabled={validating} label={validating ? "..." : "Valider"} />
                        <IconButton onClick={handleRefreshData} disabled={refreshing || loading} color="primary">
                            {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
                        </IconButton>
                    </Box>
                </Box>
            </Paper>

            {/* Filter Row */}
            <Paper variant="outlined" sx={{ p: 1, mb: 1, display: 'inline-block' }}>
                <Box display="flex" alignItems="center" gap={1} flexWrap="nowrap">
                    <FilterListIcon color="action" fontSize="small" />
                    <FormControl size="small" variant="outlined" sx={{ width: 110 }}>
                        <InputLabel>Visibilité</InputLabel>
                        <Select value={filterVisibility} label="Visibilité" onChange={(e) => setFilterVisibility(e.target.value as any)}>
                            <MenuItem value="all">Tous</MenuItem>
                            <MenuItem value="visible">Visibles</MenuItem>
                            <MenuItem value="hidden">Masqués</MenuItem>
                        </Select>
                    </FormControl>
                    {uniqueJobPositions.length > 0 && (
                        <FormControl size="small" variant="outlined" sx={{ width: 130 }}>
                            <InputLabel>Poste</InputLabel>
                            <Select
                                multiple
                                value={filterJobPositions}
                                onChange={(e) => setFilterJobPositions(e.target.value as string[])}
                                input={<OutlinedInput label="Poste" />}
                                renderValue={(selected) => selected.length === 0 ? '' : `${selected.length} sél.`}
                            >
                                {uniqueJobPositions.map((position) => (
                                    <MenuItem key={position} value={position}>
                                        <Checkbox checked={filterJobPositions.includes(position)} size="small" />
                                        <ListItemText primary={position} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    {uniqueJobTypes.length > 0 && (
                        <FormControl size="small" variant="outlined" sx={{ width: 120 }}>
                            <InputLabel>Type</InputLabel>
                            <Select
                                multiple
                                value={filterJobTypes}
                                onChange={(e) => setFilterJobTypes(e.target.value as string[])}
                                input={<OutlinedInput label="Type" />}
                                renderValue={(selected) => selected.length === 0 ? '' : `${selected.length} sél.`}
                            >
                                {uniqueJobTypes.map((type) => (
                                    <MenuItem key={type} value={type}>
                                        <Checkbox checked={filterJobTypes.includes(type)} size="small" />
                                        <ListItemText primary={type} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    <FormControl size="small" variant="outlined" sx={{ width: 120 }}>
                        <InputLabel>Heures</InputLabel>
                        <Select value={filterHoursStatus} label="Heures" onChange={(e) => setFilterHoursStatus(e.target.value as any)}>
                            <MenuItem value="all">Tous</MenuItem>
                            <MenuItem value="over_limit">Dépassement</MenuItem>
                            <MenuItem value="under_50">&lt; 50%</MenuItem>
                            <MenuItem value="ok">OK</MenuItem>
                        </Select>
                    </FormControl>
                    <MuiTextField
                        size="small"
                        placeholder="Nom..."
                        value={filterNameSearch}
                        onChange={(e) => setFilterNameSearch(e.target.value)}
                        sx={{ width: 130 }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                            endAdornment: filterNameSearch && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setFilterNameSearch('')} sx={{ p: 0.25 }}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    {hasActiveFilters && (
                        <>
                            <Chip label={`${rowData.length}/${rawEmployees.length}`} size="small" color="primary" variant="outlined" />
                            <Tooltip title="Effacer filtres">
                                <IconButton size="small" onClick={clearAllFilters} color="error" sx={{ p: 0.25 }}>
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </>
                    )}
                </Box>
            </Paper>

            {/* AG Grid */}
            <Paper sx={{ p: 0 }}>
                <style>{`
                    .ag-header-today { background-color: #1976d2 !important; color: white !important; }
                    .ag-header-weekend { background-color: #f5f5f5 !important; }
                    .ag-header-holiday { background-color: #E1BEE7 !important; }
                    .ag-header-prev-week {
                        background-color: #e0e0e0 !important;
                        color: #666 !important;
                        font-style: italic !important;
                    }
                    .ag-header-cell-label { white-space: pre-line !important; text-align: center !important; }
                    .ag-cell { overflow: visible !important; }
                    .ag-cell-drag-over {
                        background-color: rgba(33, 150, 243, 0.15) !important;
                        outline: 2px dashed #2196f3 !important;
                        outline-offset: -2px;
                    }
                `}</style>
                <Box sx={{ height: 'calc(100vh - 320px)', width: '100%' }}>
                    <AgGridReact
                        rowData={rowData}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        rowHeight={90}
                        headerHeight={85}
                        theme={themeQuartz}
                        getRowId={(params) => String(params.data.employee_id)}
                        onGridReady={onGridReady}
                        onCellClicked={onCellClicked}
                        onCellValueChanged={onCellValueChanged}
                        stopEditingWhenCellsLoseFocus={true}
                        suppressClickEdit={true}
                    />
                </Box>
            </Paper>

            {/* Template Dialog */}
            <Dialog open={templateDialog} onClose={() => setTemplateDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Générer planning automatique</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={2}>
                        <MuiButton variant="outlined" onClick={() => handleGenerateTemplate('default')} disabled={generating} fullWidth>Modèle par défaut</MuiButton>
                        <MuiButton variant="outlined" onClick={() => handleGenerateTemplate('weekend_off')} disabled={generating} fullWidth>Modèle weekends OFF</MuiButton>
                        <MuiButton variant="outlined" onClick={() => handleGenerateTemplate('rotate_shifts')} disabled={generating} fullWidth>Modèle alterné</MuiButton>
                        <Alert severity="warning">Attention: ceci remplacera toutes les affectations existantes!</Alert>
                    </Box>
                </DialogContent>
                <DialogActions><MuiButton onClick={() => setTemplateDialog(false)}>Annuler</MuiButton></DialogActions>
            </Dialog>

            {/* Optimization Dialog */}
            <Dialog open={optimizeDialog} onClose={() => setOptimizeDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle><Box display="flex" alignItems="center" gap={1}><AutoAwesomeIcon color="success" /> Optimiser le planning</Box></DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={2}>
                        <Typography variant="subtitle2">Choisir l'algorithme:</Typography>
                        <ToggleButtonGroup value={selectedAlgorithm} exclusive onChange={(e, v) => v && setSelectedAlgorithm(v)} fullWidth color="primary">
                            <ToggleButton value="CP-SAT"><Box textAlign="center"><Typography fontWeight="bold">🤖 CP-SAT</Typography><Typography variant="caption">Standard</Typography></Box></ToggleButton>
                            <ToggleButton value="HYBRID"><Box textAlign="center"><Typography fontWeight="bold">🔬 HYBRID</Typography><Typography variant="caption">Recommandé</Typography></Box></ToggleButton>
                            <ToggleButton value="GA"><Box textAlign="center"><Typography fontWeight="bold">🧬 GA</Typography><Typography variant="caption">Expérimental</Typography></Box></ToggleButton>
                        </ToggleButtonGroup>
                        <Alert severity="success">
                            <Typography variant="subtitle2">L'optimiseur respecte:</Typography>
                            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                <li>✅ Heures contractuelles</li>
                                <li>✅ Maximum 6 jours consécutifs</li>
                                <li>✅ Pas de matin après soir</li>
                                <li>🏥 Couverture: 4 soignants/jour</li>
                            </ul>
                        </Alert>
                        <Alert severity="warning">Temps: {selectedAlgorithm === 'HYBRID' ? '~5 min' : '~60s'}</Alert>
                        <MuiButton variant="contained" color="success" size="large" startIcon={<AutoAwesomeIcon />} onClick={handleOptimizePlanning} disabled={optimizing} fullWidth>
                            {optimizing ? 'Optimisation...' : `Optimiser (${selectedAlgorithm})`}
                        </MuiButton>
                    </Box>
                </DialogContent>
                <DialogActions><MuiButton onClick={() => setOptimizeDialog(false)} disabled={optimizing}>Annuler</MuiButton></DialogActions>
            </Dialog>

            {/* Shift Creation Dialog */}
            <Dialog open={createShiftDialog} onClose={() => setCreateShiftDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Créer un nouveau shift</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}><MuiTextField label="Code" value={newShift.code} onChange={(e) => setNewShift({ ...newShift, code: e.target.value.toUpperCase() })} fullWidth required /></Grid>
                        <Grid item xs={6}><MuiTextField label="Nom" value={newShift.name} onChange={(e) => setNewShift({ ...newShift, name: e.target.value })} fullWidth required /></Grid>
                        <Grid item xs={3}><MuiTextField label="Début" type="time" value={newShift.start_time} onChange={(e) => { const v = e.target.value; setNewShift({ ...newShift, start_time: v, hours: calculateWorkedHours(v, newShift.end_time, newShift.break_minutes) || newShift.hours }); }} fullWidth required InputLabelProps={{ shrink: true }} /></Grid>
                        <Grid item xs={3}><MuiTextField label="Fin" type="time" value={newShift.end_time} onChange={(e) => { const v = e.target.value; setNewShift({ ...newShift, end_time: v, hours: calculateWorkedHours(newShift.start_time, v, newShift.break_minutes) || newShift.hours }); }} fullWidth required InputLabelProps={{ shrink: true }} /></Grid>
                        <Grid item xs={3}><MuiTextField label="Pause (min)" type="number" value={newShift.break_minutes} onChange={(e) => { const v = parseInt(e.target.value) || 0; setNewShift({ ...newShift, break_minutes: v, hours: calculateWorkedHours(newShift.start_time, newShift.end_time, v) || newShift.hours }); }} fullWidth inputProps={{ min: 0 }} /></Grid>
                        <Grid item xs={3}><MuiTextField label="Heures" type="number" value={newShift.hours} onChange={(e) => setNewShift({ ...newShift, hours: parseFloat(e.target.value) || 0 })} fullWidth inputProps={{ step: 0.5 }} /></Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Catégorie</InputLabel>
                                <Select value={newShift.shift_category} onChange={(e) => setNewShift({ ...newShift, shift_category: e.target.value })} label="Catégorie">
                                    <MenuItem value="MORNING">Matin</MenuItem>
                                    <MenuItem value="EVENING">Soir</MenuItem>
                                    <MenuItem value="NIGHT">Nuit</MenuItem>
                                    <MenuItem value="OFF">Jour OFF</MenuItem>
                                    <MenuItem value="LEAVE">Congé</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}><MuiTextField label="Couleur" type="color" value={newShift.color_code} onChange={(e) => setNewShift({ ...newShift, color_code: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                        {shiftValidationError && <Grid item xs={12}><Alert severity="error">{shiftValidationError}</Alert></Grid>}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <MuiButton onClick={() => setCreateShiftDialog(false)}>Annuler</MuiButton>
                    <MuiButton onClick={handleCreateShift} variant="contained" disabled={!newShift.code || !newShift.name}>Créer</MuiButton>
                </DialogActions>
            </Dialog>

            {/* CSV Import Dialog */}
            <Dialog open={csvImportDialog} onClose={() => setCsvImportDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Importer CSV</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={2}>
                        <Alert severity="info">Format: abbreviation,date,shift_code</Alert>
                        <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} style={{ padding: '10px', border: '2px dashed #ccc', borderRadius: '4px' }} />
                        {csvFile && <Alert severity="success">Fichier: {csvFile.name}</Alert>}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <MuiButton onClick={() => { setCsvImportDialog(false); setCsvFile(null); }}>Annuler</MuiButton>
                    <MuiButton onClick={handleCsvImport} variant="contained" disabled={!csvFile || importing}>{importing ? 'Import...' : 'Importer'}</MuiButton>
                </DialogActions>
            </Dialog>

            {/* Analysis Dialog */}
            <Dialog open={analysisDialog} onClose={() => setAnalysisDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle><Box display="flex" alignItems="center" gap={1}><AssessmentIcon /> Analyse de Planning</Box></DialogTitle>
                <DialogContent>
                    {analysisData && (
                        <Box display="flex" flexDirection="column" gap={3} mt={2}>
                            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                                <CardContent>
                                    <Box display="flex" alignItems="center" justifyContent="space-between">
                                        <Box>
                                            <Typography variant="h4" fontWeight="bold">{analysisData.efficiency_score?.toFixed(1) || 0}%</Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.9 }}>Score d'Efficacité</Typography>
                                        </Box>
                                        <TrendingUpIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                            <Grid container spacing={2}>
                                <Grid item xs={6}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h5" color="primary">{analysisData.current_state?.total_assignments || 0}</Typography><Typography variant="caption">Affectations</Typography></Paper></Grid>
                                <Grid item xs={6}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h5" color="success.main">{analysisData.current_state?.total_hours?.toFixed(1) || 0}h</Typography><Typography variant="caption">Heures Totales</Typography></Paper></Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions><MuiButton onClick={() => setAnalysisDialog(false)}>Fermer</MuiButton></DialogActions>
            </Dialog>

            {/* Validation Dialog */}
            <Dialog open={validationDialog} onClose={() => setValidationDialog(false)} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <CheckCircleIcon color={validationResults?.employees_with_errors === 0 ? 'success' : 'error'} />
                        Résultats de Validation
                        {validationResults?.employees_with_errors === 0 ? <Chip label="Valide" color="success" size="small" /> : <Chip label="Erreurs" color="error" size="small" />}
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {validationResults && (
                        <Box display="flex" flexDirection="column" gap={3} mt={2}>
                            <Grid container spacing={2}>
                                <Grid item xs={3}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h4" color="primary">{validationResults.total_employees || 0}</Typography><Typography variant="caption">Employés</Typography></Paper></Grid>
                                <Grid item xs={3}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h4" color="success.main">{(validationResults.total_employees || 0) - (validationResults.employees_with_errors || 0) - (validationResults.employees_with_warnings || 0)}</Typography><Typography variant="caption">OK</Typography></Paper></Grid>
                                <Grid item xs={3}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h4" color="warning.main">{validationResults.employees_with_warnings || 0}</Typography><Typography variant="caption">Avertissements</Typography></Paper></Grid>
                                <Grid item xs={3}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h4" color="error">{validationResults.employees_with_errors || 0}</Typography><Typography variant="caption">Erreurs</Typography></Paper></Grid>
                            </Grid>
                            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Employé</TableCell>
                                            <TableCell align="center">Heures</TableCell>
                                            <TableCell align="center">Jours conséc.</TableCell>
                                            <TableCell>Statut</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {validationResults.results?.map((emp: any) => (
                                            <TableRow key={emp.employee_id} sx={{ backgroundColor: emp.has_errors ? 'rgba(244, 67, 54, 0.1)' : emp.has_warnings ? 'rgba(255, 152, 0, 0.1)' : 'inherit' }}>
                                                <TableCell><Box display="flex" alignItems="center" gap={1}><Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{emp.abbreviation}</Avatar><Typography variant="body2">{emp.name}</Typography></Box></TableCell>
                                                <TableCell align="center"><Typography color={emp.checks?.hours?.status === 'error' ? 'error' : 'inherit'}>{emp.checks?.hours?.current?.toFixed(1)}h / {emp.checks?.hours?.limit?.toFixed(1)}h</Typography></TableCell>
                                                <TableCell align="center"><Chip label={`${emp.checks?.consecutive_days?.max_consecutive || 0}j`} size="small" color={emp.checks?.consecutive_days?.status === 'error' ? 'error' : 'default'} /></TableCell>
                                                <TableCell>{emp.has_errors ? <Chip label="Erreur" size="small" color="error" /> : emp.has_warnings ? <Chip label="Avert." size="small" color="warning" /> : <Chip label="OK" size="small" color="success" />}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions><MuiButton onClick={() => setValidationDialog(false)}>Fermer</MuiButton></DialogActions>
            </Dialog>

            {/* Edit Shift Dialog */}
            <Dialog open={!!editDialog?.open} onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <EditIcon color="primary" />
                        Modifier l'affectation
                        {planning?.status === 'PUBLISHED' && (
                            <Chip label="Planning publié" color="success" size="small" sx={{ ml: 1 }} />
                        )}
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {editDialog && (
                        <Box display="flex" flexDirection="column" gap={2} mt={2}>
                            <Alert severity="info" icon={false}>
                                <Typography variant="body2">
                                    <strong>{editDialog.employeeName}</strong> - Jour {editDialog.day}
                                    {editDialog.currentShift && (
                                        <span> (actuellement: <strong>{editDialog.currentShift}</strong>)</span>
                                    )}
                                </Typography>
                            </Alert>

                            <FormControl fullWidth>
                                <InputLabel>Shift</InputLabel>
                                <Select
                                    value={editingShiftValue}
                                    onChange={(e) => setEditingShiftValue(e.target.value)}
                                    label="Shift"
                                >
                                    <MenuItem value="">
                                        <em>- Aucun (supprimer) -</em>
                                    </MenuItem>
                                    {shiftTypes.map((st) => (
                                        <MenuItem key={st.id} value={st.code}>
                                            <Box display="flex" alignItems="center" gap={1} width="100%">
                                                <Box
                                                    sx={{
                                                        width: 16,
                                                        height: 16,
                                                        borderRadius: 1,
                                                        backgroundColor: st.color_code || '#ccc',
                                                    }}
                                                />
                                                <Typography>{st.code}</Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                                    {st.hours}h
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {/* Audit fields - shown for PUBLISHED planning */}
                            {planning?.status === 'PUBLISHED' && (
                                <>
                                    <Alert severity="warning" sx={{ py: 0.5 }}>
                                        <Typography variant="caption">
                                            Ce planning est publié. Un commentaire est requis pour tracer la modification.
                                        </Typography>
                                    </Alert>

                                    <FormControl fullWidth>
                                        <InputLabel>Demandé par</InputLabel>
                                        <Select
                                            value={editRequestedBy}
                                            onChange={(e) => setEditRequestedBy(e.target.value as any)}
                                            label="Demandé par"
                                        >
                                            <MenuItem value="EMPLOYEE">👤 Employé</MenuItem>
                                            <MenuItem value="EMPLOYER">🏢 Employeur</MenuItem>
                                            <MenuItem value="OTHER">📋 Autre</MenuItem>
                                        </Select>
                                    </FormControl>

                                    <MuiTextField
                                        label="Raison de la modification *"
                                        value={editComment}
                                        onChange={(e) => setEditComment(e.target.value)}
                                        multiline
                                        rows={2}
                                        fullWidth
                                        placeholder="Ex: Demande de l'employé pour raison personnelle, Remplacement maladie, etc."
                                        required
                                        error={!editComment.trim()}
                                        helperText={!editComment.trim() ? "Requis pour les plannings publiés" : ""}
                                    />
                                </>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <MuiButton onClick={() => setEditDialog(null)}>Annuler</MuiButton>
                    {editDialog?.currentShift && (
                        <MuiButton
                            color="error"
                            onClick={async () => {
                                if (editDialog) {
                                    const isPublished = planning?.status === 'PUBLISHED';
                                    if (isPublished && !editComment.trim()) {
                                        notify('Un commentaire est requis', { type: 'warning' });
                                        return;
                                    }
                                    await handleShiftDelete(editDialog.employeeId, editDialog.day, editComment, editRequestedBy);
                                    setEditDialog(null);
                                }
                            }}
                        >
                            Supprimer
                        </MuiButton>
                    )}
                    <MuiButton
                        variant="contained"
                        onClick={async () => {
                            if (editDialog) {
                                const isPublished = planning?.status === 'PUBLISHED';
                                if (isPublished && !editComment.trim()) {
                                    notify('Un commentaire est requis', { type: 'warning' });
                                    return;
                                }
                                if (editingShiftValue) {
                                    await handleShiftSave(editDialog.employeeId, editDialog.day, editingShiftValue, editComment, editRequestedBy);
                                } else if (editDialog.currentShift) {
                                    await handleShiftDelete(editDialog.employeeId, editDialog.day, editComment, editRequestedBy);
                                }
                                setEditDialog(null);
                            }
                        }}
                    >
                        Enregistrer
                    </MuiButton>
                </DialogActions>
            </Dialog>

            {/* Shift History Popover */}
            {historyPopover && (
                <ShiftHistoryPopover
                    anchorEl={historyPopover.anchorEl}
                    onClose={() => setHistoryPopover(null)}
                    planningId={planningId}
                    employeeId={historyPopover.employeeId}
                    employeeName={historyPopover.employeeName}
                    date={historyPopover.date}
                />
            )}

            {/* Day Detail View */}
            {dayDetailView && (
                <DayDetailView
                    day={dayDetailView.day}
                    date={dayDetailView.date}
                    employees={calendarData.employees}
                    shiftTypes={shiftTypes}
                    planningId={planningId}
                    planning={planning}
                    onClose={() => setDayDetailView(null)}
                    onUpdate={loadData}
                />
            )}

            {/* AI Assistant FAB */}
            <Fab
                color="secondary"
                aria-label="AI Assistant"
                onClick={() => setAiChatOpen(true)}
                sx={{ position: 'fixed', bottom: 24, right: 24, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
                <PsychologyIcon />
            </Fab>

            {/* AI Chat Dialog */}
            <Dialog open={aiChatOpen} onClose={() => setAiChatOpen(false)} maxWidth="md" fullWidth>
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

// =============== SHOW ===============
export const PlanningAgGridShow = () => {
    const planningId = parseInt(window.location.hash.match(/\/(\d+)\/show/)?.[1] || '0');

    return (
        <Box p={2}>
            <PlanningAgGridCalendar planningId={planningId} />
        </Box>
    );
};
