"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { subscribeDeletedClients, restoreClient } from "@/services/clients";
import { leadStatusLabels, type Client } from "@/types";

export default function EmployeeTrashPage() {
  const { user } = useAuth();
  const [deletedClients, setDeletedClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    return subscribeDeletedClients(user, (items) => {
      setDeletedClients(items);
      setLoading(false);
    });
  }, [user]);

  async function handleRestore(client: Client) {
    if (!user) return;
    setActioningId(client.clientId);
    try {
      await restoreClient(client.clientId, client.fullName, user);
      toast.success(`Restored client ${client.fullName}`);
    } catch {
      toast.error(`Failed to restore client.`);
    } finally {
      setActioningId(null);
    }
  }

  if (!user) return null;

  return (
    <>
      <TopBar
        title="My Deleted Clients"
        description="Mistakenly deleted leads can be restored back to your active list."
        mode="employee"
        backHref="/dashboard/clients"
      />
      <PageBreadcrumb
        crumbs={[
          { label: "My Clients", href: "/dashboard/clients" },
          { label: "Recently Deleted" },
        ]}
      />

      <div className="p-4 lg:p-8">
        <div className="rounded-lg border border-border bg-surface shadow-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deleted Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                    Loading deleted leads...
                  </TableCell>
                </TableRow>
              ) : !deletedClients.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                    No recently deleted leads found.
                  </TableCell>
                </TableRow>
              ) : (
                deletedClients.map((client) => {
                  const deletedDateStr = client.deletedAt?.toDate
                    ? format(client.deletedAt.toDate(), "dd MMM yyyy, hh:mm a")
                    : "-";

                  return (
                    <TableRow key={client.clientId} className="hover:bg-muted/10 transition-colors duration-150">
                      <TableCell className="font-medium">{client.fullName}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div>{client.primaryMobile}</div>
                          {client.email && <div className="text-muted-foreground">{client.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent border border-accent/20">
                          {leadStatusLabels[client.leadStatus] || client.leadStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{deletedDateStr}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actioningId !== null}
                          onClick={() => handleRestore(client)}
                          className="h-8 px-2.5 text-accent hover:bg-accent/10 hover:text-accent inline-flex items-center gap-1 text-xs"
                          title="Restore Lead"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
