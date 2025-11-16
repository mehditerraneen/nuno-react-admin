import React, { useState, useEffect } from 'react';
import {
    Create,
    SimpleForm,
    TextInput,
    SelectInput,
    ReferenceInput,
    AutocompleteInput,
    required,
    useNotify,
    useRedirect,
    useGetOne
} from 'react-admin';
import { useWatch } from 'react-hook-form';
import {
    Box,
    Typography,
    Paper,
    ToggleButtonGroup,
    ToggleButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button
} from '@mui/material';
import { BodyMapViewer } from './BodyMapViewer';
import { mapCoordinatesToBodyArea } from '../../utils/bodyZoneMapping';
import { STATUS_LABELS } from '../../types/wounds';

/**
 * WoundCreateForm Component (Inner form with useWatch)
 */
const WoundCreateForm = () => {
    const notify = useNotify();

    // Watch the patient field value from the form
    const patientId = useWatch({ name: 'patient' });

    // State for body map interaction
    const [bodyView, setBodyView] = useState<'FRONT' | 'BACK'>('FRONT');
    const [tempWoundData, setTempWoundData] = useState<{
        x: number;
        y: number;
        zone: string;
        bodyArea: string;
    } | null>(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    // Get patient data to determine gender
    const { data: patientData } = useGetOne(
        'patients',
        { id: patientId || 0 },
        { enabled: !!patientId }
    );

    const patientGender = patientData?.gender || 'MALE';

    // Handle zone click on body map
    const handleZoneClick = (zone: string, x: number, y: number) => {
        if (!patientId) {
            notify('Please select a patient first', { type: 'warning' });
            return;
        }

        const bodyArea = mapCoordinatesToBodyArea(x, y, bodyView);

        setTempWoundData({
            x,
            y,
            zone,
            bodyArea
        });

        setConfirmDialogOpen(true);
    };

    // Handle confirmation
    const handleConfirm = () => {
        if (!tempWoundData) return;

        // Close dialog
        setConfirmDialogOpen(false);

        // Notify user
        notify('Wound location marked. You can now fill in additional details and save.', { type: 'info' });
    };

    const handleCancel = () => {
        setTempWoundData(null);
        setConfirmDialogOpen(false);
    };

    return (
        <>
            {/* Patient Selection */}
            <ReferenceInput
                source="patient"
                reference="patients"
            >
                <AutocompleteInput
                    optionText={(record: any) =>
                        record ? `${record.name} ${record.first_name || ''} (${record.code_sn})` : ''
                    }
                    label="Patient *"
                    validate={[required()]}
                    fullWidth
                />
            </ReferenceInput>

            {/* Show body map only after patient is selected */}
            {patientId && (
                        <Box sx={{ width: '100%', my: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Select Wound Location on Body Map
                            </Typography>

                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Click on the body diagram to mark the wound location
                            </Typography>

                            {/* View Toggle */}
                            <Box sx={{ mb: 2 }}>
                                <ToggleButtonGroup
                                    value={bodyView}
                                    exclusive
                                    onChange={(_, newView) => {
                                        if (newView) setBodyView(newView);
                                    }}
                                    size="small"
                                >
                                    <ToggleButton value="FRONT">
                                        Front View
                                    </ToggleButton>
                                    <ToggleButton value="BACK">
                                        Back View
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Box>

                            {/* Interactive Body Map */}
                            <Paper elevation={2}>
                                <BodyMapViewer
                                    patientGender={patientGender}
                                    bodyView={bodyView}
                                    existingWounds={[]}
                                    onZoneClick={handleZoneClick}
                                />
                            </Paper>
                        </Box>
                    )}

                    {/* Hidden fields to store coordinates */}
                    {tempWoundData && (
                        <>
                            <TextInput source="x_position" defaultValue={tempWoundData.x} sx={{ display: 'none' }} />
                            <TextInput source="y_position" defaultValue={tempWoundData.y} sx={{ display: 'none' }} />
                            <TextInput source="body_view" defaultValue={bodyView} sx={{ display: 'none' }} />
                            <TextInput source="body_area" defaultValue={tempWoundData.bodyArea} sx={{ display: 'none' }} />
                        </>
                    )}

                    {/* Basic wound information */}
                    <TextInput
                        source="description"
                        label="Description"
                        multiline
                        rows={3}
                        fullWidth
                        helperText="Describe the wound characteristics"
                    />

                    <SelectInput
                        source="status"
                        label="Status"
                        choices={Object.entries(STATUS_LABELS).map(([value, label]) => ({
                            id: value,
                            name: label
                        }))}
                        defaultValue="ACTIVE"
                        validate={[required()]}
                    />

            {/* Confirmation Dialog */}
            <Dialog
                open={confirmDialogOpen}
                onClose={handleCancel}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Confirm Wound Location</DialogTitle>
                <DialogContent>
                    {tempWoundData && (
                        <Box>
                            <Typography variant="body1" gutterBottom>
                                You have selected a wound location at:
                            </Typography>
                            <Paper sx={{ p: 2, mt: 2, backgroundColor: '#f5f5f5' }}>
                                <Typography variant="body2" gutterBottom>
                                    <strong>Body Area:</strong> {tempWoundData.bodyArea}
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                    <strong>View:</strong> {bodyView}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Coordinates:</strong> ({tempWoundData.x}, {tempWoundData.y})
                                </Typography>
                            </Paper>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                Click Confirm to proceed with creating the wound at this location.
                                You can add more details after confirmation.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancel} color="inherit">
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} variant="contained" color="primary">
                        Confirm Location
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

/**
 * WoundCreate Component (Outer wrapper)
 */
export const WoundCreate = () => {
    return (
        <Create redirect="show">
            <SimpleForm>
                <WoundCreateForm />
            </SimpleForm>
        </Create>
    );
};
