import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { Wound } from '../../types';

interface WoundPreviewCardProps {
    wound: Wound;
}

/**
 * WoundPreviewCard Component
 *
 * Displays a preview of wound details when hovering over a wound marker
 *
 * Features:
 * - Shows wound ID, status, and description
 * - Displays creation date
 * - Shows evolution count
 * - Status-color coded chip
 * - Compact design for hover tooltip
 */
export const WoundPreviewCard: React.FC<WoundPreviewCardProps> = ({ wound }) => {
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'Invalid date';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'error';
            case 'HEALED':
                return 'success';
            case 'INFECTED':
                return 'warning';
            case 'IMPROVING':
                return 'info';
            case 'STABLE':
                return 'default';
            default:
                return 'default';
        }
    };

    return (
        <Card
            sx={{
                minWidth: 250,
                maxWidth: 300,
                boxShadow: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                pointerEvents: 'none' // Don't interfere with SVG interactions
            }}
        >
            <CardContent sx={{ padding: '12px !important' }}>
                {/* Header with ID and Status */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                        Wound #{wound.id}
                    </Typography>
                    <Chip
                        label={wound.status}
                        color={getStatusColor(wound.status)}
                        size="small"
                        sx={{ fontSize: '10px', height: '20px' }}
                    />
                </Box>

                {/* Description */}
                {wound.description && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            mb: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                        }}
                    >
                        {wound.description}
                    </Typography>
                )}

                {/* Details */}
                <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" display="block" color="text.secondary">
                        Created: {formatDate(wound.date_created)}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                        Area: {wound.body_area || 'N/A'}
                    </Typography>
                    {wound.evolution_count !== undefined && (
                        <Typography variant="caption" display="block" color="text.secondary">
                            Evolutions: {wound.evolution_count}
                        </Typography>
                    )}
                </Box>

                {/* Action hint */}
                <Box
                    sx={{
                        mt: 1,
                        pt: 1,
                        borderTop: '1px solid #eee'
                    }}
                >
                    <Typography variant="caption" color="primary" fontStyle="italic">
                        Click to view | Double-click to edit
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
};
