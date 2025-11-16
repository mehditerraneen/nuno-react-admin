import React from 'react';
import { Box, IconButton, Typography, Tooltip, ButtonGroup } from '@mui/material';
import {
    ZoomIn,
    ZoomOut,
    RestartAlt,
    PanTool,
    TouchApp
} from '@mui/icons-material';

interface ZoomControlsProps {
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
    dragMode: boolean;
    onToggleDragMode: () => void;
}

/**
 * ZoomControls Component
 *
 * Provides zoom and pan controls for the body map viewer
 *
 * Features:
 * - Zoom in/out buttons
 * - Reset zoom button
 * - Toggle drag mode button
 * - Zoom level display
 * - Tooltips with keyboard shortcuts
 */
export const ZoomControls: React.FC<ZoomControlsProps> = ({
    zoom,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    dragMode,
    onToggleDragMode
}) => {
    const zoomPercentage = Math.round(zoom * 100);

    return (
        <Box
            sx={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 2,
                boxShadow: 3,
                padding: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                zIndex: 1000
            }}
        >
            {/* Zoom level display */}
            <Box
                sx={{
                    textAlign: 'center',
                    padding: '4px 8px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: 1
                }}
            >
                <Typography variant="caption" fontWeight="bold">
                    {zoomPercentage}%
                </Typography>
            </Box>

            {/* Zoom controls */}
            <ButtonGroup
                orientation="vertical"
                variant="outlined"
                size="small"
            >
                <Tooltip title="Zoom In (+)" placement="left">
                    <IconButton onClick={onZoomIn} size="small">
                        <ZoomIn />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Zoom Out (-)" placement="left">
                    <IconButton onClick={onZoomOut} size="small">
                        <ZoomOut />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Reset Zoom (0)" placement="left">
                    <IconButton onClick={onZoomReset} size="small">
                        <RestartAlt />
                    </IconButton>
                </Tooltip>

                <Tooltip title={dragMode ? "Switch to Click Mode (D)" : "Switch to Drag Mode (D)"} placement="left">
                    <IconButton
                        onClick={onToggleDragMode}
                        size="small"
                        color={dragMode ? "primary" : "default"}
                        sx={{
                            backgroundColor: dragMode ? 'rgba(25, 118, 210, 0.1)' : 'transparent'
                        }}
                    >
                        {dragMode ? <PanTool /> : <TouchApp />}
                    </IconButton>
                </Tooltip>
            </ButtonGroup>

            {/* Keyboard shortcuts hint */}
            <Box
                sx={{
                    textAlign: 'center',
                    padding: '4px',
                    fontSize: '10px',
                    color: 'text.secondary'
                }}
            >
                <Typography variant="caption" fontSize="9px">
                    Mouse wheel to zoom
                </Typography>
            </Box>
        </Box>
    );
};
