"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Table2, Trash2 } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { ClientTable } from "@/components/clients/ClientTable";
import { ClientKanban } from "@/components/clients/ClientKanban";
import { useClients } from "@/hooks/useClients";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "crm_clients_view_employee";
type ViewMode = "table" | "kanban";

export default function ClientsPage() {
  const { user } = useAuth();
  const {
    filteredClients,
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
    totalCount,
  } = useClients(user);

  const [view, setView] = useState<ViewMode>("table");

  // Restore persisted view preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
      if (saved === "table" || saved === "kanban") setView(saved);
    } catch {
      // localStorage unavailable — ignore
    }
  }, []);

  function switchView(v: ViewMode) {
    setView(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // ignore
    }
  }

  if (!user) return null;

  const sharedProps = {
    clients: filteredClients,
    user,
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
    totalCount,
  };

  return (
    <>
      <TopBar
        title="My Clients"
        description="Only records assigned to your Firebase UID are visible here."
        mode="employee"
        ctaHref="/dashboard/clients/new"
        ctaLabel="Add client"
        onSearch={setSearch}
        searchValue={filters.search}
      />
      <div className="p-4 lg:p-8">
        {/* View toggle & Actions */}
        <div className="mb-4 flex items-center justify-between gap-1 flex-wrap">
          <Link
            id="clients-trash-link"
            href="/dashboard/clients/trash"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-150 hover:border-danger/30 hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Recently Deleted
          </Link>

          <div className="flex items-center gap-1">
            <button
              id="clients-view-table"
              onClick={() => switchView("table")}
              title="Table view"
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150",
                view === "table"
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : "border-border bg-surface text-muted-foreground hover:border-accent/30 hover:text-foreground",
              )}
            >
              <Table2 className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              id="clients-view-kanban"
              onClick={() => switchView("kanban")}
              title="Kanban view"
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150",
                view === "kanban"
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : "border-border bg-surface text-muted-foreground hover:border-accent/30 hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </button>
          </div>
        </div>

        {view === "table" ? (
          <ClientTable {...sharedProps} />
        ) : (
          <div className="flex flex-col gap-4">
            <ClientTable {...sharedProps} kanbanMode />
            <ClientKanban {...sharedProps} />
          </div>
        )}
      </div>
    </>
  );
}
