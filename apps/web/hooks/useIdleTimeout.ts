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
  // keep the latest callback in a ref so changing it doesn't reset the timer
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onTimeoutRef.current(), timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    reset(); // start the first timer

    const handler = () => reset();
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handler, { passive: true }),
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, handler),
      );
    };
  }, [enabled, reset]);
}
