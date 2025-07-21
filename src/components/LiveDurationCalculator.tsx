import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip, Paper, Alert } from '@mui/material';
import { AccessTime as TimeIcon } from '@mui/icons-material';
import { useFormContext, useWatch } from 'react-hook-form';
import { useGetList } from 'react-admin';
import { 
  calculateSessionDuration, 
  formatDurationDisplay,
  calculateCareItemsDailyDuration,
  calculateCareItemsActualWeeklyDuration,
  calculateActualDaysPerWeek
} from '../utils/timeUtils';
import { LongTermCareItem, CareOccurrence } from '../dataProvider';
import { AutoCalculationNotification } from './AutoCalculationNotification';

interface LiveDurationCalculatorProps {
  className?: string;
}

export const LiveDurationCalculator: React.FC<LiveDurationCalculatorProps> = ({ 
  className 
}) => {
  const { watch } = useFormContext();
  
  // Watch form values for real-time calculation
  const timeStart = useWatch({ name: 'time_start' });
  const timeEnd = useWatch({ name: 'time_end' });
  const occurrenceIds = useWatch({ name: 'params_occurrence_ids' }) || [];
  const careItems = useWatch({ name: 'long_term_care_items' }) || [];
  
  // Fetch occurrence data to get names
  const { data: occurrences } = useGetList<CareOccurrence>('careoccurrences');
  
  // Fetch care items data to get weekly_package values
  const { data: allCareItems } = useGetList<LongTermCareItem>('longtermcareitems');
  
  // Calculate session duration
  const [sessionDuration, setSessionDuration] = useState(0);
  const [careItemsDailyDuration, setCareItemsDailyDuration] = useState(0);
  const [careItemsActualWeeklyDuration, setCareItemsActualWeeklyDuration] = useState(0);
  const [weeklySessionTime, setWeeklySessionTime] = useState(0);
  
  useEffect(() => {
    // Calculate session duration
    let duration = 0;
    if (timeStart && timeEnd) {
      // Handle both string times and Date objects from React Admin TimeInput
      let startTime = '';
      let endTime = '';
      
      if (timeStart instanceof Date) {
        startTime = `${timeStart.getHours().toString().padStart(2, '0')}:${timeStart.getMinutes().toString().padStart(2, '0')}`;
      } else if (typeof timeStart === 'string') {
        startTime = timeStart;
      }
      
      if (timeEnd instanceof Date) {
        endTime = `${timeEnd.getHours().toString().padStart(2, '0')}:${timeEnd.getMinutes().toString().padStart(2, '0')}`;
      } else if (typeof timeEnd === 'string') {
        endTime = timeEnd;
      }
      
      if (startTime && endTime) {
        duration = calculateSessionDuration(startTime, endTime);
      }
    }
    setSessionDuration(duration);
    
    // Calculate actual days per week (check for "tous les jours")
    const selectedOccurrences = occurrences 
      ? occurrenceIds.map(id => occurrences.find(o => o.id === id)).filter(Boolean)
      : [];
    
    const actualDaysPerWeek = calculateActualDaysPerWeek(selectedOccurrences);
    setWeeklySessionTime(duration * actualDaysPerWeek);
  }, [timeStart, timeEnd, occurrenceIds, occurrences]);
  
  useEffect(() => {
    // Calculate care items duration
    if (careItems.length > 0 && allCareItems) {
      console.log('🔍 LiveDurationCalculator - careItems:', careItems);
      console.log('🔍 LiveDurationCalculator - allCareItems:', allCareItems);
      
      const transformedItems = careItems.map((item: any) => {
        const careItem = allCareItems.find(ci => ci.id === item.long_term_care_item_id);
        console.log(`🔍 Item ID ${item.long_term_care_item_id}:`, {
          found: careItem,
          code: careItem?.code,
          weekly_package: careItem?.weekly_package,
          quantity: item.quantity
        });
        
        return {
          long_term_care_item: careItem || { weekly_package: 0 },
          quantity: item.quantity || 1
        };
      });
      
      console.log('🔍 Transformed items:', transformedItems);
      const dailyDuration = calculateCareItemsDailyDuration(transformedItems);
      
      // Get selected occurrence objects for proper calculation
      const selectedOccurrences = occurrences 
        ? occurrenceIds.map(id => occurrences.find(o => o.id === id)).filter(Boolean)
        : [];
      
      const actualWeeklyDuration = calculateCareItemsActualWeeklyDuration(transformedItems, selectedOccurrences);
      
      console.log('🔍 Calculated durations:', { dailyDuration, actualWeeklyDuration, selectedOccurrences });
      setCareItemsDailyDuration(dailyDuration);
      setCareItemsActualWeeklyDuration(actualWeeklyDuration);
    } else {
      setCareItemsDailyDuration(0);
      setCareItemsActualWeeklyDuration(0);
    }
  }, [careItems, allCareItems, occurrenceIds, occurrences]);
  
  // Get selected occurrence names
  const selectedOccurrenceNames = occurrences
    ? occurrenceIds.map((id: number) => {
        const occ = occurrences.find(o => o.id === id);
        return occ?.str_name || `ID:${id}`;
      })
    : [];
  
  // Show warning if no time is selected
  if (!timeStart || !timeEnd) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mt: 2, backgroundColor: '#fff3e0' }} className={className}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimeIcon color="action" />
          <Typography variant="body2" color="text.secondary">
            Select start and end times to see duration calculations
          </Typography>
        </Box>
      </Paper>
    );
  }
  
  // Show error if invalid time range
  if (sessionDuration === 0) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }} className={className}>
        Invalid time range. End time must be after start time.
      </Alert>
    );
  }
  
  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 2, 
        mt: 2, 
        backgroundColor: '#f0f7ff',
        border: '1px solid #2196f3'
      }}
      className={className}
    >
      <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TimeIcon color="primary" />
        Live Duration Calculator
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        {/* Session Duration */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Session Duration
          </Typography>
          <Chip 
            label={formatDurationDisplay(sessionDuration)}
            color="primary"
            size="small"
          />
        </Box>

        {/* Occurrences */}
        {occurrenceIds.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Occurrences ({occurrenceIds.length}x/week)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selectedOccurrenceNames.slice(0, 3).map((name, index) => (
                <Chip 
                  key={index}
                  label={name}
                  size="small"
                  variant="outlined"
                  color="secondary"
                />
              ))}
              {selectedOccurrenceNames.length > 3 && (
                <Chip 
                  label={`+${selectedOccurrenceNames.length - 3} more`}
                  size="small"
                  variant="outlined"
                  color="secondary"
                />
              )}
            </Box>
          </Box>
        )}

        {/* Weekly Session Time */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Weekly Session Time
          </Typography>
          <Chip 
            label={formatDurationDisplay(weeklySessionTime)}
            color="success"
            size="small"
          />
        </Box>

        {/* Care Items Daily Duration */}
        {careItemsDailyDuration > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Care Items Daily
            </Typography>
            <Chip 
              label={formatDurationDisplay(careItemsDailyDuration)}
              color="info"
              variant="outlined"
              size="small"
            />
          </Box>
        )}

        {/* Care Items Actual Weekly Duration */}
        {careItemsActualWeeklyDuration > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Care Package/Week
            </Typography>
            <Chip 
              label={formatDurationDisplay(careItemsActualWeeklyDuration)}
              color="info"
              size="small"
            />
          </Box>
        )}
      </Box>

      {/* Warning if session time doesn't match care package */}
      {careItemsActualWeeklyDuration > 0 && weeklySessionTime !== careItemsActualWeeklyDuration && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="warning.main">
            ⚠️ Session time differs from care package time
          </Typography>
        </Box>
      )}

      {/* Care items breakdown */}
      {careItems.length > 0 && allCareItems && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Care Items: {careItems.map((item: any, index: number) => {
              const careItem = allCareItems.find(ci => ci.id === item.long_term_care_item_id);
              const weeklyPackage = careItem?.weekly_package || 0;
              const dailyPackage = weeklyPackage / 7;
              const itemDailyDuration = dailyPackage * (item.quantity || 1);
              return `${careItem?.code || 'Unknown'}: ${formatDurationDisplay(itemDailyDuration)}/day`;
            }).join(', ')}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};