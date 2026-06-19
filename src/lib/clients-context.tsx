"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { subscribeClients, getClientsTotalCount } from "@/services/clients";
import type { AppUser, Client } from "@/types";

type ClientsContextValue = {
  clients: Client[];
  loading: boolean;
  limitCount: number;
  loadMore: () => void;
  hasMore: boolean;
  totalCount: number | null;
};

const ClientsContext = createContext<ClientsContextValue | null>(null);

export function ClientsProvider({ user, children }: { user: AppUser | null; children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [limitCount, setLimitCount] = useState(200);
  const [rawCount, setRawCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  useEffect(() => {
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

      // Async fetch total count in database to stay in sync with database mutations
      getClientsTotalCount(user)
        .then(setTotalCount)
        .catch((err) => console.error("Failed to fetch total count:", err));
    });
    return unsub;
  }, [user, limitCount]);

  const loadMore = useCallback(() => {
    setLimitCount((prev) => prev + 100);
  }, []);

  const hasMore = rawCount >= limitCount;

  return (
    <ClientsContext.Provider value={{ clients, loading, limitCount, loadMore, hasMore, totalCount }}>
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
