"use client";

import { format, isBefore, isToday, startOfToday } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Inbox,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TopBar } from "@/components/layout/TopBar";
import { subscribeAllFollowUpClients } from "@/services/adminFollowups";
import { leadStatusLabels, type Client } from "@/types";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type DateFilter = "overdue" | "today" | "upcoming" | "all";

// ─── Helpers ───────────────────────────────────────────────────────────────

function getUrgency(client: Client): "overdue" | "today" | "upcoming" {
  const date = (client.followUpDate as unknown as { toDate?: () => Date })?.toDate?.();
  if (!date) return "upcoming";
  const todayStart = startOfToday();
  if (isToday(date)) return "today";
  if (isBefore(date, todayStart)) return "overdue";
  return "upcoming";
}

// ─── Stat card ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  colour,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  colour: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition-all",
        active
          ? "border-accent bg-accent/10"
          : "border-border bg-surface hover:border-accent/40 hover:bg-surface-2",
      )}
    >
      <div className={cn("flex items-center gap-2 text-sm font-medium", colour)}>
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-3xl font-bold text-foreground">{value}</span>
    </button>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminFollowUpsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");

  useEffect(() => {
    return subscribeAllFollowUpClients((data) => {
      setClients(data);
      setLoading(false);
    });
  }, []);

  // ── Derived stats ────────────────────────────────────────────
  const stats = useMemo(() => {
    let overdue = 0, today = 0, upcoming = 0;
    for (const c of clients) {
      const u = getUrgency(c);
      if (u === "overdue") overdue++;
      else if (u === "today") today++;
      else upcoming++;
    }
    return { overdue, today, upcoming };
  }, [clients]);

  // ── Employee list for dropdown ───────────────────────────────
  const employees = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients) {
      if (c.assignedUserId) map.set(c.assignedUserId, c.assignedUserName || c.assignedUserId);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [clients]);

  // ── Employee breakdown ───────────────────────────────────────
  const employeeBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; overdue: number; today: number; upcoming: number }>();
    for (const c of clients) {
      const id = c.assignedUserId || "unassigned";
      const name = c.assignedUserName || "Unassigned";
      if (!map.has(id)) map.set(id, { name, overdue: 0, today: 0, upcoming: 0 });
      const entry = map.get(id)!;
      const u = getUrgency(c);
      entry[u]++;
    }
    return Array.from(map.values()).sort((a, b) => b.overdue - a.overdue);
  }, [clients]);

  // ── Filtered table rows ──────────────────────────────────────
  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (employeeFilter !== "all" && c.assignedUserId !== employeeFilter) return false;
      if (dateFilter !== "all" && getUrgency(c) !== dateFilter) return false;
      return true;
    });
  }, [clients, dateFilter, employeeFilter]);

  return (
    <>
      <TopBar
        title="Follow-up Monitor"
        description="Track follow-up activity across all employees and leads."
        mode="admin"
      />

      <div className="space-y-6 p-4 lg:p-8">
        {/* ── Stat cards ─────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Overdue"
            value={stats.overdue}
            icon={<AlertCircle className="h-4 w-4" />}
            colour="text-red-400"
            active={dateFilter === "overdue"}
            onClick={() => setDateFilter(dateFilter === "overdue" ? "all" : "overdue")}
          />
          <StatCard
            label="Due Today"
            value={stats.today}
            icon={<Clock className="h-4 w-4" />}
            colour="text-accent"
            active={dateFilter === "today"}
            onClick={() => setDateFilter(dateFilter === "today" ? "all" : "today")}
          />
          <StatCard
            label="Upcoming"
            value={stats.upcoming}
            icon={<CheckCircle2 className="h-4 w-4" />}
            colour="text-emerald-400"
            active={dateFilter === "upcoming"}
            onClick={() => setDateFilter(dateFilter === "upcoming" ? "all" : "upcoming")}
          />
        </div>

        {/* ── Employee breakdown ──────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-accent" />
              Employee Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-red-400">Overdue</TableHead>
                  <TableHead className="text-accent">Today</TableHead>
                  <TableHead className="text-emerald-400">Upcoming</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeBreakdown.map((emp) => (
                  <TableRow
                    key={emp.name}
                    className="cursor-pointer"
                    onClick={() => {
                      const found = employees.find((e) => e.name === emp.name);
                      setEmployeeFilter(found?.id === employeeFilter ? "all" : found?.id ?? "all");
                    }}
                  >
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>
                      {emp.overdue > 0 ? (
                        <span className="font-semibold text-red-400">{emp.overdue}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {emp.today > 0 ? (
                        <span className="font-semibold text-accent">{emp.today}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-emerald-400">{emp.upcoming}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {emp.overdue + emp.today + emp.upcoming}
                    </TableCell>
                  </TableRow>
                ))}
                {employeeBreakdown.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No follow-up data yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── All follow-ups table ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-accent" />
                All Follow-ups
                <span className="ml-1 rounded-full bg-surface-2 px-2 py-0 text-xs font-normal text-muted-foreground">
                  {filtered.length}
                </span>
              </CardTitle>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="h-8 w-[160px] text-xs"
                >
                  <option value="all">All Employees</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </Select>
                <Select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  className="h-8 w-[140px] text-xs"
                >
                  <option value="all">All Dates</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Today</option>
                  <option value="upcoming">Upcoming</option>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {!loading && filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-2">
                  <Inbox className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No follow-ups match the selected filters.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Follow-up Date</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => {
                    const date = (c.followUpDate as unknown as { toDate?: () => Date })?.toDate?.();
                    const urgency = getUrgency(c);
                    return (
                      <TableRow key={c.clientId}>
                        <TableCell>
                          <Link
                            href={`/admin/clients/${c.clientId}`}
                            className="font-medium text-foreground transition-colors hover:text-accent"
                          >
                            {c.fullName}
                          </Link>
                          <p className="text-xs text-muted-foreground">{c.city}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.assignedUserName || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              c.leadStatus === "closed" ? "default"
                                : c.leadStatus === "not_interested" ? "danger"
                                  : c.leadStatus === "negotiation" || c.leadStatus === "site_visit_scheduled" ? "warning"
                                    : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {leadStatusLabels[c.leadStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {date ? (
                            <Badge
                              variant={urgency === "overdue" ? "danger" : urgency === "today" ? "default" : "outline"}
                              className="text-[10px]"
                            >
                              <CalendarDays className="mr-1 h-3 w-3" />
                              {format(date, "dd MMM yyyy")}
                              {urgency === "overdue" && " · Overdue"}
                              {urgency === "today" && " · Today"}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              c.priority === "high" ? "danger"
                                : c.priority === "medium" ? "warning"
                                  : "outline"
                            }
                            className="text-[10px] capitalize"
                          >
                            {c.priority}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
