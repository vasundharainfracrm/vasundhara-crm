"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ClientForm } from "@/components/clients/ClientForm";
import { TopBar } from "@/components/layout/TopBar";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { subscribeClient } from "@/services/clients";
import type { Client } from "@/types";

export default function EditClientPage() {
  const params = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => subscribeClient(params.clientId, setClient), [params.clientId]);

  return (
    <>
      <TopBar title="Edit Client" description="Ownership is only transferable by an admin." mode="employee" backHref={`/dashboard/clients/${params.clientId}`} />
      <PageBreadcrumb
        crumbs={[
          { label: "My Clients", href: "/dashboard/clients" },
          { label: client?.fullName || "Client", href: `/dashboard/clients/${params.clientId}` },
          { label: "Edit" },
        ]}
      />
      <div className="p-4 lg:p-8">{client ? <ClientForm client={client} /> : <p className="text-sm text-muted-foreground">Loading client...</p>}</div>
    </>
  );
}
