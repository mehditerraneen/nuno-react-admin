/**
 * School Calendar Update Banner
 *
 * Displays a notification when Luxembourg school calendar updates are available.
 * Provides a one-click update button.
 */

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Update as UpdateIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useSchoolCalendarUpdates } from '../hooks/useSchoolCalendarUpdates';

export const SchoolCalendarUpdateBanner: React.FC = () => {
  const {
    updateInfo,
    loading,
    error,
    applyUpdate,
    dismissUpdate,
    updating,
  } = useSchoolCalendarUpdates();

  // Don't show anything if no updates or still loading
  if (!updateInfo || loading) {
    return null;
  }

  return (
    <Collapse in={!!updateInfo}>
      <Box sx={{ mb: 2 }}>
        <Alert
          severity="info"
          icon={<CalendarIcon />}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                startIcon={updating ? <CircularProgress size={16} /> : <UpdateIcon />}
                onClick={applyUpdate}
                disabled={updating}
              >
                {updating ? 'Mise à jour...' : 'Mettre à jour'}
              </Button>
              <IconButton
                size="small"
                color="inherit"
                onClick={dismissUpdate}
                disabled={updating}
                aria-label="Fermer"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
          sx={{
            '& .MuiAlert-message': {
              flex: 1,
            },
          }}
        >
          <AlertTitle>
            <strong>Vacances scolaires - Mise à jour disponible</strong>
          </AlertTitle>
          <Box>
            <div>
              Nouvelle mise à jour du calendrier scolaire luxembourgeois pour{' '}
              <strong>{updateInfo.academicYear}</strong>
            </div>
            <div style={{ marginTop: '4px', fontSize: '0.875rem' }}>
              {updateInfo.newCount} période(s) de vacances •{' '}
              Source: {updateInfo.source === 'OFFICIAL' ? 'Ministère de l\'Éducation' : 'Calendrier par défaut'}
            </div>
          </Box>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            Erreur lors de la mise à jour: {error}
          </Alert>
        )}
      </Box>
    </Collapse>
  );
};

export default SchoolCalendarUpdateBanner;
