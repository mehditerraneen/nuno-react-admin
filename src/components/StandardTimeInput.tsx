import React from 'react';
import { TextInput, TextInputProps } from 'react-admin';
import { formatTimeString } from '../utils/timeUtils';

/**
 * Time input component using HTML5 native time input
 * Provides the best cross-browser support and automatic formatting
 */
export const StandardTimeInput: React.FC<TextInputProps> = (props) => {
  const handleTransform = (value: string) => {
    // HTML5 time input already provides HH:MM format
    // But we'll ensure consistency with our formatting
    return formatTimeString(value);
  };

  return (
    <TextInput
      {...props}
      type="time"
      transform={handleTransform}
      inputProps={{
        step: 300, // 5-minute intervals
        ...props.inputProps
      }}
      helperText={props.helperText || "Select time in HH:MM format"}
    />
  );
};

/**
 * Alternative using React Admin's built-in TimeInput (if available)
 */
export const ReactAdminTimeInput: React.FC<TextInputProps> = (props) => {
  // Note: React Admin's TimeInput might need different import
  // Check React Admin documentation for latest version
  const handleTransform = (value: string) => {
    return formatTimeString(value);
  };

  return (
    <TextInput
      {...props}
      type="time"
      transform={handleTransform}
    />
  );
};