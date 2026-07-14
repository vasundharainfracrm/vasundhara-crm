"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, ArrowRightLeft, Search, Trash2, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { subscribeOrphanClients, bulkTransferAndRestore, bulkDeleteClients, deleteClient } from "@/services/clients";
import { useEmployees } from "@/hooks/useEmployees";
import { leadStatusLabels, priorityLabels, type Client } from "@/types";

export default function UnassignedLeadsPage() {
  const { user } = useAuth();
  const { employees } = useEmployees(Boolean(user?.role === "super_admin"));
  const [orphans, setOrphans] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferUid, setTransferUid] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Deletion dialog states
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Pagination
  const PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user || user.role !== "super_admin") return;
    setLoading(true);
    return subscribeOrphanClients((items) => {
      setOrphans(items);
      setLoading(false);
    });
  }, [user]);

  // Filter by search term
  const filtered = useMemo(() => {
    if (!search.trim()) return orphans;
    const term = search.trim().toLowerCase();
    return orphans.filter((c) => {
      const haystack = [c.fullName, c.primaryMobile, c.email, c.assignedUserName, c.originalAssignedUserName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [orphans, search]);

  // Pagination — reset to page 1 on search change
  useEffect(() => { setCurrentPage(1); }, [search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Selection helpers
  // "Select all" acts on the current page only
  const allSelected = paginated.length > 0 && paginated.every((c) => selected.has(c.clientId));

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        paginated.forEach((c) => next.delete(c.clientId));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        paginated.forEach((c) => next.add(c.clientId));
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Bulk transfer
  async function handleBulkTransfer() {
    if (!user || !transferUid) return;
    const emp = employees.find((e) => e.uid === transferUid);
    if (!emp) return;

    setActionLoading(true);
    try {
      await bulkTransferAndRestore(Array.from(selected), emp.uid, emp.fullName, user, false);
      toast.success(`Transferred ${selected.size} lead(s) to ${emp.fullName}`);
      setSelected(new Set());
      setTransferOpen(false);
      setTransferUid("");
    } catch {
      toast.error("Failed to transfer leads.");
    } finally {
      setActionLoading(false);
    }
  }

  // Bulk soft-delete
  async function handleBulkDeleteConfirm() {
    if (!user || selected.size === 0) return;

    setActionLoading(true);
    try {
      await bulkDeleteClients(Array.from(selected), user);
      toast.success(`Moved ${selected.size} lead(s) to recently deleted.`);
      setSelected(new Set());
      setBulkDeleteOpen(false);
    } catch {
      toast.error("Failed to delete leads.");
    } finally {
      setActionLoading(false);
    }
  }

  // Single delete (soft-delete → moves to trash)
  async function handleDeleteConfirm() {
    if (!selectedClient || !user) return;
    setActionLoading(true);
    try {
      await deleteClient(selectedClient.clientId, selectedClient.fullName, user);
      toast.success(`Moved ${selectedClient.fullName} to trash.`);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(selectedClient.clientId);
        return next;
      });
      setDeleteOpen(false);
      setSelectedClient(null);
    } catch {
      toast.error("Failed to delete lead.");
    } finally {
      setActionLoading(false);
    }
  }

  if (!user || user.role !== "super_admin") return null;

  return (
    <>
      <TopBar
        title="Unassigned Leads"
        description="Leads whose assigned employee was deleted or deactivated without reassignment."
        mode="admin"
        backHref="/admin/clients"
      />
      <PageBreadcrumb
        crumbs={[
          { label: "Clients", href: "/admin/clients" },
          { label: "Unassigned Leads" },
        ]}
      />

      <div className="p-4 lg:p-8 space-y-4">
        {/* Search + Bulk Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="font-medium">
                {selected.size} selected
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setTransferOpen(true)}
                disabled={actionLoading}
                className="gap-1.5"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Transfer Selected
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={actionLoading}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Selected
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-surface shadow-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-border"
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Original Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Unassigned Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground text-sm">
                    Loading unassigned leads...
                  </TableCell>
                </TableRow>
              ) : !filtered.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-8 w-8 text-muted-foreground/40" />
                      <p>No unassigned leads found — all leads are assigned.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((client) => {
                  const orphanedStr = client.orphanedAt?.toDate
                    ? format(client.orphanedAt.toDate(), "dd MMM yyyy")
                    : "-";
                  const ownerName = client.originalAssignedUserName || client.assignedUserName;

                  return (
                    <TableRow key={client.clientId} className="hover:bg-muted/10 transition-colors duration-150">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(client.clientId)}
                          onChange={() => toggleOne(client.clientId)}
                          className="rounded border-border"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{client.fullName}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div>{client.primaryMobile}</div>
                          {client.email && <div className="text-muted-foreground">{client.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="line-through text-muted-foreground text-sm">{ownerName}</span>
                          <Badge variant="danger" className="text-[10px] px-1 py-0">Inactive</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={client.leadStatus as any}
                          className="text-xs"
                        >
                          {leadStatusLabels[client.leadStatus] || client.leadStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={client.priority === "high" ? "danger" : client.priority === "medium" ? "warning" : "secondary"}
                          className="text-xs"
                        >
                          {priorityLabels[client.priority] || client.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{orphanedStr}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => {
                              setSelected(new Set([client.clientId]));
                              setTransferOpen(true);
                            }}
                            className="h-8 px-2.5 text-accent hover:bg-accent/10 hover:text-accent flex items-center gap-1 text-xs"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            Transfer
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => {
                              setSelectedClient(client);
                              setDeleteOpen(true);
                            }}
                            className="h-8 px-2.5 text-danger hover:bg-danger/10 hover:text-danger flex items-center gap-1 text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination bar */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} unassigned lead(s)
              {selected.size > 0 && ` · ${selected.size} selected`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Prev
              </Button>
              <span className="text-xs text-muted-foreground font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      <Dialog
        open={transferOpen}
        onOpenChange={(open) => {
          setTransferOpen(open);
          if (!open) setTransferUid("");
        }}
        title="Transfer Unassigned Leads"
        description={`Reassign ${selected.size} lead(s) to an active employee.`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setTransferOpen(false);
                setTransferUid("");
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkTransfer} disabled={!transferUid || actionLoading}>
              {actionLoading ? "Transferring..." : "Transfer"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-2">
          <Label>Transfer to:</Label>
          <Select
            value={transferUid}
            onChange={(e) => setTransferUid(e.target.value)}
            disabled={actionLoading}
          >
            <option value="">-- Select an employee --</option>
            {employees
              .filter((e) => e.status === "active" && !e.isGhost)
              .map((emp) => (
                <option key={emp.uid} value={emp.uid}>
                  {emp.fullName} ({emp.department})
                </option>
              ))}
          </Select>
        </div>
      </Dialog>
      {/* Single delete confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setSelectedClient(null);
        }}
        title="Delete Lead?"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteOpen(false);
                setSelectedClient(null);
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? "Deleting..." : "Delete lead"}
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 py-2">
          <ShieldAlert className="h-5 w-5 text-danger shrink-0 mt-0.5" />
          <p className="text-sm">
            Are you sure you want to move <strong>{selectedClient?.fullName}</strong> to recently deleted?
          </p>
        </div>
      </Dialog>

      {/* Bulk delete confirmation dialog */}
      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selected.size} Lead(s)?`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBulkDeleteOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDeleteConfirm} disabled={actionLoading}>
              {actionLoading ? "Deleting..." : `Delete ${selected.size} leads`}
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 py-2">
          <ShieldAlert className="h-5 w-5 text-danger shrink-0 mt-0.5" />
          <p className="text-sm">
            Are you sure you want to move <strong>{selected.size} lead(s)</strong> to recently deleted?
          </p>
        </div>
      </Dialog>
    </>
  );
}
