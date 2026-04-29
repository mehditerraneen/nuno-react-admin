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
  useSimpleFormIterator,
  useTranslate,
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

const AddActionButton: React.FC = () => {
  const { add } = useSimpleFormIterator();
  const translate = useTranslate();
  return (
    <Button
      size="small"
      variant="contained"
      color="warning"
      startIcon={<AddIcon />}
      sx={{ mt: 1 }}
      onClick={() => add({ action_text: "", duration_minutes: 0 })}
    >
      {translate("care_plan_detail.actions.add")}
    </Button>
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
  cnsCustomDescriptions?: Record<string, string>;
  validationErrors: Record<string, string>;
}

export const TabbedCareFormLayout: React.FC<TabbedCareFormLayoutProps> = ({
  mode,
  cnsItemIds,
  cnsCustomDescriptions = {},
  validationErrors,
}) => {
  const translate = useTranslate();
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
      case 3: // Actions
        return errorFields.filter((field) => field.startsWith("actions"));
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
      label: translate("care_plan_detail.tabs.basic_info"),
      icon: <InfoIcon />,
      color: "primary" as const,
      description: translate("care_plan_detail.tabs.basic_info_desc"),
      hasErrors: getTabErrors(0).length > 0,
    },
    {
      label: translate("care_plan_detail.tabs.schedule"),
      icon: <ScheduleIcon />,
      color: "secondary" as const,
      description: translate("care_plan_detail.tabs.schedule_desc"),
      hasErrors: getTabErrors(1).length > 0,
    },
    {
      label: translate("care_plan_detail.tabs.care_items"),
      icon: <CareIcon />,
      color: "success" as const,
      description: translate("care_plan_detail.tabs.care_items_desc"),
      hasErrors: getTabErrors(2).length > 0,
    },
    {
      label: translate("care_plan_detail.tabs.actions"),
      icon: <AssignmentIcon />,
      color: "warning" as const,
      description: translate("care_plan_detail.tabs.actions_desc"),
      hasErrors: getTabErrors(3).length > 0,
    },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header with Progress Steps */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, backgroundColor: "action.hover" }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <CareIcon color="primary" />
          {mode === "create"
            ? translate("care_plan_detail.title_create")
            : translate("care_plan_detail.title_edit")}
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
                {translate("care_plan_detail.basic_info.section")}
              </Typography>

              <Grid container spacing={3}>
                <Grid size={12}>
                  <TextInput
                    source="name"
                    label={translate("care_plan_detail.basic_info.name")}
                    fullWidth
                    required
                    helperText={
                      validationErrors.name ||
                      translate("care_plan_detail.basic_info.name_helper")
                    }
                    error={!!validationErrors.name}
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid size={12}>
                  <TextInput
                    source="care_actions"
                    label={translate(
                      "care_plan_detail.basic_info.care_actions",
                    )}
                    multiline
                    fullWidth
                    rows={4}
                    required
                    helperText={
                      validationErrors.care_actions ||
                      translate(
                        "care_plan_detail.basic_info.care_actions_helper",
                      )
                    }
                    error={!!validationErrors.care_actions}
                  />
                </Grid>
              </Grid>

              {/* Next Step Hint */}
              <Paper
                variant="outlined"
                sx={{ p: 2, mt: 3, backgroundColor: "info.light" }}
              >
                <Typography
                  variant="body2"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <ScheduleIcon color="primary" />
                  {translate("care_plan_detail.basic_info.next_hint")}
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
                {translate("care_plan_detail.schedule.section")}
              </Typography>

              {/* Horizontal Occurrences Display */}
              <Paper
                variant="outlined"
                sx={{ p: 3, mb: 3, backgroundColor: "action.hover" }}
              >
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <CalendarIcon color="secondary" />
                  {translate("care_plan_detail.schedule.weekly_pattern")}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {translate(
                    "care_plan_detail.schedule.weekly_pattern_helper",
                  )}
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
                  {translate("care_plan_detail.schedule.time_schedule")}
                </Typography>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <SmartTimeInput
                      source="time_start"
                      label={translate("care_plan_detail.schedule.time_start")}
                      required
                      helperText={
                        validationErrors.time_start ||
                        translate(
                          "care_plan_detail.schedule.time_start_helper",
                        )
                      }
                      error={!!validationErrors.time_start}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <SmartTimeInput
                      source="time_end"
                      label={translate("care_plan_detail.schedule.time_end")}
                      required
                      autoSuggest={true}
                      dependsOnCareItems={true}
                      helperText={
                        validationErrors.time_end ||
                        translate("care_plan_detail.schedule.time_end_helper")
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
                sx={{ p: 2, mt: 3, backgroundColor: "success.light" }}
              >
                <Typography
                  variant="body2"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <CareIcon color="success" />
                  {translate("care_plan_detail.schedule.next_hint")}
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
                {translate("care_plan_detail.care_items.section")}
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
                    backgroundColor: "action.hover",
                    "&:hover": { backgroundColor: "action.selected" },
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
                        {translate(
                          "care_plan_detail.care_items.long_term_config",
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {translate(
                          "care_plan_detail.care_items.long_term_config_desc",
                        )}
                      </Typography>
                    </Box>
                    <Chip
                      label={
                        expandedAccordion === "care-items"
                          ? translate("care_plan_detail.care_items.collapse")
                          : translate("care_plan_detail.care_items.expand")
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
                        backgroundColor: "action.hover",
                        border: "1px solid #e0e0e0",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                        position: "relative",
                        "&::after": {
                          content: `"⚠️ ${translate("care_plan_detail.care_items.important")}"`,
                          position: "absolute",
                          top: "-12px",
                          right: "10px",
                          backgroundColor: "warning.light",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          color: "#424242",
                        },
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        💡 {translate("care_plan_detail.care_items.tip")}
                      </Typography>
                    </Paper>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {translate(
                          "care_plan_detail.care_items.long_term_items",
                        )}
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
                          <Grid size={{ xs: 12, md: 7 }}>
                            <ReferenceInput
                              source="long_term_care_item_id"
                              reference="longtermcareitems"
                              label={translate(
                                "care_plan_detail.care_items.care_item",
                              )}
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

                                  const customDesc = cnsCustomDescriptions[choice.code];
                                  const tooltipParts: string[] = [];
                                  if (customDesc) tooltipParts.push(customDesc);
                                  if (choice.description && choice.description !== customDesc) {
                                    tooltipParts.push(choice.description);
                                  }
                                  if (!tooltipParts.length) tooltipParts.push("No description");
                                  if (wp) {
                                    tooltipParts.push(`${formatDurationDisplay(wp)}/week`);
                                  } else {
                                    tooltipParts.push("No duration set — click pencil to add");
                                  }

                                  return (
                                    <Tooltip
                                      title={tooltipParts.join(" • ")}
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
                          <Grid size={{ xs: 12, md: 3 }}>
                            <NumberInput
                              source="quantity"
                              label={translate(
                                "care_plan_detail.care_items.quantity",
                              )}
                              required
                              defaultValue={1}
                              min={0.01}
                              step={0.01}
                              helperText={translate(
                                "care_plan_detail.care_items.quantity_default",
                              )}
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
                sx={{ p: 2, backgroundColor: "secondary.light" }}
              >
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <InfoIcon color="secondary" />
                  {translate("care_plan_detail.care_items.guidelines")}
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box
                      component="ul"
                      sx={{ fontSize: "0.875rem", pl: 2, m: 0 }}
                    >
                      <li>
                        {translate(
                          "care_plan_detail.care_items.guideline_daily",
                        )}
                      </li>
                      <li>
                        {translate(
                          "care_plan_detail.care_items.guideline_endtime",
                        )}
                      </li>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box
                      component="ul"
                      sx={{ fontSize: "0.875rem", pl: 2, m: 0 }}
                    >
                      <li>
                        {translate(
                          "care_plan_detail.care_items.guideline_quantity",
                        )}
                      </li>
                      <li>
                        {translate(
                          "care_plan_detail.care_items.guideline_cns",
                        )}
                      </li>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )}

          {/* Tab 4: Actions */}
          {activeTab === 3 && (
            <Box>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}
              >
                <AssignmentIcon color="warning" />
                {translate("care_plan_detail.actions.section")}
              </Typography>

              <Paper
                variant="outlined"
                sx={{ p: 2, mb: 3, backgroundColor: "warning.light" }}
              >
                <Typography variant="body2" color="text.secondary">
                  💡 {translate("care_plan_detail.actions.tip")}
                </Typography>
              </Paper>

              <ArrayInput source="actions" label="">
                <SimpleFormIterator
                  inline
                  disableReordering={false}
                  addButton={<AddActionButton />}
                >
                  <Grid
                    container
                    spacing={2}
                    alignItems="flex-start"
                    sx={{ mb: 2 }}
                  >
                    <Grid size={{ xs: 12, md: 8 }}>
                      <TextInput
                        source="action_text"
                        label={translate(
                          "care_plan_detail.actions.action_label",
                        )}
                        fullWidth
                        multiline
                        rows={2}
                        required
                        helperText={translate(
                          "care_plan_detail.actions.action_helper",
                        )}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <NumberInput
                        source="duration_minutes"
                        label={translate(
                          "care_plan_detail.actions.duration_label",
                        )}
                        defaultValue={0}
                        min={0}
                        step={1}
                        helperText={translate(
                          "care_plan_detail.actions.duration_helper",
                        )}
                      />
                    </Grid>
                  </Grid>
                </SimpleFormIterator>
              </ArrayInput>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
