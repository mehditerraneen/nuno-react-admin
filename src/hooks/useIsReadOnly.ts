import { usePermissions } from "react-admin";
import type { UserRole } from "../services/authService";

/**
 * Returns true when the current user is in the ReactReadOnlyUsers group.
 *
 * Use this to hide write affordances (Create/Edit/Delete buttons, custom
 * action buttons, save buttons). Backend enforcement is in
 * api.permissions.IsReactAdminOrReadOnly — UI gating here is UX only.
 *
 * While permissions are still loading, returns false (optimistic) to avoid
 * flashing read-only state on the first paint for admins.
 */
export const useIsReadOnly = (): boolean => {
  const { permissions, isLoading } = usePermissions<UserRole>();
  if (isLoading) return false;
  return permissions === "readonly";
};
