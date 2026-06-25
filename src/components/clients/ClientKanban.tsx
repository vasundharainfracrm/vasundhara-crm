"use client";

import { format } from "date-fns";
import Link from "next/link";
import { Eye, CalendarDays, User2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import {
  leadStatuses,
  leadStatusLabels,
  priorityLabels,
  type AppUser,
  type Client,
  type LeadStatus,
} from "@/types";
import type { ClientFilters } from "@/hooks/useClients";

// ─── Status accent stripe — only 4 semantic colours, using CSS vars ───────────
// All columns share the same card/bg/border, only this left-border accent changes.
const statusAccent: Record<LeadStatus, string> = {
  new_lead:              "border-l-[var(--muted-foreground)]",
  contacted:             "border-l-[var(--muted-foreground)]",
  interested:            "border-l-[var(--accent)]",
  site_visit_scheduled:  "border-l-[var(--warning)]",
  negotiation:           "border-l-[var(--warning)]",
  closed:                "border-l-[var(--accent)]",
  not_interested:        "border-l-[var(--danger)]",
};

function priorityVariant(priority: Client["priority"]) {
  if (priority === "high") return "danger";
  if (priority === "medium") return "warning";
  return "secondary";
}

// ─── Single Lead Card ──────────────────────────────────────────
function LeadCard({
  client,
  basePath,
  status,
}: {
  client: Client;
  basePath: string;
  status: LeadStatus;
}) {
  const followUpDate = client.followUpDate?.toDate?.();
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const isOverdue =
    followUpDate && client.leadStatus !== "closed" && client.leadStatus !== "not_interested"
      ? followUpDate < todayStart
      : false;

  return (
    <div
      className={cn(
        // base card
        "group relative flex flex-col gap-2 rounded-lg border border-border",
        "bg-background p-3 transition-all duration-150 select-none",
        // consistent left accent stripe
        "border-l-2",
        statusAccent[status],
        // hover lift
        "hover:shadow-md hover:shadow-black/10 hover:-translate-y-px",
      )}
    >
      {/* Name + budget */}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground leading-tight">
          {client.fullName}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatCurrency(client.budget)}
        </p>
      </div>

      {/* City */}
      {client.city && (
        <p className="text-xs text-muted-foreground truncate">{client.city}</p>
      )}

      {/* Priority + property */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant={priorityVariant(client.priority)}
          className="text-[10px] px-1.5 py-0"
        >
          {priorityLabels[client.priority]}
        </Badge>
        {client.propertyType && (
          <span className="rounded border border-border px-1.5 py-0 text-[10px] text-muted-foreground">
            {client.propertyType}
          </span>
        )}
      </div>

      {/* Follow-up date */}
      {followUpDate && (
        <div
          className={cn(
            "flex items-center gap-1 text-[11px]",
            isOverdue ? "text-danger" : "text-muted-foreground",
          )}
        >
          <CalendarDays className="h-3 w-3 shrink-0" />
          <span>{format(followUpDate, "dd MMM yyyy")}</span>
          {isOverdue && (
            <span className="ml-0.5 font-medium text-danger">(overdue)</span>
          )}
        </div>
      )}

      {/* Assigned user */}
      {client.assignedUserName && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <User2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{client.assignedUserName}</span>
        </div>
      )}

      {/* View link — appears on hover */}
      <Link
        href={`${basePath}/${client.clientId}`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "mt-1 h-7 w-full justify-center text-xs",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
        )}
      >
        <Eye className="h-3 w-3" />
        View
      </Link>
    </div>
  );
}

