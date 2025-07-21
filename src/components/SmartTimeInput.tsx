import React, { useState, useEffect } from 'react';
import { Box, Button, Chip, IconButton, Tooltip, Fade, Zoom } from '@mui/material';
import './SmartTimeInput.css';
import { 
  AutoFixHigh as AutoIcon, 
  Schedule as ClockIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon 
} from '@mui/icons-material';
import { useFormContext, useWatch } from 'react-hook-form';
import { useGetList } from 'react-admin';
import { EnhancedTimeInput } from './ReactAdminTimeInput';
import { 
  calculateSuggestedEndTime, 
  checkSessionDurationMatch,
  formatDurationDisplay 
} from '../utils/timeUtils';
import { LongTermCareItem } from '../dataProvider';

interface SmartTimeInputProps {
  source: string;
  label: string;
  required?: boolean;
  helperText?: string;
  error?: boolean;
  disabled?: boolean;
  autoSuggest?: boolean; // Enable auto-suggestion for end time
  dependsOnCareItems?: boolean; // Whether this field should respond to care items
  sx?: any;
}

export const SmartTimeInput: React.FC<SmartTimeInputProps> = ({
  source,
  label,
  required = false,
  helperText,
  error,
  disabled = false,
  autoSuggest = false,
  dependsOnCareItems = false,
  sx
}) => {
  const { setValue, watch } = useFormContext();
  const { data: allCareItems } = useGetList<LongTermCareItem>('longtermcareitems');
  
  // Watch form values
  const timeStart = useWatch({ name: 'time_start' });
  const timeEnd = useWatch({ name: 'time_end' });
  const careItems = useWatch({ name: 'long_term_care_items' }) || [];
  
  const [suggestedTime, setSuggestedTime] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [isAutoUpdated, setIsAutoUpdated] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [matchStatus, setMatchStatus] = useState<any>(null);
  
  // Create a stable key for care items to detect changes
  const careItemsKey = JSON.stringify(careItems?.map((item: any) => ({
    id: item.long_term_care_item_id,
    quantity: item.quantity
  })) || []);
  
  console.log('🔍 SmartTimeInput render:', {
    source,
    autoSuggest,
    timeStart,
    timeEnd,
    careItemsCount: careItems?.length || 0,
    careItemsKey
  });
  
  useEffect(() => {
    console.log('🔄 SmartTimeInput useEffect triggered for:', source);
    
    if (autoSuggest && source === 'time_end') {
      // Reset state first
      setIsCalculating(true);
      setSuggestedTime(null);
      setShowSuggestion(false);
      setMatchStatus(null);
      
      if (timeStart && careItems.length > 0 && allCareItems) {
        console.log('🔄 Processing suggestion calculation...', { timeStart, careItemsCount: careItems.length });
        
        // Transform care items for calculation
        const transformedItems = careItems.map((item: any) => {
          const careItem = allCareItems.find(ci => ci.id === item.long_term_care_item_id);
          console.log('🔄 Transforming item:', { 
            itemId: item.long_term_care_item_id, 
            found: !!careItem, 
            weeklyPackage: careItem?.weekly_package,
            quantity: item.quantity 
          });
          return {
            long_term_care_item: careItem || { weekly_package: 0 },
            quantity: typeof item.quantity === 'number' ? item.quantity : 1
          };
        });
        
        // Convert timeStart to string format if it's a Date
        let startTimeStr = '';
        if (timeStart instanceof Date) {
          startTimeStr = `${timeStart.getHours().toString().padStart(2, '0')}:${timeStart.getMinutes().toString().padStart(2, '0')}`;
        } else if (typeof timeStart === 'string') {
          startTimeStr = timeStart;
        }
        
        console.log('🔄 Start time processed:', startTimeStr);
        
        const hasValidCareItems = transformedItems.some(item => (item.long_term_care_item.weekly_package || 0) > 0);
        console.log('🔄 Has valid care items:', hasValidCareItems);
        
        if (startTimeStr && hasValidCareItems) {
          const suggested = calculateSuggestedEndTime(startTimeStr, transformedItems, 1);
          console.log('🔄 Suggested time calculated:', suggested);
          
          setSuggestedTime(suggested);
          setShowSuggestion(!!suggested);
          setIsCalculating(false);
          
          // Check if current end time matches expected duration
          if (timeEnd) {
            let endTimeStr = '';
            if (timeEnd instanceof Date) {
              endTimeStr = `${timeEnd.getHours().toString().padStart(2, '0')}:${timeEnd.getMinutes().toString().padStart(2, '0')}`;
            } else if (typeof timeEnd === 'string') {
              endTimeStr = timeEnd;
            }
            
            if (endTimeStr) {
              const match = checkSessionDurationMatch(startTimeStr, endTimeStr, transformedItems);
              setMatchStatus(match);
              console.log('🔄 Match status:', match);
            }
          }
        } else {
          console.log('🔄 No suggestion: missing requirements');
          setIsCalculating(false);
        }
      } else {
        console.log('🔄 No suggestion: missing dependencies', { 
          timeStart: !!timeStart, 
          careItemsLength: careItems.length, 
          allCareItems: !!allCareItems 
        });
        setIsCalculating(false);
      }
    } else if (autoSuggest && source === 'time_end') {
      // Reset suggestions when not applicable
      console.log('🔄 Resetting suggestions (not applicable)');
      setIsCalculating(false);
      setSuggestedTime(null);
      setShowSuggestion(false);
      setMatchStatus(null);
    }
  }, [timeStart, careItemsKey, allCareItems, autoSuggest, source, timeEnd]);
  
  const handleApplySuggestion = () => {
    if (suggestedTime) {
      // Convert suggested time to Date object for React Admin
      const [hours, minutes] = suggestedTime.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      
      setValue(source, date);
      setIsAutoUpdated(true);
      setShowSuggestion(false);
      
      // Show auto-update effect for 3 seconds
      setTimeout(() => setIsAutoUpdated(false), 3000);
    }
  };
  
  const getStatusIcon = () => {
    if (isAutoUpdated) {
      return <CheckIcon sx={{ color: 'success.main', animation: 'pulse 1s infinite' }} />;
    }
    
    if (matchStatus?.matches) {
      return <CheckIcon sx={{ color: 'success.main' }} />;
    }
    
    if (matchStatus && !matchStatus.matches) {
      return <WarningIcon sx={{ color: 'warning.main' }} />;
    }
    
    return null;
  };
  
  const getHelperText = () => {
    if (isAutoUpdated) {
      return '✨ Auto-updated based on care package duration';
    }
    
    if (matchStatus?.matches) {
      return `✅ Perfect match: ${formatDurationDisplay(matchStatus.expectedDuration)}`;
    }
    
    if (matchStatus && !matchStatus.matches) {
      const diff = matchStatus.difference;
      const diffText = diff > 0 ? `${formatDurationDisplay(diff)} longer` : `${formatDurationDisplay(-diff)} shorter`;
      return `⚠️ ${diffText} than care package (${formatDurationDisplay(matchStatus.expectedDuration)})`;
    }
    
    return helperText;
  };
  
  const getStatusColor = () => {
    if (isAutoUpdated) return 'success';
    if (matchStatus?.matches) return 'success';
    if (matchStatus && !matchStatus.matches) return 'warning';
    return 'primary';
  };
  
  return (
    <Box sx={{ position: 'relative', ...sx }}>
      <EnhancedTimeInput
        source={source}
        label={label}
        required={required}
        helperText={getHelperText()}
        error={error}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderColor: isAutoUpdated ? 'success.main' : undefined,
            boxShadow: isAutoUpdated ? '0 0 10px rgba(76, 175, 80, 0.3)' : undefined,
            transition: 'all 0.3s ease-in-out',
          }
        }}
      />
      
      {/* Status Icon */}
      <Box sx={{ 
        position: 'absolute', 
        right: 45, 
        top: '50%', 
        transform: 'translateY(-50%)',
        zIndex: 1
      }}>
        <Zoom in={!!getStatusIcon()}>
          <Box>{getStatusIcon()}</Box>
        </Zoom>
      </Box>
      
      {/* Calculating Indicator */}
      {isCalculating && autoSuggest && (
        <Fade in={isCalculating}>
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<AutoIcon sx={{ animation: 'spin 1s linear infinite' }} />}
              label="Calculating suggestion..."
              size="small"
              variant="outlined"
              color="primary"
              sx={{
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }}
            />
          </Box>
        </Fade>
      )}

      {/* Auto-suggestion Button */}
      {showSuggestion && suggestedTime && !isCalculating && (
        <Fade in={showSuggestion}>
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={`Based on care package duration: ${formatDurationDisplay(matchStatus?.expectedDuration || 0)}`}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AutoIcon />}
                onClick={handleApplySuggestion}
                sx={{ 
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  animation: 'glow 2s ease-in-out infinite alternate',
                  '@keyframes glow': {
                    from: { boxShadow: '0 0 5px rgba(25, 118, 210, 0.5)' },
                    to: { boxShadow: '0 0 15px rgba(25, 118, 210, 0.8)' }
                  }
                }}
              >
                Suggest: {suggestedTime}
              </Button>
            </Tooltip>
            
            <Chip
              icon={<ClockIcon />}
              label={`${formatDurationDisplay(matchStatus?.expectedDuration || 0)} session`}
              size="small"
              variant="outlined"
              color="info"
            />
          </Box>
        </Fade>
      )}
      
      {/* Auto-update notification */}
      {isAutoUpdated && (
        <Fade in={isAutoUpdated}>
          <Box sx={{ mt: 1 }}>
            <Chip
              icon={<AutoIcon />}
              label="Time automatically calculated from care items"
              size="small"
              color="success"
              variant="filled"
              sx={{ 
                animation: 'slideIn 0.5s ease-out',
                '@keyframes slideIn': {
                  from: { transform: 'translateX(-20px)', opacity: 0 },
                  to: { transform: 'translateX(0)', opacity: 1 }
                }
              }}
            />
          </Box>
        </Fade>
      )}
    </Box>
  );
};