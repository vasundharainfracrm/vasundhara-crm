"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Automatically logs the user out after TIMEOUT_MS of inactivity.
 * Resets on any mouse, keyboard, touch, or scroll event.
 */
export function useInactivityLogout() {
  const { logout } = useAuth();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      logout();
    }, TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset(); // start the timer immediately

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reset]);
}
