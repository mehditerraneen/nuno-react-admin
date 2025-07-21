import React from 'react';
import { TimeInput as ReactAdminTimeInput, TimeInputProps as ReactAdminTimeInputProps } from 'react-admin';
import { formatTimeString } from '../utils/timeUtils';

/**
 * Enhanced TimeInput using React Admin's native TimeInput
 * Automatically formats time to HH:MM for API compatibility
 */
interface EnhancedTimeInputProps extends Omit<ReactAdminTimeInputProps, 'transform'> {
  source: string;
  label?: string;
  required?: boolean;
  helperText?: string;
  error?: boolean;
}

export const EnhancedTimeInput: React.FC<EnhancedTimeInputProps> = ({
  source,
  label,
  required = false,
  helperText,
  error,
  ...props
}) => {
  // Transform function to ensure HH:MM format for API
  const handleTransform = (value: any) => {
    if (!value) return '';
    
    console.log("🔄 Transform input:", value, typeof value);
    
    // Handle Date objects (React Admin's default)
    if (value instanceof Date) {
      const hours = value.getHours().toString().padStart(2, '0');
      const minutes = value.getMinutes().toString().padStart(2, '0');
      const result = `${hours}:${minutes}`;
      console.log("📅 Date to time:", value, "→", result);
      return result;
    }
    
    // Handle ISO datetime strings like "2025-06-17T07:00:13.585Z"
    if (typeof value === 'string' && value.includes('T')) {
      const date = new Date(value);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const result = `${hours}:${minutes}`;
      console.log("🕐 ISO string to time:", value, "→", result);
      return result;
    }
    
    // Handle simple time strings
    if (typeof value === 'string') {
      const result = formatTimeString(value);
      console.log("⏰ String to time:", value, "→", result);
      return result;
    }
    
    console.log("❓ Unknown time format:", value);
    return value;
  };

  return (
    <ReactAdminTimeInput
      {...props}
      source={source}
      label={label}
      required={required}
      helperText={helperText || "Select time"}
      error={error}
      transform={handleTransform}
    />
  );
};

/**
 * Simple wrapper for React Admin's TimeInput with just formatting
 */
export const SimpleReactAdminTimeInput: React.FC<EnhancedTimeInputProps> = (props) => {
  return (
    <ReactAdminTimeInput
      {...props}
      transform={(value) => {
        if (value instanceof Date) {
          return `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}`;
        }
        return formatTimeString(value);
      }}
    />
  );
};