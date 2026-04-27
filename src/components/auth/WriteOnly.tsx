import type { ReactNode } from "react";
import { useIsReadOnly } from "../../hooks/useIsReadOnly";

/**
 * Renders children only when the current user is NOT in the read-only group.
 * Use to hide create/edit/delete buttons and dialog triggers in the UI.
 *
 * The backend (DRF IsReactAdminOrReadOnly) is the source of truth for
 * enforcement; this is UX gating, not security.
 */
export const WriteOnly = ({ children }: { children: ReactNode }) => {
  const readOnly = useIsReadOnly();
  if (readOnly) return null;
  return <>{children}</>;
};
