"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getCountFromServer, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, Client } from "@/types";

const ACTIVE_STATUSES = ["new_lead", "contacted", "interested", "site_visit_scheduled", "negotiation"];

export type DashboardMetrics = {
  total: number;
  activeLeads: number;
  closedLeads: number;
  todayFollowUps: number;
  overdueFollowUps: number;
  newLeadsToday: number;
  conversionRate: number;
};

const defaultMetrics: DashboardMetrics = {
  total: 0,
  activeLeads: 0,
  closedLeads: 0,
  todayFollowUps: 0,
  overdueFollowUps: 0,
  newLeadsToday: 0,
  conversionRate: 0,
};

async function getCount(q: any): Promise<number> {
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

async function getTrueCount(user: AppUser, baseQuery: any): Promise<number> {
  const baseCount = await getCount(baseQuery);
  
  // Deleted count subtraction
  const deletedQuery = query(baseQuery, where("deletedAt", ">=", new Timestamp(0, 0)));
  const deletedCount = await getCount(deletedQuery);

  // Ghost count subtraction
  let ghostCount = 0;
  if (!user.isGhost) {
    const ghostQuery = query(baseQuery, where("isGhost", "==", true));
    ghostCount = await getCount(ghostQuery);
  }

  return Math.max(0, baseCount - deletedCount - ghostCount);
}

export function useDashboardStats(
  user: AppUser | null,
  clients: Client[],
  loadingClients: boolean,
  limitCount: number,
  hasMore?: boolean
) {
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasFetchedServer, setHasFetchedServer] = useState(false);

  // Reset fetch guard if user session changes
  useEffect(() => {
    setHasFetchedServer(false);
  }, [user?.uid]);

  // In-memory calculations (fallback or when count < 2000)
  const calculateInMemory = useCallback((clientsList: Client[]) => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const activeLeads = clientsList.filter((c) => c.leadStatus !== "closed" && c.leadStatus !== "not_interested").length;
    const closedLeads = clientsList.filter((c) => c.leadStatus === "closed").length;
    const todayFollowUps = clientsList.filter((c) => {
      const due = c.followUpDate?.toDate?.();
      return due && due >= todayStart && due <= todayEnd;
    }).length;
    const overdueFollowUps = clientsList.filter((c) => {
      const due = c.followUpDate?.toDate?.();
      return due && due < todayStart && c.leadStatus !== "closed" && c.leadStatus !== "not_interested";
    }).length;
    const newLeadsToday = clientsList.filter((c) => {
      const created = c.createdAt?.toDate?.();
      return created && created >= todayStart && created <= todayEnd;
    }).length;
    const conversionRate = clientsList.length > 0 ? Math.round((closedLeads / clientsList.length) * 100) : 0;

    return {
      total: clientsList.length,
      activeLeads,
      closedLeads,
      todayFollowUps,
      overdueFollowUps,
      newLeadsToday,
      conversionRate,
    };
  }, []);

  const fetchServerStats = useCallback(async (currentUser: AppUser) => {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

      // Base query setup depending on role
      const isAdmin = currentUser.role === "admin" || currentUser.role === "super_admin";
      
      const baseTotalQuery = isAdmin
        ? collection(db, "clients")
        : query(collection(db, "clients"), where("assignedUserId", "==", currentUser.uid));

      const baseActiveQuery = isAdmin
        ? query(collection(db, "clients"), where("leadStatus", "in", ACTIVE_STATUSES))
        : query(collection(db, "clients"), where("assignedUserId", "==", currentUser.uid), where("leadStatus", "in", ACTIVE_STATUSES));

      const baseClosedQuery = isAdmin
        ? query(collection(db, "clients"), where("leadStatus", "==", "closed"))
        : query(collection(db, "clients"), where("assignedUserId", "==", currentUser.uid), where("leadStatus", "==", "closed"));

      const baseNewTodayQuery = isAdmin
        ? query(collection(db, "clients"), where("createdAt", ">=", Timestamp.fromDate(todayStart)), where("createdAt", "<=", Timestamp.fromDate(todayEnd)))
        : query(collection(db, "clients"), where("assignedUserId", "==", currentUser.uid), where("createdAt", ">=", Timestamp.fromDate(todayStart)), where("createdAt", "<=", Timestamp.fromDate(todayEnd)));

      const baseTodayFollowUpsQuery = isAdmin
        ? query(collection(db, "clients"), where("followUpDate", ">=", Timestamp.fromDate(todayStart)), where("followUpDate", "<=", Timestamp.fromDate(todayEnd)))
        : query(collection(db, "clients"), where("assignedUserId", "==", currentUser.uid), where("followUpDate", ">=", Timestamp.fromDate(todayStart)), where("followUpDate", "<=", Timestamp.fromDate(todayEnd)));

      const baseOverdueFollowUpsQuery = isAdmin
        ? query(collection(db, "clients"), where("followUpDate", "<", Timestamp.fromDate(todayStart)), where("leadStatus", "in", ACTIVE_STATUSES))
        : query(collection(db, "clients"), where("assignedUserId", "==", currentUser.uid), where("followUpDate", "<", Timestamp.fromDate(todayStart)), where("leadStatus", "in", ACTIVE_STATUSES));

      // Run count queries in parallel
      const [
        total,
        activeLeads,
        closedLeads,
        newLeadsToday,
        todayFollowUps,
        overdueFollowUps
      ] = await Promise.all([
        getTrueCount(currentUser, baseTotalQuery),
        getTrueCount(currentUser, baseActiveQuery),
        getTrueCount(currentUser, baseClosedQuery),
        getTrueCount(currentUser, baseNewTodayQuery),
        getTrueCount(currentUser, baseTodayFollowUpsQuery),
        getTrueCount(currentUser, baseOverdueFollowUpsQuery),
      ]);

      const conversionRate = total > 0 ? Math.round((closedLeads / total) * 100) : 0;

      setMetrics({
        total,
        activeLeads,
        closedLeads,
        todayFollowUps,
        overdueFollowUps,
        newLeadsToday,
        conversionRate,
      });
      setError(null);
      setHasFetchedServer(true);
    } catch (err) {
      console.error("Failed to fetch uncapped server-side dashboard stats, falling back to in-memory:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      // Graceful fallback to in-memory stats
      setMetrics(calculateInMemory(clients));
    } finally {
      setLoading(false);
    }
  }, [calculateInMemory, clients]);

  useEffect(() => {
    if (!user) {
      setMetrics(defaultMetrics);
      setLoading(false);
      return;
    }

    // If we haven't loaded clients yet, show loading state
    if (loadingClients && clients.length === 0) {
      setLoading(true);
      return;
    }

    // HYBRID STRATEGY:
    // If there are no more records on the server (hasMore is false),
    // we know for sure we have all documents in memory. We do not need server calls.
    if (!hasMore) {
      setMetrics(calculateInMemory(clients));
      setLoading(false);
      if (hasFetchedServer) {
        setHasFetchedServer(false);
      }
    } else {
      // If we reached the limit cap (hasMore is true), fetch true server-side counts only once
      if (!hasFetchedServer) {
        fetchServerStats(user);
      }
    }
  }, [user, clients, loadingClients, limitCount, hasMore, calculateInMemory, fetchServerStats, hasFetchedServer]);

  const refresh = useCallback(() => {
    if (user) {
      setLoading(true);
      fetchServerStats(user);
    }
  }, [user, fetchServerStats]);

  return { metrics, loading, error, refresh };
}
