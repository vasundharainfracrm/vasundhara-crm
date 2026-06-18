"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { RotateCcw, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { subscribeDeletedClients, restoreClient, permanentDeleteClient } from "@/services/clients";
import { leadStatusLabels, type Client } from "@/types";

export default function AdminTrashPage() {
  const { user } = useAuth();
  const [deletedClients, setDeletedClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
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

  async function handlePermanentDelete() {
    if (!selectedClient || !user) return;
    setActioningId(selectedClient.clientId);
    try {
      await permanentDeleteClient(selectedClient.clientId, selectedClient.fullName, user);
      toast.success(`Permanently deleted client ${selectedClient.fullName}`);
      setDeleteOpen(false);
      setSelectedClient(null);
    } catch {
      toast.error(`Failed to permanently delete client.`);
    } finally {
      setActioningId(null);
    }
  }

  if (!user) return null;

  return (
    <>
      <TopBar
        title="Recently Deleted Clients"
        description="Leads in the trash bin. Only Super Admins can permanently delete records."
        mode="admin"
        backHref="/admin/clients"
      />
      <PageBreadcrumb
        crumbs={[
          { label: "Clients", href: "/admin/clients" },
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
                <TableHead>{user.role === "super_admin" ? "Owner / Deleted By" : "Owned By"}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deleted Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                    Loading trash bin...
                  </TableCell>
                </TableRow>
              ) : !deletedClients.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                    Trash bin is empty.
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
                        <div className="text-sm">{client.assignedUserName}</div>
                        {user.role === "super_admin" && client.deletedByName && (
                          <div className="text-xs text-danger font-medium mt-0.5">
                            Deleted by: {client.deletedByName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent border border-accent/20">
                          {leadStatusLabels[client.leadStatus] || client.leadStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{deletedDateStr}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actioningId !== null}
                            onClick={() => handleRestore(client)}
                            className="h-8 px-2.5 text-accent hover:bg-accent/10 hover:text-accent flex items-center gap-1 text-xs"
                            title="Restore Lead"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </Button>

                          {user.role === "super_admin" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actioningId !== null}
                              onClick={() => {
                                setSelectedClient(client);
                                setDeleteOpen(true);
                              }}
                              className="h-8 px-2.5 text-danger hover:bg-danger/10 hover:text-danger flex items-center gap-1 text-xs"
                              title="Permanently Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Permanent delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <ShieldAlert className="h-5 w-5" />
              Permanently Delete Lead?
            </DialogTitle>
            <DialogDescription>
              Are you absolutely sure you want to permanently delete <strong>{selectedClient?.fullName}</strong>?
              This action cannot be undone and will permanently wipe their data from the database.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteOpen(false);
                setSelectedClient(null);
              }}
              disabled={actioningId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={actioningId !== null}
            >
              {actioningId !== null ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
