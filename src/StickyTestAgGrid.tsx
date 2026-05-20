/**
 * AG Grid Sticky Column Test
 */
import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Dummy data
const employees = [
    { id: 1, name: 'Ange N\'SAPOU', abbr: 'NA', hours: '126.0h / 126.0h' },
    { id: 2, name: 'Neda Dostanic', abbr: 'DN', hours: '135.5h / 134.4h' },
    { id: 3, name: 'Nadia Dushimimana', abbr: 'ND', hours: '160.0h / 168.0h' },
    { id: 4, name: 'Sara Karin Allamano', abbr: 'AS', hours: '126.0h / 134.4h' },
    { id: 5, name: 'Sabrina HADJADJ', abbr: 'SH', hours: '159.5h / 168.0h' },
    { id: 6, name: 'Priscila Ochido', abbr: 'OP', hours: '160.0h / 134.4h' },
    { id: 7, name: 'Sejla Kurtagic', abbr: 'KS', hours: '144.0h / 168.0h' },
    { id: 8, name: 'Ana Filipa Teixeira', abbr: 'AF', hours: '120.0h / 134.4h' },
];

const days = Array.from({ length: 28 }, (_, i) => i + 1);
const shifts = ['M7-13', 'M6.5-15', 'S13.5-22', 'CP8', 'OFF', 'CP6.4', 'cours'];
const getRandomShift = () => shifts[Math.floor(Math.random() * shifts.length)];

// Generate row data
const generateRowData = () => {
    return employees.map(emp => {
        const row: any = {
            employee: `${emp.abbr} - ${emp.name}`,
            hours: emp.hours,
        };
        days.forEach(day => {
            row[`day_${day}`] = getRandomShift();
        });
        return row;
    });
};

// Shift cell renderer with colors
const ShiftCellRenderer = (props: any) => {
    const value = props.value;
    const colors: Record<string, string> = {
        'M7-13': '#a5d6a7',
        'M6.5-15': '#c8e6c9',
        'S13.5-22': '#ffcc80',
        'CP8': '#90caf9',
        'CP6.4': '#81d4fa',
        'OFF': '#e0e0e0',
        'cours': '#ce93d8',
    };
    return (
        <span
            style={{
                backgroundColor: colors[value] || '#f5f5f5',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
            }}
        >
            {value}
        </span>
    );
};

export const StickyTestAgGrid = () => {
    const rowData = useMemo(() => generateRowData(), []);

    const columnDefs = useMemo(() => {
        const cols: any[] = [
            {
                field: 'employee',
                headerName: 'Employé',
                pinned: 'left', // THIS IS THE KEY - pins column to left
                width: 200,
                cellRenderer: (params: any) => (
                    <div>
                        <strong>{params.value}</strong>
                        <br />
                        <small style={{ color: '#666' }}>{params.data.hours}</small>
                    </div>
                ),
            },
        ];

        days.forEach(day => {
            cols.push({
                field: `day_${day}`,
                headerName: `${day}/02`,
                width: 90,
                cellRenderer: ShiftCellRenderer,
            });
        });

        return cols;
    }, []);

    const defaultColDef = useMemo(() => ({
        sortable: true,
        resizable: true,
    }), []);

    return (
        <Box p={2}>
            <Typography variant="h5" gutterBottom>
                AG Grid Test - Pinned Column
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                The "Employé" column should stay fixed when scrolling horizontally.
            </Typography>

            <Box sx={{ height: 500, width: '100%', mt: 2 }}>
                <AgGridReact
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    rowHeight={60}
                    headerHeight={50}
                    theme={themeQuartz}
                />
            </Box>
        </Box>
    );
};

export default StickyTestAgGrid;
