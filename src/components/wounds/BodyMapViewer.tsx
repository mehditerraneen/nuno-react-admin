import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Wound } from '../../types';
import { WoundMarker } from './WoundMarker';
import { ZoomControls } from './ZoomControls';
import { MiniMap } from './MiniMap';

// Import SVG body diagrams
import maleBodySvg from '/body-diagrams/male_zones_interactives.svg';
import femaleBodySvg from '/body-diagrams/female_zones_interactives.svg';

interface BodyMapViewerProps {
    patientGender: 'MALE' | 'FEMALE';
    bodyView: 'FRONT' | 'BACK';
    existingWounds: Wound[];
    onZoneClick?: (zone: string, x: number, y: number) => void;
    onWoundClick?: (woundId: number) => void;
    readOnly?: boolean;
}

export const BodyMapViewer: React.FC<BodyMapViewerProps> = ({
    patientGender,
    bodyView,
    existingWounds,
    onZoneClick,
    onWoundClick,
    readOnly = false
}) => {
    const svgContainerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Zoom and pan state
    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [dragMode, setDragMode] = useState(false);

    // Temporary wound marker for click-to-create
    const [tempMarker, setTempMarker] = useState<{ x: number; y: number; zone: string } | null>(null);

    const minZoom = 0.5;
    const maxZoom = 5;

    // Get SVG path based on gender
    const getSvgPath = () => {
        // Default to 'male' if gender is null or undefined
        const gender = patientGender || 'MALE';
        return gender === 'FEMALE' ? femaleBodySvg : maleBodySvg;
    };

    // Apply transform to SVG
    const applyTransform = useCallback(() => {
        if (!svgRef.current) return;
        svgRef.current.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    }, [zoom, panX, panY]);

    useEffect(() => {
        applyTransform();
    }, [applyTransform]);

    // Convert client coordinates to SVG coordinates
    const clientToSVGCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
        if (!svgRef.current || !svgContainerRef.current) return null;

        const svg = svgRef.current;
        const rect = svgContainerRef.current.getBoundingClientRect();

        // Create SVG point
        const point = svg.createSVGPoint();
        point.x = clientX - rect.left;
        point.y = clientY - rect.top;

        // Get the inverse matrix of the current transform
        const ctm = svg.getScreenCTM();
        if (!ctm) return null;

        const transformedPoint = point.matrixTransform(ctm.inverse());

        return {
            x: Math.round(transformedPoint.x),
            y: Math.round(transformedPoint.y)
        };
    };

    // Handle mouse wheel zoom
    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();

        if (!svgContainerRef.current) return;

        const rect = svgContainerRef.current.getBoundingClientRect();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom * delta));

        // Zoom around cursor position
        const centerX = (e.clientX - rect.left) / zoom;
        const centerY = (e.clientY - rect.top) / zoom;

        setPanX((panX - centerX) * (newZoom / zoom) + centerX);
        setPanY((panY - centerY) * (newZoom / zoom) + centerY);
        setZoom(newZoom);
    }, [zoom, panX, panY]);

    useEffect(() => {
        const container = svgContainerRef.current;
        if (!container) return;

        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [handleWheel]);

    // Handle mouse down for dragging
    const handleMouseDown = (e: React.MouseEvent) => {
        if (dragMode) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
        }
    };

    // Handle mouse move for dragging
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging) {
            setPanX(e.clientX - dragStart.x);
            setPanY(e.clientY - dragStart.y);
        }
    }, [isDragging, dragStart]);

    // Handle mouse up to stop dragging
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);

            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Handle SVG click for creating wounds
    const handleSVGClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (readOnly || dragMode) return;

        const target = e.target as SVGElement;
        const zoneElement = target.closest('[id^="zone_"]');

        if (!zoneElement) return;

        const zoneId = zoneElement.id;
        const coords = clientToSVGCoords(e.clientX, e.clientY);

        if (!coords) return;

        // Create temporary marker
        setTempMarker({ x: coords.x, y: coords.y, zone: zoneId });

        // Call callback
        if (onZoneClick) {
            onZoneClick(zoneId, coords.x, coords.y);
        }
    };

    // Handle zoom controls
    const handleZoomIn = () => {
        setZoom(Math.min(maxZoom, zoom * 1.2));
    };

    const handleZoomOut = () => {
        setZoom(Math.max(minZoom, zoom / 1.2));
    };

    const handleZoomReset = () => {
        setZoom(1);
        setPanX(0);
        setPanY(0);
    };

    // Toggle drag mode
    const toggleDragMode = () => {
        setDragMode(!dragMode);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'd' || e.key === 'D') {
                toggleDragMode();
            } else if (e.key === '+' || e.key === '=') {
                handleZoomIn();
            } else if (e.key === '-' || e.key === '_') {
                handleZoomOut();
            } else if (e.key === '0') {
                handleZoomReset();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [zoom, dragMode]);

    // Filter wounds by current body view
    const visibleWounds = existingWounds.filter(
        wound => wound.body_view === bodyView
    );

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '600px' }}>
            <Paper
                ref={svgContainerRef}
                sx={{
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: dragMode ? 'grab' : 'crosshair',
                    backgroundColor: '#f5f5f5'
                }}
                onMouseDown={handleMouseDown}
            >
                <svg
                    ref={svgRef}
                    viewBox="0 0 512 1024"
                    style={{
                        width: '100%',
                        height: '100%',
                        transformOrigin: '0 0',
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                    onClick={handleSVGClick}
                >
                    {/* Load the body diagram */}
                    <image
                        href={getSvgPath()}
                        width="512"
                        height="1024"
                    />

                    {/* Render existing wound markers */}
                    {visibleWounds.map(wound => (
                        <WoundMarker
                            key={wound.id}
                            wound={wound}
                            onClick={() => onWoundClick?.(wound.id)}
                        />
                    ))}

                    {/* Render temporary marker */}
                    {tempMarker && (
                        <circle
                            cx={tempMarker.x}
                            cy={tempMarker.y}
                            r={8}
                            fill="#ff6b6b"
                            stroke="#fff"
                            strokeWidth={2}
                            opacity={0.8}
                            style={{
                                animation: 'pulse 1s infinite'
                            }}
                        />
                    )}
                </svg>
            </Paper>

            {/* Zoom Controls */}
            <ZoomControls
                zoom={zoom}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onZoomReset={handleZoomReset}
                dragMode={dragMode}
                onToggleDragMode={toggleDragMode}
            />

            {/* MiniMap */}
            <MiniMap
                svgPath={getSvgPath()}
                zoom={zoom}
                panX={panX}
                panY={panY}
                onNavigate={(x, y) => {
                    setPanX(x);
                    setPanY(y);
                }}
            />

            {/* Instructions */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    padding: '8px 12px',
                    borderRadius: 1,
                    fontSize: '12px'
                }}
            >
                <Typography variant="caption" display="block">
                    {dragMode ? 'Drag mode: Click and drag to pan' : 'Click mode: Click on body to add wound'}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                    D: Toggle drag | +/-: Zoom | 0: Reset
                </Typography>
            </Box>
        </Box>
    );
};
