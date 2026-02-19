import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // 2 minutes before timeout
const WARNING_TIMEOUT_MS = IDLE_TIMEOUT_MS - WARNING_BEFORE_MS;

export function useIdleTimeout() {
  const { user, signOut } = useAuth();
  const { toast, dismiss } = useToast();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const warningToastIdRef = useRef<string | null>(null);

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setSecondsLeft(null);
    if (warningToastIdRef.current) {
      dismiss(warningToastIdRef.current);
      warningToastIdRef.current = null;
    }
  }, [dismiss]);

  const handleLogout = useCallback(async () => {
    // Auto-save any form data before logout
    const event = new CustomEvent("session-timeout-autosave");
    window.dispatchEvent(event);

    clearAllTimers();
    await signOut();
    window.location.href = "/auth?mode=login";
  }, [signOut, clearAllTimers]);

  const showWarning = useCallback(() => {
    let remaining = 120; // 2 minutes in seconds
    setSecondsLeft(remaining);

    const { id } = toast({
      title: "⏱️ Session expiring soon",
      description: `You'll be logged out in ${remaining}s due to inactivity.`,
      duration: WARNING_BEFORE_MS,
      action: undefined, // We handle the button separately in the component
    });
    warningToastIdRef.current = id;

    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        handleLogout();
      }
    }, 1000);

    // Set the final logout timer
    idleTimerRef.current = setTimeout(() => {
      handleLogout();
    }, WARNING_BEFORE_MS);
  }, [toast, handleLogout]);

  const resetTimers = useCallback(() => {
    clearAllTimers();
    if (!user) return;

    // Set warning timer (fires 2 min before logout)
    warningTimerRef.current = setTimeout(() => {
      showWarning();
    }, WARNING_TIMEOUT_MS);
  }, [user, clearAllTimers, showWarning]);

  const stayLoggedIn = useCallback(() => {
    clearAllTimers();
    resetTimers();
    toast({
      title: "Session extended",
      description: "Your session has been refreshed.",
    });
  }, [clearAllTimers, resetTimers, toast]);

  useEffect(() => {
    if (!user) {
      clearAllTimers();
      return;
    }

    // Rolling session: reset on any user interaction
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];

    // Throttle to avoid excessive resets
    let lastReset = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset < 30000) return; // throttle: reset at most every 30s
      lastReset = now;
      // Only reset if we're NOT in the warning phase
      if (secondsLeft === null) {
        resetTimers();
      }
    };

    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    resetTimers();

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      clearAllTimers();
    };
  }, [user, resetTimers, clearAllTimers, secondsLeft]);

  return { secondsLeft, stayLoggedIn };
}
