import React, { useState, useMemo } from "react";
import {
  Box,
  Button,
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
  Divider,
  Tooltip,
  IconButton,
  Popover,
  TextField as MuiTextField,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  LocalHospital as CareIcon,
  CalendarToday as CalendarIcon,
  Info as InfoIcon,
  Add as AddIcon,
  AccessTime as AccessTimeIcon,
  Error as ErrorIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import AddLongTermCareItemButton from "./AddLongTermCareItemButton";
import {
  TextInput,
  ArrayInput,
  SimpleFormIterator,
  ReferenceInput,
  SelectInput,
  NumberInput,
  useDataProvider,
  useNotify,
  useRefresh,
} from "react-admin";
import { useWatch } from "react-hook-form";
import { SmartTimeInput } from "./SmartTimeInput";
import { SmartOccurrenceInput } from "./SmartOccurrenceInput";
import { LiveDurationCalculator } from "./LiveDurationCalculator";
import { formatDurationDisplay } from "../utils/timeUtils";
import { LongTermCareItem } from "../dataProvider";

const EditWeeklyPackageButton = ({ itemId, currentValue }: { itemId: number; currentValue: number | null }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [value, setValue] = useState(currentValue ?? "");
  const [saving, setSaving] = useState(false);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();

  const handleSave = async () => {
    setSaving(true);
    try {
      await dataProvider.update("longtermcareitems", {
        id: itemId,
        data: { id: itemId, weekly_package: Number(value) || 0 },
        previousData: { id: itemId },
      });
      notify("Duration updated", { type: "success" });
      setAnchorEl(null);
      refresh();
    } catch (error) {
      notify("Failed to update duration", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); setValue(currentValue ?? ""); }}
        title="Edit weekly duration"
        sx={{ ml: 0.5, p: 0.25 }}
      >
        <EditIcon sx={{ fontSize: 14 }} />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1, minWidth: 200 }}>
          <Typography variant="subtitle2">Weekly package (min)</Typography>
          <MuiTextField
            size="small"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </Box>
      </Popover>
    </>
  );
};

const useSelectedCareItemIds = (): number[] => {
  const items = useWatch({ name: "long_term_care_items" }) || [];
  return items
    .map((item: any) => item?.long_term_care_item_id)
    .filter((id: any) => id != null);
};

const validateNoDuplicate = (value: any, allValues: any, props: any) => {
  if (!value || !allValues?.long_term_care_items) return undefined;
  const occurrences = allValues.long_term_care_items.filter(
    (item: any) => item?.long_term_care_item_id === value,
  );
  return occurrences.length > 1 ? "This care code is already selected" : undefined;
};

interface TabbedCareFormLayoutProps {
  mode: "create" | "edit";
  cnsItemIds: number[];
  validationErrors: Record<string, string>;
}

