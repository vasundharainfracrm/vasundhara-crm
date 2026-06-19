"use client";

import { useMemo, useState } from "react";
import { useClientsContext } from "@/lib/clients-context";
import type { AppUser, Client, LeadPriority, LeadSource, LeadStatus } from "@/types";

export type ClientFilters = {
  search: string;
  status: LeadStatus | "all";
  priority: LeadPriority | "all";
  leadSource: LeadSource | "all";
  propertyType: string;
  assignedUserId: string;
  budgetMin: string;
  budgetMax: string;
  followUpFrom: string;
  followUpTo: string;
};

const defaultFilters: ClientFilters = {
  search: "",
  status: "all",
  priority: "all",
  leadSource: "all",
  propertyType: "all",
  assignedUserId: "all",
  budgetMin: "",
  budgetMax: "",
  followUpFrom: "",
  followUpTo: "",
};

export function useClients(user: AppUser | null) {
  const { clients, loading, loadMore, hasMore, limitCount, totalCount, setAssignedUserIdFilter, assignedUserIdFilter } = useClientsContext();
  const [filters, setFilters] = useState<ClientFilters>(defaultFilters);

  const filteredClients = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    const budgetMin = filters.budgetMin ? Number(filters.budgetMin) : null;
    const budgetMax = filters.budgetMax ? Number(filters.budgetMax) : null;
    const followUpFrom = filters.followUpFrom ? new Date(`${filters.followUpFrom}T00:00:00`) : null;
    const followUpTo = filters.followUpTo ? new Date(`${filters.followUpTo}T23:59:59`) : null;

    return clients.filter((client) => {
      if (filters.status !== "all" && client.leadStatus !== filters.status) return false;
      if (filters.priority !== "all" && client.priority !== filters.priority) return false;
      if (filters.leadSource !== "all" && client.leadSource !== filters.leadSource) return false;
      if (filters.propertyType !== "all" && client.propertyType !== filters.propertyType) return false;
      // Note: assignedUserId filtering is handled at the Firestore listener level via
      // setAssignedUserIdFilter — not here — so that ALL leads for that employee are returned,
      // not just the first 200 loaded in the paginated admin view.
      if (budgetMin !== null && client.budget < budgetMin) return false;
      if (budgetMax !== null && client.budget > budgetMax) return false;
      if (followUpFrom || followUpTo) {
        const due = client.followUpDate?.toDate?.();
        if (!due) return false;
        if (followUpFrom && due < followUpFrom) return false;
        if (followUpTo && due > followUpTo) return false;
      }
      if (term) {
        const haystack = [
          client.fullName,
          client.primaryMobile,
          client.email,
          client.city,
          client.preferredLocation,
          client.assignedUserName,
          // Include dealer names so searching by dealer name finds all linked leads
          ...(client.dealers ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [clients, filters]);

  // §4.7 — Pre-computed dashboard metrics
  const metrics = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const activeLeads = clients.filter((c) => c.leadStatus !== "closed" && c.leadStatus !== "not_interested").length;
    const closedLeads = clients.filter((c) => c.leadStatus === "closed").length;
    const todayFollowUps = clients.filter((c) => {
      const due = c.followUpDate?.toDate?.();
      return due && due >= todayStart && due <= todayEnd;
    }).length;
    const overdueFollowUps = clients.filter((c) => {
      const due = c.followUpDate?.toDate?.();
      return due && due < todayStart && c.leadStatus !== "closed" && c.leadStatus !== "not_interested";
    }).length;
    const newLeadsToday = clients.filter((c) => {
      const created = c.createdAt?.toDate?.();
      return created && created >= todayStart && created <= todayEnd;
    }).length;
    const conversionRate = clients.length > 0 ? Math.round((closedLeads / clients.length) * 100) : 0;
    const highPriority = clients.filter((c) => c.priority === "high").length;

    return {
      total: clients.length,
      activeLeads,
      closedLeads,
      todayFollowUps,
      overdueFollowUps,
      newLeadsToday,
      conversionRate,
      highPriority,
    };
  }, [clients]);

  function setSearch(value: string) {
    setFilters((prev) => ({ ...prev, search: value }));
  }
  function setStatus(value: LeadStatus | "all") {
    setFilters((prev) => ({ ...prev, status: value }));
  }
  function setPriority(value: LeadPriority | "all") {
    setFilters((prev) => ({ ...prev, priority: value }));
  }
  function setLeadSource(value: LeadSource | "all") {
    setFilters((prev) => ({ ...prev, leadSource: value }));
  }
  function setPropertyType(value: string) {
    setFilters((prev) => ({ ...prev, propertyType: value }));
  }
  function setAssignedUserId(value: string) {
    // Push the filter to the Firestore listener layer, not local state.
    // This ensures ALL leads for that employee are fetched, not just the
    // first 200 from the paginated admin snapshot.
    const uid = value === "all" ? null : value;
    setAssignedUserIdFilter(uid);
    // Keep local filter state in sync so the dropdown reflects the selection
    setFilters((prev) => ({ ...prev, assignedUserId: value }));
  }
  function setBudgetMin(value: string) {
    setFilters((prev) => ({ ...prev, budgetMin: value }));
  }
  function setBudgetMax(value: string) {
    setFilters((prev) => ({ ...prev, budgetMax: value }));
  }
  function setFollowUpFrom(value: string) {
    setFilters((prev) => ({ ...prev, followUpFrom: value }));
  }
  function setFollowUpTo(value: string) {
    setFilters((prev) => ({ ...prev, followUpTo: value }));
  }
  function resetFilters() {
    setFilters(defaultFilters);
    // Also clear the Firestore-level employee filter so the paginated listener is restored
    setAssignedUserIdFilter(null);
  }

  return {
    clients,
    filteredClients,
    loading,
    metrics,
    filters,
    setSearch,
    setStatus,
    setPriority,
    setLeadSource,
    setPropertyType,
    setAssignedUserId,
    setBudgetMin,
    setBudgetMax,
    setFollowUpFrom,
    setFollowUpTo,
    resetFilters,
    loadMore,
    hasMore,
    limitCount,
    totalCount,
    assignedUserIdFilter,
  };
}
