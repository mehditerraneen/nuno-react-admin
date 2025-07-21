import React, { useState, useEffect } from 'react';
import { 
  ReferenceArrayInput, 
  CheckboxGroupInput, 
  useGetList,
  useInput,
  FormDataConsumer
} from 'react-admin';
import { FormControl, FormLabel, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import { CareOccurrence } from '../dataProvider';

interface SmartOccurrenceInputProps {
  source: string;
  label?: string;
  required?: boolean;
}

export const SmartOccurrenceInput: React.FC<SmartOccurrenceInputProps> = ({
  source,
  label = "Occurrences (Days of Week)",
  required = false
}) => {
  const { field } = useInput({ source });
  const [selectedIds, setSelectedIds] = useState<number[]>(field.value || []);
  
  // Fetch occurrence data to identify "tous les jours"
  const { data: occurrences, isLoading } = useGetList<CareOccurrence>('careoccurrences');
  
  // Find "tous les jours" occurrence (could be by name, value, or specific ID)
  const tousLesJoursOcc = occurrences?.find(occ => 
    occ.str_name?.toLowerCase().includes('tous les jours') || 
    occ.str_name?.toLowerCase().includes('daily') ||
    occ.value?.toLowerCase().includes('daily') ||
    occ.str_name === '*'
  );
  
  const handleChange = (newSelectedIds: number[]) => {
    console.log('🔄 Occurrence selection changed:', newSelectedIds);
    
    if (!tousLesJoursOcc) {
      // If we can't identify "tous les jours", use normal behavior
      setSelectedIds(newSelectedIds);
      field.onChange(newSelectedIds);
      return;
    }
    
    const tousLesJoursId = tousLesJoursOcc.id;
    const isTousLesJoursSelected = newSelectedIds.includes(tousLesJoursId);
    const wasTousLesJoursSelected = selectedIds.includes(tousLesJoursId);
    
    // If "tous les jours" was just selected
    if (isTousLesJoursSelected && !wasTousLesJoursSelected) {
      console.log('📅 "Tous les jours" selected - clearing other selections');
      // Clear all other selections, keep only "tous les jours"
      const newSelection = [tousLesJoursId];
      setSelectedIds(newSelection);
      field.onChange(newSelection);
      return;
    }
    
    // If "tous les jours" was unselected, allow normal selection
    if (!isTousLesJoursSelected && wasTousLesJoursSelected) {
      console.log('📅 "Tous les jours" unselected - allowing other selections');
      const newSelection = newSelectedIds.filter(id => id !== tousLesJoursId);
      setSelectedIds(newSelection);
      field.onChange(newSelection);
      return;
    }
    
    // If "tous les jours" is already selected and user tries to select others
    if (isTousLesJoursSelected && newSelectedIds.length > 1) {
      console.log('📅 "Tous les jours" already selected - ignoring other selections');
      // Keep only "tous les jours" selected
      const newSelection = [tousLesJoursId];
      setSelectedIds(newSelection);
      field.onChange(newSelection);
      return;
    }
    
    // Normal selection behavior
    setSelectedIds(newSelectedIds);
    field.onChange(newSelectedIds);
  };
  
  if (isLoading) {
    return <div>Loading occurrences...</div>;
  }
  
  if (!occurrences) {
    return <div>Failed to load occurrences</div>;
  }
  
  const tousLesJoursId = tousLesJoursOcc?.id;
  const isTousLesJoursSelected = tousLesJoursId && selectedIds.includes(tousLesJoursId);
  
  return (
    <FormControl component="fieldset" required={required} fullWidth>
      <FormLabel component="legend">{label}</FormLabel>
      <FormGroup>
        {occurrences.map((occurrence) => {
          const isDisabled = isTousLesJoursSelected && occurrence.id !== tousLesJoursId;
          const isChecked = selectedIds.includes(occurrence.id);
          
          return (
            <FormControlLabel
              key={occurrence.id}
              control={
                <Checkbox
                  checked={isChecked}
                  onChange={(event) => {
                    const newSelectedIds = event.target.checked
                      ? [...selectedIds, occurrence.id]
                      : selectedIds.filter(id => id !== occurrence.id);
                    handleChange(newSelectedIds);
                  }}
                  disabled={isDisabled}
                />
              }
              label={
                <span style={{ 
                  color: isDisabled ? '#ccc' : 'inherit',
                  fontWeight: occurrence.id === tousLesJoursId ? 'bold' : 'normal'
                }}>
                  {occurrence.str_name}
                  {occurrence.id === tousLesJoursId && ' (Daily)'}
                </span>
              }
            />
          );
        })}
      </FormGroup>
    </FormControl>
  );
};