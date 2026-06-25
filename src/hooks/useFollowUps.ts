"use client";

import { useEffect, useMemo, useState } from "react";
import { endOfWeek, isBefore, isToday, startOfToday } from "date-fns";
import { subscribeClientFollowUps } from "@/services/followups";
import { subscribeClients } from "@/services/clients";
import { useAuth } from "@/lib/auth-context";
import type { AppUser, Client, FollowUp } from "@/types";

// ─── Client-level follow-up history (for the lead detail page) ─────────────
export function useClientFollowUps(clientId?: string) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!clientId) return;
    return subscribeClientFollowUps(clientId, user, setFollowUps);
  }, [clientId, user]);

  return followUps;
}

// ─── Internal helper ───────────────────────────────────────────────────────
/**
 * Converts a Client's followUpDate into a FollowUp-shaped entry for the
 * follow-up page. The single source of truth for "is there a follow-up due?"
 * is client.followUpDate — the followups collection is for history only.
 */
function clientToFollowUp(client: Client): FollowUp {
  return {
    followupId: `client_${client.clientId}`,
    clientId: client.clientId,
    clientName: client.fullName,
    note: "",
    nextFollowUpDate: client.followUpDate,
    status: client.leadStatus,
    priority: client.priority,
    createdBy: client.assignedUserId,
    createdByName: client.assignedUserName,
    createdAt: client.createdAt,
  };
}

// ─── Employee follow-up hook ────────────────────────────────────────────────
export function useMyFollowUps(user: AppUser | null) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // Subscribe ONLY to the employee's clients.
    // Derive follow-up rows from client.followUpDate — no dual-source, no duplicates.
    return subscribeClients(user, 2000, (clients) => {
      const withDate = clients
        .filter((c) => c.followUpDate != null && !c.deletedAt && c.leadStatus !== "closed" && c.leadStatus !== "not_interested")
        .map(clientToFollowUp);
      setFollowUps(withDate);
      setLoading(false);
    });
  }, [user]);

  /**
   * Overdue (past) + Today + current week follow-ups.
   * Everything up to end-of-current-week is included so overdue items surface.
   */
  const thisWeekFollowUps = useMemo(() => {
    const now = new Date();
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return followUps.filter((fu) => {
      const date = fu.nextFollowUpDate?.toDate?.();
      if (!date) return false;
      return date <= weekEnd; // past (overdue) + this week
    });
  }, [followUps]);

  /** Counts for stat pills on the follow-up page header */
  const stats = useMemo(() => {
    const todayStart = startOfToday();
    let overdue = 0, today = 0, upcoming = 0;
    for (const fu of thisWeekFollowUps) {
      const date = fu.nextFollowUpDate?.toDate?.();
      if (!date) continue;
      if (isToday(date)) today++;
      else if (isBefore(date, todayStart)) overdue++;
      else upcoming++;
    }
    return { overdue, today, upcoming };
  }, [thisWeekFollowUps]);

  return { followUps, thisWeekFollowUps, stats, loading };
}
