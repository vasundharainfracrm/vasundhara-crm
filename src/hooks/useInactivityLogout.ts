"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Automatically triggers an inactive state after TIMEOUT_MS of inactivity.
 * Resets on any mouse, keyboard, touch, or scroll event.
 */
export function useInactivityLogout() {
  const [isInactive, setIsInactive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (isInactive) return; // Don't reset if already inactive
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setIsInactive(true);
    }, TIMEOUT_MS);
  }, [isInactive]);

  const resume = useCallback(() => {
    setIsInactive(false);
  }, []);

  useEffect(() => {
    if (isInactive) {
      if (timer.current) clearTimeout(timer.current);
      return; // Suspend activity tracking while inactive
    }

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;
    const handleActivity = () => {
      reset();
    };

    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));
    reset(); // Start the timer immediately

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [isInactive, reset]);

  return { isInactive, resume };
}