export const TabbedCareFormLayout: React.FC<TabbedCareFormLayoutProps> = ({
  mode,
  cnsItemIds,
  validationErrors,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(
    "care-items",
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAccordionChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedAccordion(isExpanded ? panel : false);
    };

  // Check which tabs have validation errors
  const getTabErrors = (tabIndex: number) => {
    const errorFields = Object.keys(validationErrors);
    switch (tabIndex) {
      case 0: // Basic Info
        return errorFields.filter((field) =>
          ["name", "care_actions"].includes(field),
        );
      case 1: // Schedule
        return errorFields.filter((field) =>
          ["time_start", "time_end", "params_occurrence_ids"].includes(field),
        );
      case 2: // Care Items
        return errorFields.filter((field) =>
          field.includes("long_term_care_item"),
        );
      default:
        return [];
    }
  };

  // Memoize the filter based on cnsItemIds to ensure it updates when cnsItemIds change
  const careItemFilter = useMemo(() => {
    // Only show items that are available in the CNS care plan
    // If no CNS items or empty array, show no items
    if (
      !cnsItemIds ||
      cnsItemIds.length === 0 ||
      (cnsItemIds.length === 1 && cnsItemIds[0] === -1)
    ) {
      console.log("🚫 No CNS items available, hiding all items");
      return { id: [-1] }; // No items should match
    }

    console.log("✅ Filtering longtermcareitems by CNS item IDs:", cnsItemIds);
    return { id: cnsItemIds };
  }, [cnsItemIds]);

  const tabsData = [
    {
      label: "Basic Info",
      icon: <InfoIcon />,
      color: "primary" as const,
      description: "Care plan details and instructions",
      hasErrors: getTabErrors(0).length > 0,
    },
    {
      label: "Schedule",
      icon: <ScheduleIcon />,
      color: "secondary" as const,
      description: "Timing and occurrence patterns",
      hasErrors: getTabErrors(1).length > 0,
    },
    {
      label: "Care Items",
      icon: <CareIcon />,
      color: "success" as const,
      description: "Long-term care items and quantities",
      hasErrors: getTabErrors(2).length > 0,
    },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header with Progress Steps */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, backgroundColor: "#f8f9fa" }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <CareIcon color="primary" />
          {mode === "create"
            ? "Add New Care Plan Detail"
            : "Edit Care Plan Detail"}
        </Typography>

        <Stepper activeStep={activeTab} sx={{ mt: 1 }}>
          {tabsData.map((tab, index) => (
            <Step key={index}>
              <StepLabel
                icon={React.cloneElement(tab.icon, {
                  color: tab.hasErrors
                    ? "error"
                    : activeTab >= index
                      ? tab.color
                      : "disabled",
                })}
                error={tab.hasErrors}
              >
                <Typography
                  variant="caption"
                  color={tab.hasErrors ? "error" : "inherit"}
                >
                  {tab.label}
                  {tab.hasErrors && " ⚠️"}
                </Typography>
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
            borderColor: "divider",
            "& .MuiTab-root": {
              minHeight: 72,
              textTransform: "none",
            },
          }}
        >
          {tabsData.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {React.cloneElement(tab.icon, {
                      color: tab.hasErrors
                        ? "error"
                        : activeTab === index
                          ? tab.color
                          : "action",
                    })}
                    <Typography
                      variant="subtitle2"
                      color={tab.hasErrors ? "error" : "inherit"}
                    >
                      {tab.label}
                    </Typography>
                    {tab.hasErrors && (
                      <ErrorIcon color="error" fontSize="small" />
                    )}
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
          {/* Tab 1: Basic Information */}
          {activeTab === 0 && (
            <Box>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}
              >
                <InfoIcon color="primary" />
                Basic Information
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextInput
                    source="name"
                    label="Care Plan Detail Name"
                    fullWidth
                    required
                    helperText={
                      validationErrors.name ||
                      "Enter a descriptive name for this care plan detail"
                    }
                    error={!!validationErrors.name}
                    sx={{ mb: 2 }}
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
                    helperText={
                      validationErrors.care_actions ||
                      "Describe the specific care actions to be performed during this session"
                    }
                    error={!!validationErrors.care_actions}
                  />
                </Grid>
              </Grid>

              {/* Next Step Hint */}
              <Paper
                variant="outlined"
                sx={{ p: 2, mt: 3, backgroundColor: "#e3f2fd" }}
              >
                <Typography
                  variant="body2"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <ScheduleIcon color="primary" />
                  Next: Configure the schedule and timing for this care plan
                  detail
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Tab 2: Schedule & Timing */}
          {activeTab === 1 && (
            <Box>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}
              >
                <ScheduleIcon color="secondary" />
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
                  <CalendarIcon color="secondary" />
                  Weekly Occurrence Pattern
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Select which days of the week this care should be provided
                </Typography>
                <SmartOccurrenceInput
                  source="params_occurrence_ids"
                  label=""
                  required
                />
              </Paper>

              {/* Time Configuration */}
              <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    animation: "pulse 2s infinite",
                    "@keyframes pulse": {
                      "0%": { opacity: 1 },
                      "50%": { opacity: 0.7 },
                      "100%": { opacity: 1 },
                    },
                  }}
                >
                  <AccessTimeIcon color="primary" fontSize="small" />
                  Time Schedule
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <SmartTimeInput
                      source="time_start"
                      label="Start Time"
                      required
                      helperText={
                        validationErrors.time_start ||
                        "When does this care session begin?"
                      }
                      error={!!validationErrors.time_start}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <SmartTimeInput
                      source="time_end"
                      label="End Time"
                      required
                      autoSuggest={true}
                      dependsOnCareItems={true}
                      helperText={
                        validationErrors.time_end ||
                        "End time (auto-suggested based on care items)"
                      }
                      error={!!validationErrors.time_end}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Live Duration Calculator */}
              <LiveDurationCalculator />

              {/* Next Step Hint */}
              <Paper
                variant="outlined"
                sx={{ p: 2, mt: 3, backgroundColor: "#e8f5e8" }}
              >
                <Typography
                  variant="body2"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <CareIcon color="success" />
                  Next: Add the specific care items and quantities needed
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Tab 3: Care Items */}
          {activeTab === 2 && (
            <Box>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}
              >
                <CareIcon color="success" />
                Care Items & Quantities
              </Typography>

              {/* Accordion Layout for Care Items */}
              <Accordion
                expanded={expandedAccordion === "care-items"}
                onChange={handleAccordionChange("care-items")}
                sx={{ mb: 2 }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    backgroundColor: "#f5f5f5",
                    "&:hover": { backgroundColor: "#eeeeee" },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      width: "100%",
                    }}
                  >
                    <CareIcon color="success" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">
                        Long Term Care Items Configuration
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Configure care items with daily duration calculations
                      </Typography>
                    </Box>
                    <Chip
                      label={
                        expandedAccordion === "care-items"
                          ? "Collapse"
                          : "Expand to configure"
                      }
                      size="small"
                      variant="outlined"
                      color="success"
                    />
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ pt: 2 }}>
                  <Box sx={{ width: "100%" }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        mb: 3,
                        backgroundColor: "#f8f9fa",
                        border: "1px solid #e0e0e0",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                        position: "relative",
                        "&::after": {
                          content: '"⚠️ Important"',
                          position: "absolute",
                          top: "-12px",
                          right: "10px",
                          backgroundColor: "#ffeb3b",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          color: "#424242",
                        },
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        💡 <strong>Tips:</strong> Each care item shows its daily
                        duration (weekly package ÷ 7). The end time will
                        auto-suggest based on total daily duration. Quantity
                        defaults to 1.
                      </Typography>
                    </Paper>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Long Term Care Items
                      </Typography>
                    </Box>

                    <ArrayInput source="long_term_care_items" label="">
                      <SimpleFormIterator
                        inline
                        disableReordering={false}
                        addButton={<AddLongTermCareItemButton />}
                      >
                        <Grid
                          container
                          spacing={2}
                          alignItems="center"
                          sx={{ mb: 2 }}
                        >
                          <Grid item xs={12} md={7}>
                            <ReferenceInput
                              source="long_term_care_item_id"
                              reference="longtermcareitems"
                              label="Care Item"
                              filter={careItemFilter}
                              required
                            >
                              <SelectInput
                                validate={validateNoDuplicate}
                                optionText={(choice: LongTermCareItem) => {
                                  const wp = choice.weekly_package || 0;
                                  const weeklyText =
                                    wp > 0
                                      ? ` (${formatDurationDisplay(wp)}/wk)`
                                      : "";

                                  return (
                                    <Tooltip
                                      title={`${choice.description || "No description"}${wp ? ` • ${formatDurationDisplay(wp)}/week` : " • No duration set — click pencil to add"}`}
                                      placement="right"
                                      arrow
                                    >
                                      <Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
                                        {choice.code}
                                        {weeklyText || " —"}
                                        <EditWeeklyPackageButton
                                          itemId={choice.id}
                                          currentValue={choice.weekly_package ?? null}
                                        />
                                      </Box>
                                    </Tooltip>
                                  );
                                }}
                              />
                            </ReferenceInput>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <NumberInput
                              source="quantity"
                              label="Quantity"
                              required
                              defaultValue={1}
                              min={0.01}
                              step={0.01}
                              helperText="Default: 1"
                              sx={{ maxWidth: 120 }}
                            />
                          </Grid>
                        </Grid>
                      </SimpleFormIterator>
                    </ArrayInput>

                    {/* Duration Summary would be calculated automatically by LiveDurationCalculator */}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Tips Panel */}
              <Paper
                variant="outlined"
                sx={{ p: 2, backgroundColor: "#f3e5f5" }}
              >
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <InfoIcon color="secondary" />
                  Care Item Configuration Guidelines
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box
                      component="ul"
                      sx={{ fontSize: "0.875rem", pl: 2, m: 0 }}
                    >
                      <li>Daily duration = weekly package ÷ 7 days</li>
                      <li>
                        End time auto-suggests based on start time + total daily
                        duration
                      </li>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box
                      component="ul"
                      sx={{ fontSize: "0.875rem", pl: 2, m: 0 }}
                    >
                      <li>Quantity defaults to 1 for new items</li>
                      <li>CNS filtering applies when care plan is linked</li>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
