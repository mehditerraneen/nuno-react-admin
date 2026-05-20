import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  required,
  useRecordContext,
} from 'react-admin';
import { Box, Typography } from '@mui/material';
import { STATUS_LABELS, BODY_AREAS } from '../../types/wounds';

/**
 * WoundEdit Component
 *
 * Simple edit form for updating wound details:
 * - Description
 * - Status (Active, Healed, Infected, Archived)
 * - Read-only display of body area and creation date
 */
export const WoundEdit = () => (
  <Edit>
    <SimpleForm>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Modifier la plaie
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Modifiez les informations de la plaie ci-dessous.
        </Typography>
      </Box>

      <TextInput
        source="description"
        label="Description"
        multiline
        rows={4}
        validate={required()}
        fullWidth
        helperText="Décrivez la plaie, sa taille approximative, son apparence, etc."
      />

      <SelectInput
        source="status"
        label="Statut"
        choices={Object.entries(STATUS_LABELS).map(([value, label]) => ({
          id: value,
          name: label,
        }))}
        validate={required()}
        fullWidth
      />

      {/* Read-only display fields */}
      <WoundInfoDisplay />
    </SimpleForm>
  </Edit>
);

/**
 * Display read-only wound information
 */
const WoundInfoDisplay = () => {
  const record = useRecordContext();

  if (!record) return null;

  const bodyAreaLabel = BODY_AREAS[record.body_area as keyof typeof BODY_AREAS] || record.body_area;
  const viewLabel = record.body_view === 'FRONT' ? 'Face' : record.body_view === 'BACK' ? 'Dos' : 'Latérale';

  return (
    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        Informations de localisation
      </Typography>
      <Typography variant="body2">
        <strong>Zone corporelle:</strong> {bodyAreaLabel}
      </Typography>
      <Typography variant="body2">
        <strong>Vue:</strong> {viewLabel}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>
        <strong>Position:</strong> X: {record.x_position}, Y: {record.y_position}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        La localisation de la plaie ne peut pas être modifiée. Pour changer l'emplacement, créez une nouvelle plaie.
      </Typography>
    </Box>
  );
};
