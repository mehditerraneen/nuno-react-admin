import {
  Show,
  SimpleShowLayout,
  TextField,
  DateField,
  ReferenceField,
  FunctionField,
  useRecordContext,
  useDataProvider,
  TopToolbar,
  EditButton,
  DeleteButton,
  ListButton,
} from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Divider,
  Grid,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { WoundEvolutionDialog } from './WoundEvolutionDialog';
import { WoundImageGallery } from './WoundImageGallery';
import {
  STATUS_LABELS,
  EVOLUTION_TYPE_LABELS,
  SEVERITY_LABELS,
  BODY_AREAS,
  type WoundStatus,
  type TrendIndicator,
} from '../../types/wounds';

const WoundShowActions = () => (
  <TopToolbar>
    <ListButton />
    <EditButton />
    <DeleteButton />
  </TopToolbar>
);

const statusColors: Record<WoundStatus, 'warning' | 'success' | 'error' | 'default'> = {
  ACTIVE: 'warning',
  HEALED: 'success',
  INFECTED: 'error',
  ARCHIVED: 'default',
};

const trendIcons: Record<TrendIndicator, JSX.Element> = {
  improving: <TrendingDownIcon color="success" />,
  stable: <TrendingFlatIcon color="warning" />,
  worsening: <TrendingUpIcon color="error" />,
  unknown: <TrendingFlatIcon color="disabled" />,
};

const trendColors: Record<TrendIndicator, 'success' | 'warning' | 'error' | 'default'> = {
  improving: 'success',
  stable: 'warning',
  worsening: 'error',
  unknown: 'default',
};

const trendLabels: Record<TrendIndicator, string> = {
  improving: 'Amélioration',
  stable: 'Stable',
  worsening: 'Détérioration',
  unknown: 'Indéterminé',
};

/**
 * WoundShow Component
 *
 * Displays comprehensive wound details including:
 * - Basic wound information
 * - Evolution timeline with trend analysis
 * - Size change calculations
 * - Image gallery
 * - Actions (add evolution, upload image, edit, delete)
 */
