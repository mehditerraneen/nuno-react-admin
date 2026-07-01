import type { ReactNode } from "react";
import {
  Layout as RALayout,
  CheckForApplicationUpdate,
  Menu,
} from "react-admin";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

// Custom menu: all resource entries (unchanged) + the planning calendar
// custom route (which the auto-menu wouldn't show).
const AppMenu = () => (
  <Menu>
    <Menu.ResourceItems />
    <Menu.Item
      to="/planning/calendar"
      primaryText="Planning (Calendrier)"
      leftIcon={<CalendarMonthIcon />}
    />
  </Menu>
);

export const Layout = ({ children }: { children: ReactNode }) => (
  <RALayout menu={AppMenu}>
    {children}
    <CheckForApplicationUpdate />
  </RALayout>
);
