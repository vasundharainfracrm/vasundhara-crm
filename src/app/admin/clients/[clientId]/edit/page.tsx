"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ClientForm } from "@/components/clients/ClientForm";
import { TopBar } from "@/components/layout/TopBar";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { getClient } from "@/services/clients";
import type { Client } from "@/types";

export default function AdminEditClientPage() {
  const params = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null | undefined>(undefined);

  useEffect(() => {
    getClient(params.clientId).then(setClient);
  }, [params.clientId]);

  return (
    <>
      <TopBar title="Edit Client" description="Update client details and lead info." mode="admin" backHref={`/admin/clients/${params.clientId}`} />
      <PageBreadcrumb
        crumbs={[
          { label: "Clients", href: "/admin/clients" },
          { label: client?.fullName || "Client", href: `/admin/clients/${params.clientId}` },
          { label: "Edit" },
        ]}
      />
      <div className="p-4 lg:p-8">
        {client === undefined ? (
          <p className="text-sm text-muted-foreground">Loading client...</p>
        ) : client === null ? (
          <p className="text-sm text-muted-foreground">Client not found.</p>
        ) : (
          <ClientForm client={client} />
        )}
      </div>
    </>
  );
}
