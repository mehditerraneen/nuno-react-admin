/**
 * Custom hook to check for Luxembourg school calendar updates
 *
 * Automatically checks for updates when the planning UI opens
 * and allows manual refresh.
 */

import { useState, useEffect, useCallback } from 'react';
import { useDataProvider } from 'react-admin';

interface UpdateInfo {
  hasUpdates: boolean;
  academicYear: string;
  currentCount: number;
  newCount: number;
  source: 'OFFICIAL' | 'FALLBACK';
  message: string;
}

interface UseSchoolCalendarUpdatesReturn {
  updateInfo: UpdateInfo | null;
  loading: boolean;
  error: string | null;
  checkForUpdates: () => Promise<void>;
  applyUpdate: () => Promise<void>;
  dismissUpdate: () => void;
  updating: boolean;
}

const API_BASE_URL = import.meta.env.VITE_SIMPLE_REST_URL || 'http://localhost:8000';

export const useSchoolCalendarUpdates = (): UseSchoolCalendarUpdatesReturn => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  /**
   * Check for updates from the backend
   */
  const checkForUpdates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/school-calendar/check-updates`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Only show update banner if updates are available and not dismissed
      if (data.has_updates && !dismissed) {
        setUpdateInfo(data);
      } else {
        setUpdateInfo(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check for updates';
      setError(errorMessage);
      console.error('School calendar update check failed:', err);
    } finally {
      setLoading(false);
    }
  }, [dismissed]);

  /**
   * Apply the available update
   */
  const applyUpdate = useCallback(async () => {
    if (!updateInfo) return;

    setUpdating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/school-calendar/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          academic_year: updateInfo.academicYear,
          force: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Update successful - clear the update info
      setUpdateInfo(null);

      // Optionally show success notification
      console.log('School calendar updated successfully:', data.message);

      // Reload after update to reflect changes
      window.location.reload();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply update';
      setError(errorMessage);
      console.error('School calendar update failed:', err);
    } finally {
      setUpdating(false);
    }
  }, [updateInfo]);

  /**
   * Dismiss the update notification
   */
  const dismissUpdate = useCallback(() => {
    setDismissed(true);
    setUpdateInfo(null);
  }, []);

  /**
   * Check for updates on mount and every 24 hours
   */
  useEffect(() => {
    // Initial check
    checkForUpdates();

    // Check every 24 hours (86400000 ms)
    const interval = setInterval(() => {
      checkForUpdates();
    }, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkForUpdates]);

  return {
    updateInfo,
    loading,
    error,
    checkForUpdates,
    applyUpdate,
    dismissUpdate,
    updating,
  };
};
