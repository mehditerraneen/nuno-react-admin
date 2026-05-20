import React, { useState, useEffect } from 'react';
import {
    List,
    Datagrid,
    TextField,
    DateField,
    NumberField,
    SelectField,
    Show,
    SimpleShowLayout,
    Edit,
    SimpleForm,
    TextInput,
    NumberInput,
    SelectInput,
    Create,
    useDataProvider,
    useNotify,
    Loading,
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
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    Button,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

const statusChoices = [
    { id: 'DRAFT', name: 'Brouillon' },
    { id: 'PUBLISHED', name: 'Publié' },
    { id: 'LOCKED', name: 'Verrouillé' },
];

// Planning List
export const PlanningList = () => (
    <List>
        <Datagrid rowClick="show">
            <TextField source="month_name" label="Mois" />
            <TextField source="year" label="Année" />
            <NumberField source="working_days" label="Jours ouvrés" />
            <SelectField source="status" choices={statusChoices} label="Statut" />
            <NumberField source="total_assignments" label="Affectations" />
            <NumberField source="total_hours" label="Total heures" />
            <DateField source="created_at" label="Créé le" showTime />
        </Datagrid>
    </List>
);

// Planning Calendar Grid Component
const PlanningCalendarGrid = ({ planningId }: { planningId: string }) => {
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const [loading, setLoading] = useState(true);
    const [calendarData, setCalendarData] = useState<any>(null);
    const [editDialog, setEditDialog] = useState<any>(null);

    useEffect(() => {
        loadCalendarData();
    }, [planningId]);

    const loadCalendarData = async () => {
        try {
            setLoading(true);
            const { data } = await dataProvider.getOne('planning/monthly-planning', {
                id: `${planningId}/calendar_data`,
            });
            setCalendarData(data);
        } catch (error) {
            notify('Error loading calendar data', { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loading />;
    if (!calendarData) return <Typography>No data available</Typography>;

    const { planning, employees } = calendarData;
    const daysInMonth = new Date(planning.year, planning.month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handleCellClick = (employee: any, day: number) => {
        const shift = employee.shifts[day] || {};
        setEditDialog({
            employee,
            day,
            shift,
        });
    };

    const getWeekday = (day: number) => {
        const date = new Date(planning.year, planning.month - 1, day);
        const weekdays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        return weekdays[date.getDay()];
    };

    const isWeekend = (day: number) => {
        const date = new Date(planning.year, planning.month - 1, day);
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6;
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Planning: {planning.month_name} {planning.year}
            </Typography>

            <TableContainer component={Paper} sx={{ maxHeight: '70vh', overflow: 'auto' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell
                                sx={(theme) => ({
                                    position: 'sticky',
                                    left: 0,
                                    backgroundColor: theme.palette.background.paper,
                                    zIndex: 999,
                                    fontWeight: 'bold',
                                    minWidth: 120,
                                    boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                                })}
                            >
                                Employé
                            </TableCell>
                            {days.map((day) => (
                                <TableCell
                                    key={day}
                                    align="center"
                                    sx={{
                                        minWidth: 80,
                                        background: isWeekend(day) ? '#f5f5f5' : '#fff',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    <Box>
                                        <Typography variant="caption" display="block">
                                            {getWeekday(day)}
                                        </Typography>
                                        <Typography variant="body2">{day}</Typography>
                                    </Box>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {employees.map((employee: any) => {
                            const totalHours = Object.values(employee.shifts).reduce(
                                (sum: number, shift: any) => sum + (shift.hours || 0),
                                0
                            );

                            return (
                                <TableRow key={employee.employee_id} hover>
                                    <TableCell
                                        sx={(theme) => ({
                                            position: 'sticky',
                                            left: 0,
                                            backgroundColor: theme.palette.background.paper,
                                            zIndex: 998,
                                            fontWeight: 'bold',
                                            boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                                        })}
                                    >
                                        <Box>
                                            <Typography variant="body2">
                                                {employee.abbreviation}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {totalHours.toFixed(1)}h
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    {days.map((day) => {
                                        const shift = employee.shifts[day];
                                        return (
                                            <TableCell
                                                key={day}
                                                align="center"
                                                sx={{
                                                    background: isWeekend(day) ? '#fafafa' : '#fff',
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        background: '#e3f2fd',
                                                    },
                                                }}
                                                onClick={() => handleCellClick(employee, day)}
                                            >
                                                {shift ? (
                                                    <Chip
                                                        label={shift.shift_code}
                                                        size="small"
                                                        sx={{
                                                            background: shift.color,
                                                            color: '#fff',
                                                            fontSize: '0.75rem',
                                                        }}
                                                    />
                                                ) : (
                                                    <Typography variant="caption" color="textSecondary">
                                                        -
                                                    </Typography>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Edit Dialog */}
            <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth>
                {editDialog && (
                    <>
                        <DialogTitle>
                            Modifier le poste - {editDialog.employee.name} - Jour {editDialog.day}
                        </DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" gutterBottom>
                                Poste actuel: {editDialog.shift.shift_code || 'Non défini'}
                            </Typography>
                            <Typography variant="body2">
                                Heures: {editDialog.shift.hours || 0}h
                            </Typography>
                            <Box mt={2}>
                                <Typography variant="caption" color="textSecondary">
                                    Cliquez sur "Modifier" dans le menu principal pour éditer les affectations
                                </Typography>
                            </Box>
                            <Box mt={2}>
                                <Button onClick={() => setEditDialog(null)}>Fermer</Button>
                            </Box>
                        </DialogContent>
                    </>
                )}
            </Dialog>
        </Box>
    );
};

// Planning Show (with calendar)
export const PlanningShow = () => {
    const [showCalendar, setShowCalendar] = useState(true);

    return (
        <Show>
            <SimpleShowLayout>
                <TextField source="month_name" label="Mois" />
                <TextField source="year" label="Année" />
                <NumberField source="working_days" label="Jours ouvrés" />
                <SelectField source="status" choices={statusChoices} label="Statut" />
                <TextField source="notes" label="Notes" />

                <Box mt={3}>
                    <Button
                        variant="contained"
                        onClick={() => setShowCalendar(!showCalendar)}
                        sx={{ mb: 2 }}
                    >
                        {showCalendar ? 'Masquer' : 'Afficher'} le calendrier
                    </Button>

                    {showCalendar && (
                        <Card>
                            <CardContent>
                                <PlanningCalendarGrid planningId={(window.location.hash.match(/\/(\d+)\/show/) || [])[1]} />
                            </CardContent>
                        </Card>
                    )}
                </Box>
            </SimpleShowLayout>
        </Show>
    );
};

// Planning Edit
export const PlanningEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="month_name" label="Nom du mois" />
            <NumberInput source="year" label="Année" />
            <NumberInput source="month" label="Mois (numéro)" />
            <NumberInput source="working_days" label="Jours ouvrés" />
            <SelectInput source="status" choices={statusChoices} label="Statut" />
            <TextInput source="notes" label="Notes" multiline rows={4} fullWidth />
        </SimpleForm>
    </Edit>
);

// Planning Create
export const PlanningCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="month_name" label="Nom du mois" required />
            <NumberInput source="year" label="Année" required />
            <NumberInput source="month" label="Mois (numéro)" required min={1} max={12} />
            <NumberInput source="working_days" label="Jours ouvrés" required />
            <SelectInput
                source="status"
                choices={statusChoices}
                label="Statut"
                defaultValue="DRAFT"
            />
            <TextInput source="notes" label="Notes" multiline rows={4} fullWidth />
        </SimpleForm>
    </Create>
);
