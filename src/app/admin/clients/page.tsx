"use client";

import { ClientTable } from "@/components/clients/ClientTable";
import { TopBar } from "@/components/layout/TopBar";
import { useClients } from "@/hooks/useClients";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/lib/auth-context";

export default function AdminClientsPage() {
  const { user } = useAuth();
  const { filteredClients, filters, setSearch, setStatus, setPriority, setLeadSource, setPropertyType, setAssignedUserId, setBudgetMin, setBudgetMax, setFollowUpFrom, setFollowUpTo, resetFilters, loadMore, hasMore } = useClients(user);
  const { employees } = useEmployees(Boolean(user?.role === "admin" || user?.role === "super_admin"));

  if (!user) return null;

  return (
    <>
      <TopBar title="All Clients" description="Admin view across every employee owner." mode="admin" />
      <div className="p-4 lg:p-8">
        <ClientTable
          clients={filteredClients}
          user={user}
          allEmployees={employees}
          filters={filters}
          setSearch={setSearch}
          setStatus={setStatus}
          setPriority={setPriority}
          setLeadSource={setLeadSource}
          setPropertyType={setPropertyType}
          setAssignedUserId={setAssignedUserId}
          setBudgetMin={setBudgetMin}
          setBudgetMax={setBudgetMax}
          setFollowUpFrom={setFollowUpFrom}
          setFollowUpTo={setFollowUpTo}
          resetFilters={resetFilters}
          loadMore={loadMore}
          hasMore={hasMore}
        />
      </div>
    </>
  );
}
