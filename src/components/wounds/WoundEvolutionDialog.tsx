import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useDataProvider, useNotify } from 'react-admin';
import {
  EVOLUTION_TYPE_LABELS,
  SEVERITY_LABELS,
  type EvolutionType,
  type SeverityLevel,
} from '../../types/wounds';

interface WoundEvolutionDialogProps {
  open: boolean;
  onClose: () => void;
  woundId: number;
  onSuccess: () => void;
  evolution?: any; // For editing existing evolution
}

interface EvolutionFormData {
  evolution_type: EvolutionType;
  observations: string;
  severity?: SeverityLevel;
  size_length_mm?: number;
  size_width_mm?: number;
  size_depth_mm?: number;
  treatment_applied?: string;
  next_assessment_date?: Date | null;
  recorded_by: string;
}

/**
 * WoundEvolutionDialog Component
 *
 * Dialog for adding or editing wound evolution entries.
 *
 * Features:
 * - Evolution type selection (Assessment, Treatment, Progress, Complication, Healing)
 * - Detailed observations (multiline text)
 * - Severity level
 * - Size measurements (length, width, depth in mm)
 * - Treatment documentation
 * - Next assessment scheduling
 * - Professional who performed the assessment
 * - Form validation
 */
export const WoundEvolutionDialog = ({
  open,
  onClose,
  woundId,
  onSuccess,
  evolution,
}: WoundEvolutionDialogProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EvolutionFormData>({
    defaultValues: evolution
      ? {
          evolution_type: evolution.evolution_type,
          observations: evolution.observations || '',
          severity: evolution.severity || undefined,
          size_length_mm: evolution.size_length_mm || undefined,
          size_width_mm: evolution.size_width_mm || undefined,
          size_depth_mm: evolution.size_depth_mm || undefined,
          treatment_applied: evolution.treatment_applied || '',
          next_assessment_date: evolution.next_assessment_date
            ? new Date(evolution.next_assessment_date)
            : null,
          recorded_by: evolution.recorded_by || '',
        }
      : {
          evolution_type: 'PROGRESS',
          observations: '',
          severity: undefined,
          size_length_mm: undefined,
          size_width_mm: undefined,
          size_depth_mm: undefined,
          treatment_applied: '',
          next_assessment_date: null,
          recorded_by: '',
        },
  });

  const dataProvider = useDataProvider();
  const notify = useNotify();

  const onSubmit = async (data: EvolutionFormData) => {
    try {
      // Convert date to ISO string
      const payload = {
        ...data,
        next_assessment_date: data.next_assessment_date
          ? data.next_assessment_date.toISOString()
          : undefined,
      };

      if (evolution) {
        await dataProvider.updateWoundEvolution(woundId, evolution.id, payload);
        notify('Évolution mise à jour avec succès', { type: 'success' });
      } else {
        await dataProvider.createWoundEvolution(woundId, payload);
        notify('Évolution créée avec succès', { type: 'success' });
      }

      reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      notify(error.message || 'Erreur lors de la sauvegarde', { type: 'error' });
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {evolution ? 'Modifier' : 'Ajouter'} une évolution
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Documentez l'état actuel de la plaie, les traitements appliqués et les observations.
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {/* Evolution Type */}
            <Grid item xs={12} md={6}>
              <Controller
                name="evolution_type"
                control={control}
                rules={{ required: 'Le type est requis' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.evolution_type}>
                    <InputLabel>Type d'évolution</InputLabel>
                    <Select {...field} label="Type d'évolution">
                      {Object.entries(EVOLUTION_TYPE_LABELS).map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Severity */}
            <Grid item xs={12} md={6}>
              <Controller
                name="severity"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Sévérité</InputLabel>
                    <Select {...field} label="Sévérité" value={field.value || ''}>
                      <MenuItem value="">
                        <em>Non spécifié</em>
                      </MenuItem>
                      {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Observations */}
            <Grid item xs={12}>
              <Controller
                name="observations"
                control={control}
                rules={{ required: 'Les observations sont requises' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Observations"
                    multiline
                    rows={4}
                    fullWidth
                    error={!!errors.observations}
                    helperText={
                      errors.observations?.message ||
                      "Décrivez l'apparence de la plaie, les signes d'infection, la douleur, etc."
                    }
                  />
                )}
              />
            </Grid>

            {/* Size Measurements */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Mesures (en millimètres)
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="size_length_mm"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Longueur (mm)"
                    type="number"
                    fullWidth
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="size_width_mm"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Largeur (mm)"
                    type="number"
                    fullWidth
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="size_depth_mm"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Profondeur (mm)"
                    type="number"
                    fullWidth
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                )}
              />
            </Grid>

            {/* Treatment Applied */}
            <Grid item xs={12}>
              <Controller
                name="treatment_applied"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Traitement appliqué"
                    multiline
                    rows={2}
                    fullWidth
                    helperText="Pansements utilisés, nettoyage, médicaments appliqués, etc."
                  />
                )}
              />
            </Grid>

            {/* Next Assessment Date */}
            <Grid item xs={12} md={6}>
              <Controller
                name="next_assessment_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Prochaine évaluation"
                    type="datetime-local"
                    fullWidth
                    value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                    helperText="Date et heure de la prochaine évaluation prévue"
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            {/* Recorded By */}
            <Grid item xs={12} md={6}>
              <Controller
                name="recorded_by"
                control={control}
                rules={{ required: 'Le nom du professionnel est requis' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Évalué par"
                    fullWidth
                    error={!!errors.recorded_by}
                    helperText={
                      errors.recorded_by?.message ||
                      'Nom du professionnel de santé qui a effectué cette évaluation'
                    }
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
