import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  LocalHospital as CareIcon,
  CalendarToday as CalendarIcon,
  ViewWeek as WeekIcon,
  Add as AddIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { TextInput, ArrayInput, SimpleFormIterator } from "react-admin";
import { SmartTimeInput } from "./SmartTimeInput";
import { SmartOccurrenceInput } from "./SmartOccurrenceInput";
import { LiveDurationCalculator } from "./LiveDurationCalculator";

interface ImprovedCareFormLayoutProps {
  mode: "create" | "edit";
}

export const ImprovedCareFormLayout: React.FC<ImprovedCareFormLayoutProps> = ({
  mode,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | false>(
    "basic",
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAccordionChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedSection(isExpanded ? panel : false);
    };

  return (
    <Box sx={{ width: "100%", maxWidth: "1200px", mx: "auto" }}>
      {/* Header with Progress Steps */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, backgroundColor: "#f8f9fa" }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <CareIcon color="primary" />
          {mode === "create"
            ? "Create Care Plan Detail"
            : "Edit Care Plan Detail"}
        </Typography>

        <Stepper activeStep={activeTab} sx={{ mt: 2 }}>
          <Step>
            <StepLabel icon={<InfoIcon />}>Basic Info</StepLabel>
          </Step>
          <Step>
            <StepLabel icon={<CalendarIcon />}>Schedule</StepLabel>
          </Step>
          <Step>
            <StepLabel icon={<CareIcon />}>Care Items</StepLabel>
          </Step>
        </Stepper>
      </Paper>

      {/* Tab Navigation */}
      <Card elevation={2}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            label="Basic Information"
            icon={<InfoIcon />}
            iconPosition="start"
          />
          <Tab
            label="Schedule & Timing"
            icon={<ScheduleIcon />}
            iconPosition="start"
          />
          <Tab
            label="Care Items & Actions"
            icon={<AssignmentIcon />}
            iconPosition="start"
          />
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* Tab 1: Basic Information */}
          {activeTab === 0 && (
            <Box>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <InfoIcon color="primary" />
                Basic Care Plan Information
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextInput
                    source="name"
                    label="Care Plan Detail Name"
                    fullWidth
                    required
                    helperText="Enter a descriptive name for this care plan detail"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextInput
                    source="care_actions"
                    label="Care Actions & Instructions"
                    multiline
                    fullWidth
                    rows={4}
                    required
                    helperText="Describe the specific care actions to be performed"
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Tab 2: Schedule & Timing */}
          {activeTab === 1 && (
            <Box>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <ScheduleIcon color="primary" />
                Schedule Configuration
              </Typography>

              {/* Horizontal Occurrences Display */}
              <Paper
                variant="outlined"
                sx={{ p: 3, mb: 3, backgroundColor: "#f8f9fa" }}
              >
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <WeekIcon color="secondary" />
                  Weekly Occurrence Pattern
                </Typography>
                <SmartOccurrenceInput
                  source="params_occurrence_ids"
                  label=""
                  required
                />
              </Paper>

              {/* Time Configuration */}
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <ScheduleIcon color="secondary" />
                  Session Timing
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <SmartTimeInput
                      source="time_start"
                      label="Start Time"
                      required
                      helperText="When does this care session begin?"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <SmartTimeInput
                      source="time_end"
                      label="End Time"
                      required
                      autoSuggest={true}
                      dependsOnCareItems={true}
                      helperText="End time (auto-suggested based on care items)"
                    />
                  </Grid>
                </Grid>

                {/* Live Duration Calculator */}
                <Box sx={{ mt: 3 }}>
                  <LiveDurationCalculator />
                </Box>
              </Paper>
            </Box>
          )}

          {/* Tab 3: Care Items */}
          {activeTab === 2 && (
            <Box>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <AssignmentIcon color="primary" />
                Care Items & Quantities
              </Typography>

              {/* Accordion Layout for Care Items */}
              <Accordion
                expanded={expandedSection === "care-items"}
                onChange={handleAccordionChange("care-items")}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      width: "100%",
                    }}
                  >
                    <CareIcon color="primary" />
                    <Typography variant="subtitle1">
                      Long Term Care Items Configuration
                    </Typography>
                    <Chip
                      label="Expand to configure care items"
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  </Box>
                </AccordionSummary>

                <AccordionDetails>
                  <Box sx={{ width: "100%" }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      Add and configure the long-term care items needed for this
                      care plan detail. Each item shows its daily duration
                      requirement.
                    </Typography>

                    <ArrayInput source="long_term_care_items" label="">
                      <SimpleFormIterator
                        inline
                        addButton={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              p: 2,
                            }}
                          >
                            <AddIcon />
                            <Typography>Add Care Item</Typography>
                          </Box>
                        }
                      >
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={8}>
                            {/* Care Item Selection with enhanced display */}
                            {/* This would be the existing ReferenceInput with SelectInput */}
                          </Grid>
                          <Grid item xs={12} md={4}>
                            {/* Quantity Input */}
                            {/* This would be the existing NumberInput */}
                          </Grid>
                        </Grid>
                      </SimpleFormIterator>
                    </ArrayInput>

                    <Divider sx={{ my: 3 }} />

                    {/* Duration Summary */}
                    <Paper
                      variant="outlined"
                      sx={{ p: 2, backgroundColor: "#e3f2fd" }}
                    >
                      <Typography variant="subtitle2" gutterBottom>
                        📊 Duration Summary
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        The total duration calculations will appear here as you
                        add care items.
                      </Typography>
                    </Paper>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Quick Tips */}
              <Paper
                variant="outlined"
                sx={{ p: 2, backgroundColor: "#fff3e0" }}
              >
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <InfoIcon color="warning" />
                  Tips for Care Item Configuration
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>Daily duration is calculated from weekly package ÷ 7</li>
                  <li>
                    End time will auto-suggest based on care item durations
                  </li>
                  <li>Quantity defaults to 1 for new items</li>
                  <li>Use CNS filtering when available</li>
                </Box>
              </Paper>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

// Usage example component showing the layout options
export const CareFormLayoutOptions: React.FC = () => {
  const [layoutType, setLayoutType] = useState<"tabs" | "accordion" | "wizard">(
    "tabs",
  );

  const layouts = [
    {
      type: "tabs" as const,
      title: "Tabbed Layout",
      description: "Clean separation with horizontal navigation",
      pros: [
        "Clear section separation",
        "Easy navigation",
        "Familiar UX pattern",
      ],
      cons: ["Requires clicks to switch", "All data not visible at once"],
    },
    {
      type: "accordion" as const,
      title: "Accordion Layout",
      description: "Expandable sections with vertical flow",
      pros: [
        "All sections visible",
        "Progressive disclosure",
        "Space efficient",
      ],
      cons: ["Can feel cramped", "Scrolling required"],
    },
    {
      type: "wizard" as const,
      title: "Wizard Steps",
      description: "Guided step-by-step process",
      pros: ["Guided experience", "Progress tracking", "Less overwhelming"],
      cons: ["Linear flow", "More clicks required", "No overview"],
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🎨 Care Form Layout Design Options
      </Typography>

      <Grid container spacing={3}>
        {layouts.map((layout) => (
          <Grid item xs={12} md={4} key={layout.type}>
            <Card
              variant={layoutType === layout.type ? "elevation" : "outlined"}
              elevation={layoutType === layout.type ? 4 : 1}
              sx={{
                cursor: "pointer",
                transition: "all 0.3s ease",
                border:
                  layoutType === layout.type ? "2px solid #1976d2" : undefined,
              }}
              onClick={() => setLayoutType(layout.type)}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {layout.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {layout.description}
                </Typography>

                <Typography
                  variant="subtitle2"
                  color="success.main"
                  gutterBottom
                >
                  ✅ Pros:
                </Typography>
                <Box component="ul" sx={{ fontSize: "0.875rem", pl: 2, mb: 2 }}>
                  {layout.pros.map((pro, index) => (
                    <li key={index}>{pro}</li>
                  ))}
                </Box>

                <Typography
                  variant="subtitle2"
                  color="warning.main"
                  gutterBottom
                >
                  ⚠️ Considerations:
                </Typography>
                <Box component="ul" sx={{ fontSize: "0.875rem", pl: 2 }}>
                  {layout.cons.map((con, index) => (
                    <li key={index}>{con}</li>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {layoutType && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Preview: {layouts.find((l) => l.type === layoutType)?.title}
          </Typography>
          <ImprovedCareFormLayout mode="create" />
        </Box>
      )}
    </Box>
  );
};
