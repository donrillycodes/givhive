"use client";
import { useEffect, useRef, useCallback } from "react";

type Options = {
  /** Milliseconds before onTimeout fires */
  timeoutMs: number;
  /** Whether tracking is on. Defaults to true. */
  enabled?: boolean;
  /** Called after the user has been idle for timeoutMs */
  onTimeout: () => void;
};

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

export function useIdleTimeout({
  timeoutMs,
  enabled = true,
  onTimeout,
}: Options) {
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const firedRef = useRef(false);

  const fire = useCallback(() => {
    if (firedRef.current) return; // never fire twice
    firedRef.current = true;
    onTimeoutRef.current();
  }, []);

  const reset = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fire, timeoutMs);
  }, [timeoutMs, fire]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    firedRef.current = false;
    reset(); // start the first timer

    const handleActivity = () => {
      if (firedRef.current) return; // ignore once we've logged out
      reset();
    };

    // Background tabs throttle setTimeout, so when the tab becomes visible
    // again we measure the REAL elapsed idle time and act on it. Returning
    // to the tab does NOT count as activity — that's the whole point.
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= timeoutMs) {
        fire();
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(fire, timeoutMs - elapsed);
      }
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true }),
    );
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, handleActivity),
      );
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, reset, fire, timeoutMs]);
}
