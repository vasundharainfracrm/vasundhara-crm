"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { subscribeClients, subscribeClientsByEmployee, getClientsTotalCount } from "@/services/clients";
import type { AppUser, Client } from "@/types";

type ClientsContextValue = {
  clients: Client[];
  loading: boolean;
  limitCount: number;
  loadMore: () => void;
  hasMore: boolean;
  totalCount: number | null;
  /** Admin-only: when set, swaps the listener to fetch ALL leads for that employee UID. */
  setAssignedUserIdFilter: (uid: string | null) => void;
  assignedUserIdFilter: string | null;
};

const ClientsContext = createContext<ClientsContextValue | null>(null);

export function ClientsProvider({ user, children }: { user: AppUser | null; children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [limitCount, setLimitCount] = useState(200);
  const [rawCount, setRawCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // When an admin selects a specific employee in "Assigned To", we switch to a
  // dedicated unlimited listener for that employee's leads instead of filtering locally.
  const [assignedUserIdFilter, setAssignedUserIdFilter] = useState<string | null>(null);

  // Keep a ref to tear down the employee-scoped listener when the filter changes
  const employeeUnsubRef = useRef<(() => void) | null>(null);

  // ─── Employee-scoped listener (admin "Assigned To" filter) ───────────────
  useEffect(() => {
    if (!assignedUserIdFilter) {
      // Clean up employee listener if filter was cleared
      if (employeeUnsubRef.current) {
        employeeUnsubRef.current();
        employeeUnsubRef.current = null;
      }
      return;
    }

    setLoading(true);
    const unsub = subscribeClientsByEmployee(assignedUserIdFilter, (items) => {
      setClients(items);
      setRawCount(items.length);
      setTotalCount(items.length);
      setLoading(false);
    });

    employeeUnsubRef.current = unsub;
    return () => {
      unsub();
      employeeUnsubRef.current = null;
    };
  }, [assignedUserIdFilter]);

  // ─── Paginated listener (default — no employee filter active) ────────────
  useEffect(() => {
    // Skip this listener when an employee filter is active — the other effect handles it
    if (assignedUserIdFilter) return;

    if (!user) {
      setClients([]);
      setRawCount(0);
      setTotalCount(null);
      setLoading(true);
      return;
    }

    setLoading(true);
    const unsub = subscribeClients(user, limitCount, (items, fetchedRawCount) => {
      setClients(items.filter((c) => !c.deletedAt));
      setRawCount(fetchedRawCount);
      setLoading(false);

      // Async fetch total count to stay in sync with database mutations
      getClientsTotalCount(user)
        .then(setTotalCount)
        .catch((err) => console.error("Failed to fetch total count:", err));
    });
    return unsub;
  }, [user, limitCount, assignedUserIdFilter]);

  const loadMore = useCallback(() => {
    // loadMore only applies to the paginated admin view, not the employee-scoped view
    if (!assignedUserIdFilter) {
      setLimitCount((prev) => prev + 100);
    }
  }, [assignedUserIdFilter]);

  // hasMore only makes sense for the paginated view
  const hasMore = !assignedUserIdFilter && rawCount >= limitCount;

  const handleSetAssignedUserIdFilter = useCallback((uid: string | null) => {
    setAssignedUserIdFilter(uid);
    // Reset pagination when switching back to full view
    if (!uid) {
      setLimitCount(200);
    }
  }, []);

  return (
    <ClientsContext.Provider
      value={{
        clients,
        loading,
        limitCount,
        loadMore,
        hasMore,
        totalCount,
        setAssignedUserIdFilter: handleSetAssignedUserIdFilter,
        assignedUserIdFilter,
      }}
    >
      {children}
    </ClientsContext.Provider>
  );
}

export function useClientsContext() {
  const context = useContext(ClientsContext);
  if (!context) {
    throw new Error("useClientsContext must be used inside ClientsProvider");
  }
  return context;
}
