import React from 'react';
import { useInput, useTranslate } from 'react-admin';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TextField } from '@mui/material';
import { formatTimeString, timeStringToDate, dateToTimeString } from '../utils/timeUtils';

interface MaterialTimeInputProps {
  source: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: boolean;
  sx?: any;
  fullWidth?: boolean;
}

/**
 * Advanced time input using Material-UI's TimePicker
 * Provides a rich time selection experience with clock interface
 */
export const MaterialTimeInput: React.FC<MaterialTimeInputProps> = ({
  source,
  label,
  required = false,
  disabled = false,
  helperText,
  error,
  sx,
  fullWidth = false,
  ...props
}) => {
  const translate = useTranslate();
  const {
    field: { value, onChange, onBlur },
    fieldState: { error: fieldError },
  } = useInput({ source, ...props });

  // Convert string value to Date for TimePicker
  const dateValue = value ? timeStringToDate(value) : null;

  const handleChange = (newValue: Date | null) => {
    if (newValue) {
      const timeString = dateToTimeString(newValue);
      const formattedTime = formatTimeString(timeString);
      onChange(formattedTime);
    } else {
      onChange('');
    }
  };

  const currentError = error || !!fieldError;
  const currentHelperText = fieldError?.message || helperText;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <TimePicker
        label={label}
        value={dateValue}
        onChange={handleChange}
        disabled={disabled}
        ampm={false} // Use 24-hour format for consistency
        views={['hours', 'minutes']}
        timeSteps={{ hours: 1, minutes: 5 }} // 5-minute steps
        renderInput={(params) => (
          <TextField
            {...params}
            required={required}
            error={currentError}
            helperText={currentHelperText}
            fullWidth={fullWidth}
            sx={sx}
            onBlur={onBlur}
          />
        )}
      />
    </LocalizationProvider>
  );
};

/**
 * Simplified wrapper that provides LocalizationProvider context
 * Use this if you don't have LocalizationProvider in your app root
 */
export const MaterialTimeInputWithProvider: React.FC<MaterialTimeInputProps> = (props) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <MaterialTimeInput {...props} />
    </LocalizationProvider>
  );
};