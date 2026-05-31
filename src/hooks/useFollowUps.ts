"use client";

import { useEffect, useMemo, useState } from "react";
import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from "date-fns";
import { subscribeClientFollowUps, subscribeMyFollowUps } from "@/services/followups";
import type { AppUser, FollowUp } from "@/types";

export function useClientFollowUps(clientId?: string) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  useEffect(() => {
    if (!clientId) return;
    return subscribeClientFollowUps(clientId, setFollowUps);
  }, [clientId]);

  return followUps;
}

export function useMyFollowUps(user: AppUser | null) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    return subscribeMyFollowUps(user, (items) => {
      setFollowUps(items);
      setLoading(false);
    });
  }, [user]);

  /**
   * Follow-ups whose nextFollowUpDate falls within the current calendar week
   * (Monday 00:00 – Sunday 23:59 of the current ISO week).
   */
  const thisWeekFollowUps = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

    return followUps.filter((fu) => {
      const date = fu.nextFollowUpDate?.toDate?.();
      if (!date) return false;
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });
  }, [followUps]);

  return { followUps, thisWeekFollowUps, loading };
}
