import React, { useState } from 'react';
import { 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Typography, 
  Box, 
  Chip,
  Button,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useFormState } from 'react-hook-form';

interface FormDebuggerProps {
  formData?: any;
  validationErrors?: Record<string, string>;
  apiError?: any;
  isVisible?: boolean;
}

export const FormDebugger: React.FC<FormDebuggerProps> = ({ 
  formData, 
  validationErrors = {}, 
  apiError,
  isVisible = process.env.NODE_ENV === 'development'
}) => {
  const [expanded, setExpanded] = useState(false);
  const { errors: formErrors, isValid, isDirty } = useFormState();

  if (!isVisible) return null;

  const handleCopyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <BugReportIcon color="primary" />
            <Typography variant="subtitle2">Form Debugger</Typography>
            {Object.keys(validationErrors).length > 0 && (
              <Chip label={`${Object.keys(validationErrors).length} errors`} color="error" size="small" />
            )}
            {!isValid && (
              <Chip label="Form Invalid" color="warning" size="small" />
            )}
            {isDirty && (
              <Chip label="Modified" color="info" size="small" />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box display="flex" flexDirection="column" gap={2}>
            
            {/* Form State */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Form State:</Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Chip label={`Valid: ${isValid}`} color={isValid ? "success" : "error"} size="small" />
                <Chip label={`Dirty: ${isDirty}`} color={isDirty ? "warning" : "default"} size="small" />
              </Box>
            </Box>

            {/* Current Form Data */}
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">Current Form Data:</Typography>
                <Button 
                  size="small" 
                  onClick={() => handleCopyToClipboard(formData)}
                  disabled={!formData}
                >
                  Copy
                </Button>
              </Box>
              <Box 
                component="pre" 
                sx={{ 
                  backgroundColor: '#f5f5f5', 
                  p: 1, 
                  borderRadius: 1, 
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  maxHeight: '150px'
                }}
              >
                {JSON.stringify(formData, null, 2)}
              </Box>
            </Box>

            {/* React Hook Form Errors */}
            {Object.keys(formErrors).length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="error">React Hook Form Errors:</Typography>
                <Box 
                  component="pre" 
                  sx={{ 
                    backgroundColor: '#ffebee', 
                    p: 1, 
                    borderRadius: 1, 
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: '100px'
                  }}
                >
                  {JSON.stringify(formErrors, null, 2)}
                </Box>
              </Box>
            )}

            {/* API Validation Errors */}
            {Object.keys(validationErrors).length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="error">API Validation Errors:</Typography>
                <Box 
                  component="pre" 
                  sx={{ 
                    backgroundColor: '#ffebee', 
                    p: 1, 
                    borderRadius: 1, 
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: '100px'
                  }}
                >
                  {JSON.stringify(validationErrors, null, 2)}
                </Box>
              </Box>
            )}

            {/* Raw API Error */}
            {apiError && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" color="error">Raw API Error:</Typography>
                  <Button 
                    size="small" 
                    onClick={() => handleCopyToClipboard(apiError)}
                    color="error"
                  >
                    Copy Error
                  </Button>
                </Box>
                <Box 
                  component="pre" 
                  sx={{ 
                    backgroundColor: '#ffebee', 
                    p: 1, 
                    borderRadius: 1, 
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: '200px'
                  }}
                >
                  {JSON.stringify(apiError, null, 2)}
                </Box>
              </Box>
            )}

            {/* Quick Tips */}
            <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
              <Typography variant="caption">
                <strong>Debug Tips:</strong>
                <br />• Check console for detailed logs
                <br />• Verify field names match backend API
                <br />• Ensure required fields have values
                <br />• Check network tab for request/response details
              </Typography>
            </Alert>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};