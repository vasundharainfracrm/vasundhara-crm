"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowRightLeft,
  Filter,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { useEmployees } from "@/hooks/useEmployees";
import {
  subscribeDeletedClients,
  restoreClient,
  permanentDeleteClient,
  bulkRestoreClients,
  bulkPermanentDeleteClients,
  bulkTransferAndRestore,
} from "@/services/clients";
import { leadStatusLabels, priorityLabels, leadStatuses, type Client, type LeadStatus, type LeadPriority } from "@/types";

export default function AdminTrashPage() {
  const { user } = useAuth();
  const { employees } = useEmployees(Boolean(user?.role === "admin" || user?.role === "super_admin"));
  const [deletedClients, setDeletedClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Single-item dialogs
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Multi-select
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Bulk dialogs
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkTransferOpen, setBulkTransferOpen] = useState(false);
  const [bulkTransferUid, setBulkTransferUid] = useState("");
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<LeadPriority | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [deletedFrom, setDeletedFrom] = useState("");
  const [deletedTo, setDeletedTo] = useState("");

  // Pagination
  const PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    return subscribeDeletedClients(user, (items) => {
      setDeletedClients(items);
      setLoading(false);
    });
  }, [user]);

  // Compute unique owner names for filter dropdown
  const uniqueOwners = useMemo(() => {
    const names = new Set<string>();
    deletedClients.forEach((c) => {
      if (c.assignedUserName) names.add(c.assignedUserName);
      if (c.originalAssignedUserName) names.add(c.originalAssignedUserName);
    });
    return Array.from(names).sort();
  }, [deletedClients]);

  // Apply filters
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromDate = deletedFrom ? new Date(`${deletedFrom}T00:00:00`) : null;
    const toDate = deletedTo ? new Date(`${deletedTo}T23:59:59`) : null;

    return deletedClients.filter((c) => {
      if (statusFilter !== "all" && c.leadStatus !== statusFilter) return false;
      if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
      if (ownerFilter !== "all") {
        const ownerName = c.originalAssignedUserName || c.assignedUserName;
        if (ownerName !== ownerFilter) return false;
      }
      if (fromDate || toDate) {
        const dd = c.deletedAt?.toDate?.();
        if (!dd) return false;
        if (fromDate && dd < fromDate) return false;
        if (toDate && dd > toDate) return false;
      }
      if (term) {
        const haystack = [c.fullName, c.primaryMobile, c.email, c.assignedUserName, c.originalAssignedUserName, c.deletedByName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [deletedClients, search, statusFilter, priorityFilter, ownerFilter, deletedFrom, deletedTo]);

  const hasActiveFilters = search || statusFilter !== "all" || priorityFilter !== "all" || ownerFilter !== "all" || deletedFrom || deletedTo;

  // Pagination derived values — reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, priorityFilter, ownerFilter, deletedFrom, deletedTo]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setOwnerFilter("all");
    setDeletedFrom("");
    setDeletedTo("");
  }

  // Selection helpers
  // "Select all" acts on the current page only
  const allSelected = paginated.length > 0 && paginated.every((c) => selected.has(c.clientId));

  function toggleAll() {
    if (allSelected) {
      // Deselect only the current page
      setSelected((prev) => {
        const next = new Set(prev);
        paginated.forEach((c) => next.delete(c.clientId));
        return next;
      });
    } else {
      // Add current page to selection
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

  // Single actions
  async function handleRestore(client: Client) {
    if (!user) return;
    setActioningId(client.clientId);
    try {
      // If the original employee no longer exists, restore as orphan so it
      // surfaces on the Orphan Leads page rather than vanishing into the main list.
      const activeUids = new Set(employees.filter((e) => e.status === "active").map((e) => e.uid));
      const isOrphan = client.isOrphan === true || !activeUids.has(client.assignedUserId);
      await restoreClient(client.clientId, client.fullName, user, isOrphan);
      if (isOrphan) {
        toast.success(`Restored ${client.fullName} → moved to Orphan Leads (employee was deleted).`);
      } else {
        toast.success(`Restored client ${client.fullName}`);
      }
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
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(selectedClient.clientId);
        return next;
      });
    } catch {
      toast.error(`Failed to permanently delete client.`);
    } finally {
      setActioningId(null);
    }
  }

  // Bulk actions
  async function handleBulkRestore() {
    if (!user || selected.size === 0) return;
    setBulkActionLoading(true);
    try {
      // Determine which selected leads have a missing employee
      const activeUids = new Set(employees.filter((e) => e.status === "active").map((e) => e.uid));
      const selectedClients = deletedClients.filter((c) => selected.has(c.clientId));
      const orphanIds = new Set(
        selectedClients
          .filter((c) => c.isOrphan === true || !activeUids.has(c.assignedUserId))
          .map((c) => c.clientId),
      );
      await bulkRestoreClients(Array.from(selected), user, orphanIds);
      const orphanCount = orphanIds.size;
      if (orphanCount > 0) {
        toast.success(
          `Restored ${selected.size} client(s). ${orphanCount} moved to Orphan Leads (employee deleted).`,
        );
      } else {
        toast.success(`Restored ${selected.size} client(s).`);
      }
      setSelected(new Set());
    } catch {
      toast.error("Failed to restore clients.");
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkPermanentDelete() {
    if (!user || selected.size === 0) return;
    setBulkActionLoading(true);
    try {
      await bulkPermanentDeleteClients(Array.from(selected), user);
      toast.success(`Permanently deleted ${selected.size} client(s).`);
      setSelected(new Set());
      setBulkDeleteOpen(false);
    } catch {
      toast.error("Failed to permanently delete clients.");
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkTransfer() {
    if (!user || !bulkTransferUid || selected.size === 0) return;
    const emp = employees.find((e) => e.uid === bulkTransferUid);
    if (!emp) return;

    setBulkActionLoading(true);
    try {
      await bulkTransferAndRestore(Array.from(selected), emp.uid, emp.fullName, user, true);
      toast.success(`Transferred & restored ${selected.size} lead(s) to ${emp.fullName}`);
      setSelected(new Set());
      setBulkTransferOpen(false);
      setBulkTransferUid("");
    } catch {
      toast.error("Failed to transfer leads.");
    } finally {
      setBulkActionLoading(false);
    }
  }

  if (!user) return null;

  const isSuperAdmin = user.role === "super_admin";

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

      <div className="p-4 lg:p-8 space-y-4">
        {/* Search & Toolbar */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
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

            {/* Filter toggle */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1.5"
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 rounded-full bg-accent/20 text-accent text-[10px] px-1.5 py-0.5 font-bold">
                  ON
                </span>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs gap-1">
                <X className="h-3 w-3" />
                Clear filters
              </Button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-lg border border-border bg-surface/50">
              <div className="space-y-1.5">
                <Label className="text-xs">Lead Status</Label>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}>
                  <option value="all">All Statuses</option>
                  {leadStatuses.map((s) => (
                    <option key={s} value={s}>{leadStatusLabels[s]}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as LeadPriority | "all")}>
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Owner</Label>
                <Select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                  <option value="all">All Owners</option>
                  {uniqueOwners.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Deleted Date Range</Label>
                <div className="flex items-center gap-2">
                  <DatePicker value={deletedFrom} onChange={setDeletedFrom} placeholder="From" />
                  <span className="text-muted-foreground text-xs">to</span>
                  <DatePicker value={deletedTo} onChange={setDeletedTo} placeholder="To" />
                </div>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg border border-accent/20 bg-accent/5">
              <Badge variant="secondary" className="font-medium">
                {selected.size} selected
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleBulkRestore}
                disabled={bulkActionLoading}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore Selected
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setBulkTransferOpen(true)}
                disabled={bulkActionLoading}
                className="gap-1.5"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Transfer & Restore
              </Button>
              {isSuperAdmin && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={bulkActionLoading}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Permanently
                </Button>
              )}
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
                <TableHead>Contact Info</TableHead>
                <TableHead>{isSuperAdmin ? "Owner / Deleted By" : "Owned By"}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Deleted Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground text-sm">
                    Loading trash bin...
                  </TableCell>
                </TableRow>
              ) : !filtered.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                    {hasActiveFilters ? "No results match your filters." : "Trash bin is empty."}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((client) => {
                  const deletedDateStr = client.deletedAt?.toDate
                    ? format(client.deletedAt.toDate(), "dd MMM yyyy, hh:mm a")
                    : "-";
                  const ownerName = client.originalAssignedUserName || client.assignedUserName;
                  const isOrphan = client.isOrphan === true;

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
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {client.fullName}
                          {isOrphan && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Owner was deleted without reassignment">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Orphan
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div>{client.primaryMobile}</div>
                          {client.email && <div className="text-muted-foreground">{client.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {isOrphan ? (
                            <span className="line-through text-muted-foreground">{ownerName}</span>
                          ) : (
                            ownerName
                          )}
                          {isOrphan && (
                            <span className="text-[10px] text-danger font-medium ml-1">(Deleted)</span>
                          )}
                        </div>
                        {isSuperAdmin && client.deletedByName && (
                          <div className="text-xs text-danger font-medium mt-0.5">
                            Deleted by: {client.deletedByName}
                          </div>
                        )}
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
                      <TableCell className="text-xs text-muted-foreground">{deletedDateStr}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actioningId !== null || bulkActionLoading}
                            onClick={() => handleRestore(client)}
                            className="h-8 px-2.5 text-accent hover:bg-accent/10 hover:text-accent flex items-center gap-1 text-xs"
                            title="Restore Lead"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </Button>

                          {isSuperAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={actioningId !== null || bulkActionLoading}
                                onClick={() => {
                                  setSelected(new Set([client.clientId]));
                                  setBulkTransferOpen(true);
                                }}
                                className="h-8 px-2.5 text-foreground hover:bg-muted/20 flex items-center gap-1 text-xs"
                                title="Transfer & Restore"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                Transfer
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={actioningId !== null || bulkActionLoading}
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
                            </>
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

        {/* Pagination bar */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} lead(s)
              {hasActiveFilters && " (filtered)"}
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

      {/* Single permanent delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}
        title="Permanently Delete Lead?"
        footer={
          <div className="flex justify-end gap-2">
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
        }
      >
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-danger shrink-0 mt-0.5" />
          <p className="text-sm">
            Are you absolutely sure you want to permanently delete <strong>{selectedClient?.fullName}</strong>?
            This action cannot be undone and will permanently wipe their data from the database.
          </p>
        </div>
      </Dialog>

      {/* Bulk permanent delete confirmation */}
      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Permanently Delete ${selected.size} Lead(s)?`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBulkDeleteOpen(false)} disabled={bulkActionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkPermanentDelete} disabled={bulkActionLoading}>
              {bulkActionLoading ? "Deleting…" : `Delete ${selected.size} permanently`}
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-danger shrink-0 mt-0.5" />
          <p className="text-sm">
            You are about to permanently delete <strong>{selected.size} lead(s)</strong>. This action cannot be undone.
          </p>
        </div>
      </Dialog>

      {/* Bulk transfer & restore modal */}
      <Dialog
        open={bulkTransferOpen}
        onOpenChange={(open) => {
          setBulkTransferOpen(open);
          if (!open) setBulkTransferUid("");
        }}
        title="Transfer & Restore Leads"
        description={`Reassign ${selected.size} lead(s) to an active employee and restore them from trash.`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setBulkTransferOpen(false);
                setBulkTransferUid("");
              }}
              disabled={bulkActionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkTransfer} disabled={!bulkTransferUid || bulkActionLoading}>
              {bulkActionLoading ? "Transferring…" : "Transfer & Restore"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-2">
          <Label>Transfer to:</Label>
          <Select
            value={bulkTransferUid}
            onChange={(e) => setBulkTransferUid(e.target.value)}
            disabled={bulkActionLoading}
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
    </>
  );
}
