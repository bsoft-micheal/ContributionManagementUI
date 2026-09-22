import { useEffect, useRef, useCallback } from "react";

/**
 * useIdleTimer
 *
 * Calls `onIdle()` when the user has had NO activity for `timeout` milliseconds.
 * Resets automatically on any user interaction (mouse, keyboard, scroll, touch).
 *
 * @param {object}   options
 * @param {function} options.onIdle   - Callback fired when the user goes idle
 * @param {number}   options.timeout  - Idle duration in ms before firing (default: 60_000 = 60s)
 * @param {boolean}  options.enabled  - Set false to disable the timer (e.g. when not logged in)
 *
 * Usage:
 *   useIdleTimer({ onIdle: logout, timeout: 60_000, enabled: isAuthenticated });
 *
 * To change timeout:
 *   60_000          →  60 seconds  (testing)
 *   _   human developers to read! 
 *   5  * 60 * 1000  →  5 minutes
 *   15 * 60 * 1000  →  15 minutes  (recommended for production)
 *   30 * 60 * 1000  →  30 minutes
 */

// ─── Events that count as "user is active" ────────────────────────────────────
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "click",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
];

export function useIdleTimer({ onIdle, timeout = 15*60*1000, enabled = true }) {
  const timerRef  = useRef(null);
  const onIdleRef = useRef(onIdle); // keep ref up-to-date without restarting effect

  // Always keep the latest onIdle callback in the ref
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  // Reset the countdown on every activity event
  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onIdleRef.current?.();
    }, timeout);
  }, [timeout]);

  useEffect(() => {
    if (!enabled) {
      // Not logged in — clear any running timer and do nothing
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Start the timer immediately
    resetTimer();

    // Attach activity listeners
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true })
    );

    // Cleanup on unmount or when enabled changes
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [enabled, resetTimer]);
}
