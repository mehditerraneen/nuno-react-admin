import React, { useState, useEffect, useCallback } from "react";
import {
  Snackbar,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { authService } from "../services/authService";

/**
 * SessionManager — renders session expiry warnings and expired dialogs.
 * Mount once at the App level (inside <Admin>).
 */
const SessionManager = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [remainingMin, setRemainingMin] = useState(0);

  const handleExtendSession = useCallback(async () => {
    try {
      await authService.refreshToken();
      setShowWarning(false);
    } catch {
      authService.handleSessionExpired();
    }
  }, []);

  const handleGoToLogin = useCallback(() => {
    setShowExpired(false);
    window.location.hash = "#/login";
    window.location.reload();
  }, []);

  useEffect(() => {
    const unsubscribe = authService.onSessionEvent((event) => {
      if (event === "warning") {
        const secs = authService.getRemainingSeconds();
        setRemainingMin(Math.ceil(secs / 60));
        setShowWarning(true);
      } else if (event === "expired") {
        setShowWarning(false);
        setShowExpired(true);
      } else if (event === "refreshed") {
        setShowWarning(false);
      }
    });

    return unsubscribe;
  }, []);

  // Countdown timer for the warning snackbar
  useEffect(() => {
    if (!showWarning) return;
    const interval = setInterval(() => {
      const secs = authService.getRemainingSeconds();
      if (secs <= 0) {
        clearInterval(interval);
        return;
      }
      setRemainingMin(Math.ceil(secs / 60));
    }, 30000);
    return () => clearInterval(interval);
  }, [showWarning]);

  return (
    <>
      {/* Warning snackbar — session about to expire */}
      <Snackbar
        open={showWarning}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="warning"
          variant="filled"
          action={
            <Button color="inherit" size="small" onClick={handleExtendSession}>
              Extend Session
            </Button>
          }
          onClose={() => setShowWarning(false)}
        >
          Your session expires in ~{remainingMin} min. Save your work or extend.
        </Alert>
      </Snackbar>

      {/* Expired dialog — modal, cannot be dismissed without action */}
      <Dialog open={showExpired} disableEscapeKeyDown>
        <DialogTitle>Session Expired</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your session has expired. Please log in again to continue.
            Any unsaved changes may have been lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleGoToLogin} variant="contained" color="primary">
            Go to Login
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SessionManager;