export const WoundShow = () => {
  const record = useRecordContext();
  const [evolutions, setEvolutions] = useState<any[]>([]);
  const [loadingEvolutions, setLoadingEvolutions] = useState(true);
  const [showEvolutionDialog, setShowEvolutionDialog] = useState(false);
  const [selectedEvolution, setSelectedEvolution] = useState<any>(null);

  const dataProvider = useDataProvider();

  useEffect(() => {
    if (record?.id) {
      loadEvolutions();
    }
  }, [record?.id]);

  const loadEvolutions = async () => {
    setLoadingEvolutions(true);
    try {
      const response = await dataProvider.getWoundEvolutions(record.id);
      const evolutionsData = Array.isArray(response) ? response : response.data || [];
      // Sort by date descending (most recent first)
      evolutionsData.sort((a: any, b: any) =>
        new Date(b.date_recorded).getTime() - new Date(a.date_recorded).getTime()
      );
      setEvolutions(evolutionsData);
    } catch (error) {
      console.error('Error loading evolutions:', error);
      setEvolutions([]);
    } finally {
      setLoadingEvolutions(false);
    }
  };

  const handleEvolutionSuccess = () => {
    loadEvolutions();
    setSelectedEvolution(null);
  };

  const handleEditEvolution = (evolution: any) => {
    setSelectedEvolution(evolution);
    setShowEvolutionDialog(true);
  };

  const calculateSizeChange = (current: number | undefined, previous: number | undefined) => {
    if (current === undefined || previous === undefined) return null;
    const delta = current - previous;
    const percent = previous > 0 ? ((delta / previous) * 100).toFixed(1) : '0.0';
    return { delta, percent };
  };

  if (!record) return null;

  const bodyAreaLabel = BODY_AREAS[record.body_area as keyof typeof BODY_AREAS] || record.body_area;
  const viewLabel = record.body_view === 'FRONT' ? 'Face' : record.body_view === 'BACK' ? 'Dos' : 'Latérale';

  return (
    <Show actions={<WoundShowActions />}>
      <SimpleShowLayout>
        <Grid container spacing={3}>
          {/* Wound Details Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Détails de la plaie
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Patient
                  </Typography>
                  <ReferenceField source="patient" reference="patients" link="show">
                    <FunctionField
                      render={(patientRecord: any) =>
                        <Typography variant="body1">
                          {patientRecord ? `${patientRecord.name} ${patientRecord.first_name || ''}` : '-'}
                        </Typography>
                      }
                    />
                  </ReferenceField>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Statut
                  </Typography>
                  <Chip
                    label={STATUS_LABELS[record.status as WoundStatus]}
                    color={statusColors[record.status as WoundStatus]}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Zone corporelle
                  </Typography>
                  <Typography variant="body1">
                    {bodyAreaLabel} ({viewLabel})
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Position
                  </Typography>
                  <Typography variant="body1">
                    X: {record.x_position}, Y: {record.y_position}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Date de création
                  </Typography>
                  <DateField source="date_created" showTime />
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1">{record.description}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Statistics Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Statistiques
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Nombre d'évolutions
                  </Typography>
                  <Typography variant="h4">{evolutions.length}</Typography>
                </Box>

                {evolutions.length > 0 && evolutions[0].trend_indicator && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Tendance générale
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      {trendIcons[evolutions[0].trend_indicator as TrendIndicator]}
                      <Chip
                        label={trendLabels[evolutions[0].trend_indicator as TrendIndicator]}
                        color={trendColors[evolutions[0].trend_indicator as TrendIndicator]}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </Box>
                )}

                {evolutions.length > 0 && evolutions[0].size_length_mm && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Dernières mesures
                    </Typography>
                    <Typography variant="body1">
                      {evolutions[0].size_length_mm} × {evolutions[0].size_width_mm} × {evolutions[0].size_depth_mm} mm
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Evolution Timeline */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Évolutions de la plaie
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setSelectedEvolution(null);
                      setShowEvolutionDialog(true);
                    }}
                  >
                    Ajouter une évolution
                  </Button>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {loadingEvolutions ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : evolutions.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography color="text.secondary">
                      Aucune évolution enregistrée pour cette plaie.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Cliquez sur "Ajouter une évolution" pour documenter l'état de la plaie.
                    </Typography>
                  </Paper>
                ) : (
                  <Box>
                    {evolutions.map((evolution, index) => {
                      const previousEvolution = evolutions[index + 1];
                      const lengthChange = calculateSizeChange(evolution.size_length_mm, previousEvolution?.size_length_mm);
                      const widthChange = calculateSizeChange(evolution.size_width_mm, previousEvolution?.size_width_mm);
                      const depthChange = calculateSizeChange(evolution.size_depth_mm, previousEvolution?.size_depth_mm);

                      return (
                        <Paper key={evolution.id} sx={{ p: 2, mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box>
                              <Chip
                                label={EVOLUTION_TYPE_LABELS[evolution.evolution_type as keyof typeof EVOLUTION_TYPE_LABELS]}
                                size="small"
                                color="primary"
                                sx={{ mr: 1 }}
                              />
                              {evolution.severity && (
                                <Chip
                                  label={SEVERITY_LABELS[evolution.severity as keyof typeof SEVERITY_LABELS]}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(evolution.date_recorded).toLocaleString('fr-FR')}
                            </Typography>
                          </Box>

                          <Typography variant="body1" sx={{ mb: 2 }}>
                            {evolution.observations}
                          </Typography>

                          {(evolution.size_length_mm || evolution.size_width_mm || evolution.size_depth_mm) && (
                            <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Mesures
                              </Typography>
                              <Grid container spacing={2}>
                                {evolution.size_length_mm && (
                                  <Grid item xs={4}>
                                    <Typography variant="body2" color="text.secondary">
                                      Longueur
                                    </Typography>
                                    <Typography variant="body1">
                                      {evolution.size_length_mm} mm
                                      {lengthChange && (
                                        <Typography
                                          component="span"
                                          variant="caption"
                                          color={lengthChange.delta < 0 ? 'success.main' : lengthChange.delta > 0 ? 'error.main' : 'text.secondary'}
                                          sx={{ ml: 1 }}
                                        >
                                          ({lengthChange.delta > 0 ? '+' : ''}{lengthChange.delta} mm, {lengthChange.percent}%)
                                        </Typography>
                                      )}
                                    </Typography>
                                  </Grid>
                                )}
                                {evolution.size_width_mm && (
                                  <Grid item xs={4}>
                                    <Typography variant="body2" color="text.secondary">
                                      Largeur
                                    </Typography>
                                    <Typography variant="body1">
                                      {evolution.size_width_mm} mm
                                      {widthChange && (
                                        <Typography
                                          component="span"
                                          variant="caption"
                                          color={widthChange.delta < 0 ? 'success.main' : widthChange.delta > 0 ? 'error.main' : 'text.secondary'}
                                          sx={{ ml: 1 }}
                                        >
                                          ({widthChange.delta > 0 ? '+' : ''}{widthChange.delta} mm, {widthChange.percent}%)
                                        </Typography>
                                      )}
                                    </Typography>
                                  </Grid>
                                )}
                                {evolution.size_depth_mm && (
                                  <Grid item xs={4}>
                                    <Typography variant="body2" color="text.secondary">
                                      Profondeur
                                    </Typography>
                                    <Typography variant="body1">
                                      {evolution.size_depth_mm} mm
                                      {depthChange && (
                                        <Typography
                                          component="span"
                                          variant="caption"
                                          color={depthChange.delta < 0 ? 'success.main' : depthChange.delta > 0 ? 'error.main' : 'text.secondary'}
                                          sx={{ ml: 1 }}
                                        >
                                          ({depthChange.delta > 0 ? '+' : ''}{depthChange.delta} mm, {depthChange.percent}%)
                                        </Typography>
                                      )}
                                    </Typography>
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          )}

                          {evolution.treatment_applied && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                Traitement appliqué
                              </Typography>
                              <Typography variant="body2">{evolution.treatment_applied}</Typography>
                            </Box>
                          )}

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              Évalué par: {evolution.recorded_by}
                            </Typography>
                            <Button size="small" onClick={() => handleEditEvolution(evolution)}>
                              Modifier
                            </Button>
                          </Box>
                        </Paper>
                      );
                    })}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Image Gallery */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Galerie d'images
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <WoundImageGallery woundId={record.id} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </SimpleShowLayout>

      <WoundEvolutionDialog
        open={showEvolutionDialog}
        onClose={() => {
          setShowEvolutionDialog(false);
          setSelectedEvolution(null);
        }}
        woundId={record.id}
        onSuccess={handleEvolutionSuccess}
        evolution={selectedEvolution}
      />
    </Show>
  );
};
