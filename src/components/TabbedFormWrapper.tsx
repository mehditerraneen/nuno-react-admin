import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  Paper
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  LocalHospital as CareIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface TabbedFormWrapperProps {
  mode: 'create' | 'edit';
  children: {
    basicInfo: React.ReactNode;
    schedule: React.ReactNode;
    careItems: React.ReactNode;
  };
}

export const TabbedFormWrapper: React.FC<TabbedFormWrapperProps> = ({ 
  mode, 
  children 
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const tabsData = [
    { 
      label: 'Basic Info', 
      icon: <InfoIcon />, 
      color: 'primary' as const,
      description: 'Care plan details and instructions'
    },
    { 
      label: 'Schedule', 
      icon: <ScheduleIcon />, 
      color: 'secondary' as const,
      description: 'Timing and occurrence patterns'
    },
    { 
      label: 'Care Items', 
      icon: <CareIcon />, 
      color: 'success' as const,
      description: 'Long-term care items and quantities'
    }
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with Progress Steps */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, backgroundColor: '#f8f9fa' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CareIcon color="primary" />
          {mode === 'create' ? 'Add New Care Plan Detail' : 'Edit Care Plan Detail'}
        </Typography>
        
        <Stepper activeStep={activeTab} sx={{ mt: 1 }}>
          {tabsData.map((tab, index) => (
            <Step key={index}>
              <StepLabel 
                icon={React.cloneElement(tab.icon, { 
                  color: activeTab >= index ? tab.color : 'disabled' 
                })}
              >
                <Typography variant="caption">{tab.label}</Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Tab Navigation */}
      <Card elevation={2}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 72,
              textTransform: 'none'
            }
          }}
        >
          {tabsData.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {React.cloneElement(tab.icon, { 
                      color: activeTab === index ? tab.color : 'action' 
                    })}
                    <Typography variant="subtitle2">{tab.label}</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {tab.description}
                  </Typography>
                </Box>
              }
            />
          ))}
        </Tabs>

        <CardContent sx={{ p: 3, minHeight: 400 }}>
          {/* Tab Content */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <InfoIcon color="primary" />
                Basic Information
              </Typography>
              {children.basicInfo}
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <ScheduleIcon color="secondary" />
                Schedule Configuration
              </Typography>
              {children.schedule}
            </Box>
          )}

          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <CareIcon color="success" />
                Care Items & Quantities
              </Typography>
              {children.careItems}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};