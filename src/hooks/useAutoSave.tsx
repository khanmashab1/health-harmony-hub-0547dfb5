import { useEffect, useCallback, useRef } from "react";

/**
 * Auto-saves form data to localStorage on an interval and before session timeout.
 * @param key - unique storage key for this form
 * @param getData - function that returns current form data
 * @param restoreData - function to restore saved data into the form
 * @param intervalMs - auto-save interval in ms (default 30s)
 */
export function useAutoSave<T>(
  key: string,
  getData: () => T,
  restoreData?: (data: T) => void,
  intervalMs: number = 30000
) {
  const getDataRef = useRef(getData);
  getDataRef.current = getData;

  const storageKey = `autosave_${key}`;

  const save = useCallback(() => {
    try {
      const data = getDataRef.current();
      if (data && Object.values(data as Record<string, unknown>).some((v) => v !== "" && v !== null && v !== undefined)) {
        localStorage.setItem(storageKey, JSON.stringify(data));
      }
    } catch {
      // Silently fail
    }
  }, [storageKey]);

  const clearSaved = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const getSaved = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [storageKey]);

  // Auto-save on interval
  useEffect(() => {
    const interval = setInterval(save, intervalMs);
    return () => clearInterval(interval);
  }, [save, intervalMs]);

  // Save on session timeout event
  useEffect(() => {
    const handleTimeout = () => save();
    window.addEventListener("session-timeout-autosave", handleTimeout);
    return () => window.removeEventListener("session-timeout-autosave", handleTimeout);
  }, [save]);

  // Save on page unload
  useEffect(() => {
    const handleUnload = () => save();
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [save]);

  // Restore saved data on mount
  useEffect(() => {
    if (restoreData) {
      const saved = getSaved();
      if (saved) {
        restoreData(saved);
      }
    }
  }, []);

  return { save, clearSaved, getSaved };
}
