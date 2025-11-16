import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  Button,
  Tab,
  Tabs,
  Grid,
  Chip,
  Alert,
} from "@mui/material";
import {
  CalendarToday,
  Schedule,
  Route,
  Add,
  ViewWeek,
  Dashboard as DashboardIcon,
} from "@mui/icons-material";
import { WeeklyTourCalendar } from "./WeeklyTourCalendar";
import { ToursDashboard } from "./ToursDashboard";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`enhanced-tours-tabpanel-${index}`}
      aria-labelledby={`enhanced-tours-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const EnhancedToursDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Enhanced Tours Management
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Comprehensive tour planning with drag-and-drop event management,
          weekly calendar view, and route optimization
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>New Features:</strong> Drag-and-drop event assignment, weekly
          calendar view, improved tour scheduling with time management and break
          planning.
        </Alert>

        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab
            label="Weekly Calendar"
            icon={<ViewWeek />}
            iconPosition="start"
          />
          <Tab
            label="Tours Overview"
            icon={<DashboardIcon />}
            iconPosition="start"
          />
          <Tab label="Route Planning" icon={<Route />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab 1: Weekly Calendar View */}
      <TabPanel value={activeTab} index={0}>
        <WeeklyTourCalendar />

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Weekly Calendar Features
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" color="primary" gutterBottom>
                    🎯 Visual Planning
                  </Typography>
                  <Typography variant="body2">
                    See all tours organized by employee and day. Quickly
                    identify gaps and overlaps in scheduling.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" color="secondary" gutterBottom>
                    ➕ Quick Creation
                  </Typography>
                  <Typography variant="body2">
                    Click empty slots to instantly create new tours for specific
                    employees and dates.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" color="success.main" gutterBottom>
                    📊 Real-time Stats
                  </Typography>
                  <Typography variant="body2">
                    View weekly statistics including total tours, active
                    employees, and event counts.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </TabPanel>

      {/* Tab 2: Original Tours Overview */}
      <TabPanel value={activeTab} index={1}>
        <ToursDashboard />
      </TabPanel>

      {/* Tab 3: Route Planning */}
      <TabPanel value={activeTab} index={2}>
        <Card>
          <CardHeader
            title="Advanced Route Planning"
            avatar={<Route color="primary" />}
          />
          <CardContent>
            <Alert severity="info" sx={{ mb: 3 }}>
              Use the enhanced tour edit interface for drag-and-drop event
              management and route optimization.
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Drag & Drop Event Management
                </Typography>
                <Typography variant="body2" paragraph>
                  The new tour edit interface allows you to:
                </Typography>
                <Box component="ul" sx={{ pl: 2 }}>
                  <Typography component="li" variant="body2">
                    View all available events for the tour date
                  </Typography>
                  <Typography component="li" variant="body2">
                    Drag events from the available list to assign them to tours
                  </Typography>
                  <Typography component="li" variant="body2">
                    Remove events by dragging them back or using the remove
                    button
                  </Typography>
                  <Typography component="li" variant="body2">
                    See real-time event ordering and sequencing
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Enhanced Tour Details
                </Typography>
                <Typography variant="body2" paragraph>
                  Tours now include comprehensive scheduling information:
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Chip
                    label="Start & End Times"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label="Break Duration Planning"
                    color="secondary"
                    variant="outlined"
                  />
                  <Chip
                    label="Employee Reassignment"
                    color="info"
                    variant="outlined"
                  />
                  <Chip
                    label="Visual Route Optimization"
                    color="success"
                    variant="outlined"
                  />
                </Box>
              </Grid>
            </Grid>

            <Box
              sx={{ mt: 3, p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                <strong>Tip:</strong> Use the weekly calendar to get an
                overview, then switch to individual tour editing for detailed
                event management and route optimization.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
};
