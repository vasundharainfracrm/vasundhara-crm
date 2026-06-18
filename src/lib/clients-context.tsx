"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { subscribeClients } from "@/services/clients";
import type { AppUser, Client } from "@/types";

type ClientsContextValue = {
  clients: Client[];
  loading: boolean;
  limitCount: number;
  loadMore: () => void;
  hasMore: boolean;
};

const ClientsContext = createContext<ClientsContextValue | null>(null);

export function ClientsProvider({ user, children }: { user: AppUser | null; children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [limitCount, setLimitCount] = useState(2000);

  useEffect(() => {
    if (!user) {
      setClients([]);
      setLoading(true);
      return;
    }
    setLoading(true);
    const unsub = subscribeClients(user, limitCount, (items) => {
      setClients(items.filter((c) => !c.deletedAt));
      setLoading(false);
    });
    return unsub;
  }, [user, limitCount]);

  const loadMore = useCallback(() => {
    setLimitCount((prev) => prev + 100);
  }, []);

  const hasMore = clients.length >= limitCount;

  return (
    <ClientsContext.Provider value={{ clients, loading, limitCount, loadMore, hasMore }}>
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
