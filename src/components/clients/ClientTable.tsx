"use client";

import { format } from "date-fns";
import Link from "next/link";
import { ArrowUpDown, Download, Eye, Filter, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";
import { exportClientsCSV } from "@/lib/export";
import {
  leadStatusLabels,
  leadSources,
  priorityLabels,
  propertyTypes,
  type AppUser,
  type Client,
  type LeadPriority,
  type LeadSource,
  type LeadStatus,
} from "@/types";
import type { ClientFilters } from "@/hooks/useClients";

function statusVariant(status: Client["leadStatus"]) {
  if (status === "closed") return "default";
  if (status === "not_interested") return "danger";
  if (status === "negotiation" || status === "site_visit_scheduled") return "warning";
  return "secondary";
}

type ClientTableProps = {
  clients: Client[];
  user: AppUser;
  allEmployees?: AppUser[];
  filters: ClientFilters;
  setSearch: (v: string) => void;
  setStatus: (v: LeadStatus | "all") => void;
  setPriority: (v: LeadPriority | "all") => void;
  setLeadSource: (v: LeadSource | "all") => void;
  setPropertyType: (v: string) => void;
  setAssignedUserId: (v: string) => void;
  setBudgetMin: (v: string) => void;
  setBudgetMax: (v: string) => void;
  setFollowUpFrom: (v: string) => void;
  setFollowUpTo: (v: string) => void;
  resetFilters: () => void;
  loadMore?: () => void;
  hasMore?: boolean;
  /** When true, only the filter bar is rendered (used inside the Kanban layout) */
  kanbanMode?: boolean;
};

export function ClientTable({
  clients,
  user,
  allEmployees = [],
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
  kanbanMode = false,
}: ClientTableProps) {
  const [sortAsc, setSortAsc] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const basePath = user.role === "admin" || user.role === "super_admin" ? "/admin/clients" : "/dashboard/clients";

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const left = a.followUpDate?.toMillis?.() || 0;
      const right = b.followUpDate?.toMillis?.() || 0;
      return sortAsc ? left - right : right - left;
    });
  }, [clients, sortAsc]);

  // Reset page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortAsc]);

  const totalRecords = sortedClients.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);

  const paginatedClients = useMemo(() => {
    return sortedClients.slice(startIndex, endIndex);
  }, [sortedClients, startIndex, endIndex]);

  const isAdmin = user.role === "admin" || user.role === "super_admin";

  // Check if any non-search filter is active
  const hasAdvancedFilter =
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.leadSource !== "all" ||
    filters.propertyType !== "all" ||
    filters.assignedUserId !== "all" ||
    !!filters.budgetMin ||
    !!filters.budgetMax ||
    !!filters.followUpFrom ||
    !!filters.followUpTo;

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3">
          {/* Top row: search + quick actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="max-w-xs"
              placeholder="Search name, mobile, city..."
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              variant={hasAdvancedFilter ? "default" : "secondary"}
              size="sm"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasAdvancedFilter && (
                <Badge variant="secondary" className="ml-1 rounded-full px-1.5 py-0 text-xs">
                  on
                </Badge>
              )}
            </Button>
            {hasAdvancedFilter && (
              <Button variant="ghost" size="sm" onClick={resetFilters} title="Clear all filters">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <CardTitle className="text-sm text-muted-foreground">
                {sortedClients.length} of {clients.length} records
              </CardTitle>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportClientsCSV(sortedClients)}
                title="Export visible clients as CSV"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Advanced filters panel */}
          {showAdvanced && (
            <div className="grid gap-3 rounded-lg border bg-surface/50 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* Lead Status */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={filters.status} onChange={(e) => setStatus(e.target.value as LeadStatus | "all")}>
                  <option value="all">All statuses</option>
                  {Object.entries(leadStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select value={filters.priority} onChange={(e) => setPriority(e.target.value as LeadPriority | "all")}>
                  <option value="all">All priorities</option>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>

              {/* Lead Source */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Lead Source</label>
                <Select value={filters.leadSource} onChange={(e) => setLeadSource(e.target.value as LeadSource | "all")}>
                  <option value="all">All sources</option>
                  {leadSources.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>

              {/* Property Type */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Property Type</label>
                <Select value={filters.propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                  <option value="all">All types</option>
                  {propertyTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>

              {/* Assigned Employee (admin only) */}
              {isAdmin && allEmployees.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Assigned To</label>
                  <Select value={filters.assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
                    <option value="all">All employees</option>
                    {allEmployees.filter((e) => e.status === "active").map((e) => (
                      <option key={e.uid} value={e.uid}>{e.fullName}</option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Budget range */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Budget Min (₹)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 500000"
                  value={filters.budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Budget Max (₹)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 5000000"
                  value={filters.budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                />
              </div>

              {/* Follow-up date range */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Follow-up From</label>
                <DatePicker value={filters.followUpFrom} onChange={setFollowUpFrom} placeholder="Select Date" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Follow-up To</label>
                <DatePicker value={filters.followUpTo} onChange={setFollowUpTo} placeholder="Select Date" />
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      {!kanbanMode && (
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => setSortAsc((v) => !v)}>
                    Follow-up
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                {isAdmin ? <TableHead>Owner</TableHead> : null}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.map((client) => (
                <TableRow key={client.clientId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{client.fullName}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(client.budget)}</p>
                    </div>
                  </TableCell>
                  <TableCell>{client.primaryMobile}</TableCell>
                  <TableCell>{client.city}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(client.leadStatus)}>{leadStatusLabels[client.leadStatus]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        client.priority === "high" ? "danger" : client.priority === "medium" ? "warning" : "secondary"
                      }
                    >
                      {priorityLabels[client.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {client.followUpDate?.toDate ? format(client.followUpDate.toDate(), "dd MMM yyyy") : "-"}
                  </TableCell>
                  {isAdmin ? <TableCell>{client.assignedUserName}</TableCell> : null}
                  <TableCell className="text-right">
                    <Link
                      href={`${basePath}/${client.clientId}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {!sortedClients.length ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="py-10 text-center text-muted-foreground">
                    No clients match the current filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
            {/* Left: pagination info */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                Showing {totalRecords === 0 ? 0 : startIndex + 1}–{endIndex} of {totalRecords} records
              </span>
              {hasMore && loadMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  className="h-8 text-xs font-semibold text-accent underline hover:bg-accent/5 hover:text-accent/80"
                >
                  Load more from server
                </Button>
              )}
            </div>

            {/* Right: navigation controls + page size selector */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Page size selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Rows per page:</span>
                <Select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 w-20 py-1 text-xs"
                >
                  {[25, 50, 100].map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  Previous
                </Button>
                <span className="text-xs font-medium text-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
