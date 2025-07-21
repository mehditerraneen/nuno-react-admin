import React, { useState, useEffect } from 'react';
import { TextInput, TextInputProps } from 'react-admin';
import { 
  formatTimeString, 
  isValidTimeFormat, 
  getTimeFormatErrorMessage,
  COMMON_TIMES 
} from '../utils/timeUtils';
import { 
  Autocomplete, 
  TextField, 
  Chip,
  Box,
  Typography 
} from '@mui/material';
import { useInput, useTranslate } from 'react-admin';

interface TimeInputProps extends Omit<TextInputProps, 'source'> {
  source: string;
  showCommonTimes?: boolean;
  validate24Hour?: boolean;
}

export const TimeInput: React.FC<TimeInputProps> = ({
  source,
  showCommonTimes = false,
  validate24Hour = true,
  helperText,
  ...props
}) => {
  const translate = useTranslate();
  const {
    field,
    fieldState: { error },
    formState: { isSubmitted }
  } = useInput({ source, ...props });

  const [localValue, setLocalValue] = useState(field.value || '');
  const [formatError, setFormatError] = useState<string | null>(null);

  // Sync with form value
  useEffect(() => {
    setLocalValue(field.value || '');
  }, [field.value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocalValue(value);
    
    // Clear format error when user starts typing
    if (formatError) {
      setFormatError(null);
    }
  };

  const handleBlur = () => {
    if (localValue) {
      const formattedTime = formatTimeString(localValue);
      
      if (isValidTimeFormat(formattedTime)) {
        field.onChange(formattedTime);
        setLocalValue(formattedTime);
        setFormatError(null);
      } else {
        setFormatError(getTimeFormatErrorMessage(props.label || 'Time'));
        // Still update the field to trigger validation
        field.onChange(localValue);
      }
    } else {
      field.onChange('');
      setFormatError(null);
    }
    field.onBlur();
  };

  const handleAutocompleteChange = (event: any, newValue: string | null) => {
    if (newValue) {
      setLocalValue(newValue);
      field.onChange(newValue);
      setFormatError(null);
    }
  };

  const currentError = formatError || error?.message;
  const currentHelperText = currentError || helperText;

  if (showCommonTimes) {
    return (
      <Box>
        <Autocomplete
          freeSolo
          options={COMMON_TIMES}
          value={localValue}
          onChange={handleAutocompleteChange}
          onInputChange={(event, newInputValue) => {
            setLocalValue(newInputValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={props.label}
              placeholder="HH:MM (e.g., 09:30)"
              error={!!currentError}
              helperText={currentHelperText}
              onBlur={handleBlur}
              required={props.required}
              fullWidth={props.fullWidth}
            />
          )}
          renderOption={(props, option) => (
            <li {...props}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2">{option}</Typography>
                <Chip 
                  label={new Date(`2000-01-01 ${option}`).toLocaleTimeString([], { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })} 
                  size="small" 
                  variant="outlined"
                />
              </Box>
            </li>
          )}
        />
      </Box>
    );
  }

  return (
    <TextInput
      {...props}
      source={source}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      error={!!currentError}
      helperText={currentHelperText}
      placeholder="HH:MM (e.g., 09:30)"
      inputProps={{
        pattern: '[0-2][0-9]:[0-5][0-9]',
        maxLength: 5,
        ...props.inputProps
      }}
    />
  );
};

// Alternative simpler version that just formats on blur
export const SimpleTimeInput: React.FC<TextInputProps> = (props) => {
  const handleTransform = (value: string) => {
    return formatTimeString(value);
  };

  return (
    <TextInput
      {...props}
      transform={handleTransform}
      placeholder="HH:MM (e.g., 09:30)"
      inputProps={{
        pattern: '[0-2][0-9]:[0-5][0-9]',
        maxLength: 5,
        ...props.inputProps
      }}
    />
  );
};