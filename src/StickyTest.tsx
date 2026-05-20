/**
 * Sticky Column Test Component
 * Simple test to debug sticky positioning
 */
import React from 'react';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Paper,
} from '@mui/material';

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

export const StickyTest = () => {
    return (
        <Box p={2}>
            <h2>Sticky Column Test</h2>

            {/* Test 1: Pure HTML table */}
            <h3>Test 1: Pure HTML Table</h3>
            <div
                style={{
                    maxHeight: '300px',
                    overflow: 'auto',
                    border: '1px solid #ccc',
                    marginBottom: '40px',
                }}
            >
                <table
                    style={{
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        width: '100%',
                    }}
                >
                    <thead>
                        <tr>
                            <th
                                style={{
                                    position: 'sticky',
                                    left: 0,
                                    top: 0,
                                    zIndex: 3,
                                    background: '#fff',
                                    minWidth: 200,
                                    padding: '8px',
                                    borderRight: '2px solid #ccc',
                                    borderBottom: '1px solid #ccc',
                                }}
                            >
                                Employé
                            </th>
                            {days.map(day => (
                                <th
                                    key={day}
                                    style={{
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 1,
                                        background: '#f5f5f5',
                                        minWidth: 80,
                                        padding: '8px',
                                        borderBottom: '1px solid #ccc',
                                    }}
                                >
                                    {day}/02
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map(emp => (
                            <tr key={emp.id}>
                                <td
                                    style={{
                                        position: 'sticky',
                                        left: 0,
                                        zIndex: 2,
                                        background: '#fff',
                                        minWidth: 200,
                                        padding: '8px',
                                        borderRight: '2px solid #ccc',
                                        boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    <strong>{emp.abbr}</strong> - {emp.name}
                                    <br />
                                    <small>{emp.hours}</small>
                                </td>
                                {days.map(day => (
                                    <td
                                        key={day}
                                        style={{
                                            minWidth: 80,
                                            padding: '8px',
                                            textAlign: 'center',
                                            borderBottom: '1px solid #eee',
                                        }}
                                    >
                                        {getRandomShift()}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Test 2: MUI Table */}
            <h3>Test 2: MUI Table with inline styles</h3>
            <Paper
                sx={{
                    maxHeight: '300px',
                    overflow: 'auto',
                    marginBottom: '40px',
                }}
            >
                <Table
                    size="small"
                    sx={{
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell
                                style={{
                                    position: 'sticky',
                                    left: 0,
                                    top: 0,
                                    zIndex: 3,
                                    background: '#fff',
                                }}
                                sx={{
                                    minWidth: 200,
                                    fontWeight: 'bold',
                                    borderRight: '2px solid #ccc',
                                }}
                            >
                                Employé
                            </TableCell>
                            {days.map(day => (
                                <TableCell
                                    key={day}
                                    style={{
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 1,
                                        background: '#f5f5f5',
                                    }}
                                    sx={{ minWidth: 80, textAlign: 'center' }}
                                >
                                    {day}/02
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {employees.map(emp => (
                            <TableRow key={emp.id}>
                                <TableCell
                                    style={{
                                        position: 'sticky',
                                        left: 0,
                                        zIndex: 2,
                                        background: '#fff',
                                    }}
                                    sx={{
                                        minWidth: 200,
                                        borderRight: '2px solid #ccc',
                                        boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    <strong>{emp.abbr}</strong> - {emp.name}
                                    <br />
                                    <small>{emp.hours}</small>
                                </TableCell>
                                {days.map(day => (
                                    <TableCell
                                        key={day}
                                        sx={{ minWidth: 80, textAlign: 'center' }}
                                    >
                                        {getRandomShift()}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            {/* Test 3: MUI Table with TableContainer */}
            <h3>Test 3: MUI Table with Box wrapper</h3>
            <Box
                sx={{
                    maxHeight: '300px',
                    overflow: 'auto',
                    border: '1px solid #ccc',
                    marginBottom: '40px',
                }}
            >
                <Table
                    stickyHeader
                    size="small"
                    sx={{
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        '& thead th': {
                            position: 'sticky',
                            top: 0,
                            background: '#f5f5f5',
                            zIndex: 1,
                        },
                        '& thead th:first-of-type': {
                            position: 'sticky',
                            left: 0,
                            top: 0,
                            zIndex: 3,
                            background: '#fff',
                        },
                        '& tbody td:first-of-type': {
                            position: 'sticky',
                            left: 0,
                            zIndex: 2,
                            background: '#fff',
                        },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ minWidth: 200, fontWeight: 'bold', borderRight: '2px solid #ccc' }}>
                                Employé
                            </TableCell>
                            {days.map(day => (
                                <TableCell key={day} sx={{ minWidth: 80, textAlign: 'center' }}>
                                    {day}/02
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {employees.map(emp => (
                            <TableRow key={emp.id}>
                                <TableCell
                                    sx={{
                                        minWidth: 200,
                                        borderRight: '2px solid #ccc',
                                        boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    <strong>{emp.abbr}</strong> - {emp.name}
                                    <br />
                                    <small>{emp.hours}</small>
                                </TableCell>
                                {days.map(day => (
                                    <TableCell key={day} sx={{ minWidth: 80, textAlign: 'center' }}>
                                        {getRandomShift()}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Box>
        </Box>
    );
};

export default StickyTest;
