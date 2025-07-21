import React from "react";
import { Alert, Box, Typography } from "@mui/material";

interface ValidationErrorDisplayProps {
  errors: Record<string, string>;
}

export const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({
  errors,
}) => {
  const errorEntries = Object.entries(errors).filter(
    ([key]) => key !== "_global",
  );
  const globalError = errors._global;

  if (errorEntries.length === 0 && !globalError) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      {globalError && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {globalError}
        </Alert>
      )}

      {errorEntries.length > 0 && (
        <Alert severity="error">
          <Typography variant="subtitle2" gutterBottom>
            Please fix the following errors:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            {errorEntries.map(([field, message]) => (
              <li key={field}>
                <strong>{field}:</strong> {message}
              </li>
            ))}
          </ul>
        </Alert>
      )}
    </Box>
  );
};
