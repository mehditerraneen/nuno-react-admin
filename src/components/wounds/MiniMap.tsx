import React, { useRef, useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Map, MapOutlined } from '@mui/icons-material';

interface MiniMapProps {
    svgPath: string;
    zoom: number;
    panX: number;
    panY: number;
    onNavigate: (x: number, y: number) => void;
}

/**
 * MiniMap Component
 *
 * Provides a miniature overview of the body map with viewport indicator
 *
 * Features:
 * - Shows full body diagram at small scale
 * - Viewport rectangle shows current view
 * - Click to navigate to specific area
 * - Drag viewport rectangle to pan
 * - Toggle visibility
 */
export const MiniMap: React.FC<MiniMapProps> = ({
    svgPath,
    zoom,
    panX,
    panY,
    onNavigate
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const miniMapRef = useRef<HTMLDivElement>(null);

    // Calculate viewport rectangle dimensions and position
    const viewportWidth = 100 / zoom;
    const viewportHeight = 200 / zoom;
    const viewportX = -panX / zoom / 5.12; // Scale factor for 512px width to 100px
    const viewportY = -panY / zoom / 5.12; // Scale factor for 1024px height to 200px

    const handleMiniMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!miniMapRef.current) return;

        const rect = miniMapRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Convert click position to pan coordinates
        // Center the viewport on the clicked position
        const newPanX = -(x * 5.12 - 256) * zoom;
        const newPanY = -(y * 5.12 - 512) * zoom;

        onNavigate(newPanX, newPanY);
    };

    const handleViewportMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !miniMapRef.current) return;

        const rect = miniMapRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Convert to pan coordinates
        const newPanX = -(x * 5.12 - 256) * zoom;
        const newPanY = -(y * 5.12 - 512) * zoom;

        onNavigate(newPanX, newPanY);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    React.useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);

            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging]);

    return (
        <>
            {/* Toggle button */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 20,
                    left: 20,
                    zIndex: 1000
                }}
            >
                <Tooltip title={isVisible ? "Hide MiniMap (M)" : "Show MiniMap (M)"} placement="right">
                    <IconButton
                        onClick={() => setIsVisible(!isVisible)}
                        sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            boxShadow: 3,
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 1)'
                            }
                        }}
                    >
                        {isVisible ? <Map /> : <MapOutlined />}
                    </IconButton>
                </Tooltip>
            </Box>

            {/* MiniMap panel */}
            {isVisible && (
                <Box
                    ref={miniMapRef}
                    onClick={handleMiniMapClick}
                    sx={{
                        position: 'absolute',
                        bottom: 80,
                        left: 20,
                        width: '100px',
                        height: '200px',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '2px solid #ccc',
                        borderRadius: 1,
                        boxShadow: 3,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        zIndex: 1000
                    }}
                >
                    {/* Body diagram thumbnail */}
                    <img
                        src={svgPath}
                        alt="Mini Map"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            pointerEvents: 'none'
                        }}
                    />

                    {/* Viewport indicator */}
                    <Box
                        onMouseDown={handleViewportMouseDown}
                        sx={{
                            position: 'absolute',
                            left: `${viewportX}px`,
                            top: `${viewportY}px`,
                            width: `${viewportWidth}px`,
                            height: `${viewportHeight}px`,
                            border: '2px solid #1976d2',
                            backgroundColor: 'rgba(25, 118, 210, 0.1)',
                            cursor: isDragging ? 'grabbing' : 'grab',
                            pointerEvents: 'auto'
                        }}
                    />
                </Box>
            )}
        </>
    );
};