// ─── Column ────────────────────────────────────────────────────
function KanbanColumn({
  status,
  clients,
  basePath,
}: {
  status: LeadStatus;
  clients: Client[];
  basePath: string;
}) {
  return (
    <div className="flex w-[270px] shrink-0 flex-col">
      {/* Column header — same look for all stages */}
      <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-border bg-surface px-3 py-2.5">
        <span className="text-xs font-semibold text-foreground tracking-wide">
          {leadStatusLabels[status]}
        </span>
        {/* Plain count — no circle, just a bold number */}
        <span className="ml-auto text-sm font-bold tabular-nums text-foreground">
          {clients.length}
        </span>
      </div>

      {/* Cards list */}
      <div
        className={cn(
          "flex flex-1 flex-col gap-2 overflow-y-auto rounded-b-xl border border-border bg-surface/40 p-2",
          "max-h-[calc(100vh-280px)] min-h-[140px]",
        )}
      >
        {clients.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-10 text-center">
            <span className="text-xs text-muted-foreground/50">No leads</span>
          </div>
        ) : (
          clients.map((client) => (
            <LeadCard
              key={client.clientId}
              client={client}
              basePath={basePath}
              status={status}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────
type ClientKanbanProps = {
  clients: Client[];
  user: AppUser;
  filters: ClientFilters;
  setSearch: (v: string) => void;
  setStatus: (v: LeadStatus | "all") => void;
  setPriority: (v: import("@/types").LeadPriority | "all") => void;
  setLeadSource: (v: import("@/types").LeadSource | "all") => void;
  setPropertyType: (v: string) => void;
  setAssignedUserId: (v: string) => void;
  setBudgetMin: (v: string) => void;
  setBudgetMax: (v: string) => void;
  setFollowUpFrom: (v: string) => void;
  setFollowUpTo: (v: string) => void;
  resetFilters: () => void;
  allEmployees?: AppUser[];
};

// ─── Main Board ────────────────────────────────────────────────
export function ClientKanban({ clients, user }: ClientKanbanProps) {
  const basePath =
    user.role === "admin" || user.role === "super_admin"
      ? "/admin/clients"
      : "/dashboard/clients";

  // Group clients by leadStatus
  const grouped = useMemo(() => {
    const map = Object.fromEntries(
      leadStatuses.map((s) => [s, [] as Client[]]),
    ) as Record<LeadStatus, Client[]>;
    for (const client of clients) {
      if (map[client.leadStatus]) {
        map[client.leadStatus].push(client);
      }
    }
    return map;
  }, [clients]);

  // ── Drag-to-scroll ──────────────────────────────────────────
  const boardRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const [grabbing, setGrabbing] = useState(false);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only activate on the board background, not on card links/buttons
    if ((e.target as HTMLElement).closest("a, button")) return;
    isDragging.current = true;
    startX.current = e.pageX - (boardRef.current?.offsetLeft ?? 0);
    scrollLeft.current = boardRef.current?.scrollLeft ?? 0;
    setGrabbing(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    isDragging.current = false;
    setGrabbing(false);
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    setGrabbing(false);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !boardRef.current) return;
    e.preventDefault();
    const x = e.pageX - boardRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.2; // 1.2× multiplier for snappier feel
    boardRef.current.scrollLeft = scrollLeft.current - walk;
  }, []);

  return (
    <div className="w-full">
      {/* Summary */}
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{clients.length}</span>
        <span>leads across</span>
        <span className="font-medium text-foreground">
          {leadStatuses.filter((s) => grouped[s].length > 0).length}
        </span>
        <span>stages</span>
        <span className="ml-2 rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground/70">
          drag to scroll
        </span>
      </div>

      {/* Board — drag-to-scroll container */}
      <div
        ref={boardRef}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        className={cn(
          "flex gap-3 overflow-x-auto pb-4 rounded-xl",
          // Smooth scroll for non-drag navigation
          "scroll-smooth",
          // Scrollbar — uses border token so it's light grey in light mode, dark in dark mode
          "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full",
          "[&::-webkit-scrollbar-thumb]:bg-border/80 [&::-webkit-scrollbar-track]:bg-transparent",
          grabbing ? "cursor-grabbing" : "cursor-grab",
          // Disable text selection while dragging
          grabbing && "select-none",
        )}
        style={{ userSelect: grabbing ? "none" : undefined }}
      >
        {leadStatuses.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            clients={grouped[status]}
            basePath={basePath}
          />
        ))}
        {/* Small right padding so last column doesn't clip */}
        <div className="w-2 shrink-0" aria-hidden />
      </div>
    </div>
  );
}
