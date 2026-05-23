"use client";

import { TopBar } from "@/components/layout/TopBar";
import { ClientTable } from "@/components/clients/ClientTable";
import { useClients } from "@/hooks/useClients";
import { useAuth } from "@/lib/auth-context";

export default function ClientsPage() {
  const { user } = useAuth();
  const { filteredClients, filters, setSearch, setStatus, setPriority, setLeadSource, setPropertyType, setAssignedUserId, setBudgetMin, setBudgetMax, setFollowUpFrom, setFollowUpTo, resetFilters, loadMore, hasMore } = useClients(user);

  if (!user) return null;

  return (
    <>
      <TopBar title="My Clients" description="Only records assigned to your Firebase UID are visible here." mode="employee" ctaHref="/dashboard/clients/new" ctaLabel="Add client" />
      <div className="p-4 lg:p-8">
        <ClientTable
          clients={filteredClients}
          user={user}
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
