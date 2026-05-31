"use client";

import {
  format,
  isBefore,
  isToday,
  startOfToday,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import Link from "next/link";
import { CalendarDays, Clock, CheckCircle2, AlertCircle, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TopBar } from "@/components/layout/TopBar";
import { useMyFollowUps } from "@/hooks/useFollowUps";
import { useAuth } from "@/lib/auth-context";
import { leadStatusLabels, type FollowUp } from "@/types";
import { cn } from "@/lib/utils";

// ─── Group helpers ─────────────────────────────────────────────
type FollowUpGroup = {
  label: string;
  icon: React.ReactNode;
  colour: string;
  items: FollowUp[];
};

function buildGroups(followUps: FollowUp[]): FollowUpGroup[] {
  const todayStart = startOfToday();

  const overdue: FollowUp[] = [];
  const today: FollowUp[] = [];
  const upcoming: FollowUp[] = [];

  for (const fu of followUps) {
    const date = fu.nextFollowUpDate?.toDate?.();
    if (!date) continue;
    if (isToday(date)) {
      today.push(fu);
    } else if (isBefore(date, todayStart)) {
      overdue.push(fu);
    } else {
      upcoming.push(fu);
    }
  }

  return [
    {
      label: "Overdue",
      icon: <AlertCircle className="h-4 w-4" />,
      colour: "text-red-400",
      items: overdue,
    },
    {
      label: "Today",
      icon: <Clock className="h-4 w-4" />,
      colour: "text-amber-400",
      items: today,
    },
    {
      label: "Upcoming",
      icon: <CheckCircle2 className="h-4 w-4" />,
      colour: "text-emerald-400",
      items: upcoming,
    },
  ];
}

// ─── Row variant helpers ───────────────────────────────────────
function rowBg(fu: FollowUp): string {
  const date = fu.nextFollowUpDate?.toDate?.();
  if (!date) return "";
  const todayStart = startOfToday();
  if (isToday(date)) return "bg-amber-500/5 border-l-2 border-amber-500/50";
  if (isBefore(date, todayStart)) return "bg-red-500/5 border-l-2 border-red-500/40";
  return "";
}

// ─── Single follow-up card row ─────────────────────────────────
function FollowUpRow({ fu }: { fu: FollowUp }) {
  const date = fu.nextFollowUpDate?.toDate?.();
  const todayStart = startOfToday();
  const isOverdue = date ? isBefore(date, todayStart) && !isToday(date) : false;
  const isTodayDue = date ? isToday(date) : false;

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg px-4 py-3 transition-colors duration-150 hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4",
        rowBg(fu),
      )}
    >
      {/* Client name */}
      <div className="min-w-0 flex-1">
        <Link
          href={`/dashboard/clients/${fu.clientId}`}
          className="truncate text-sm font-semibold text-foreground hover:text-accent transition-colors"
        >
          {fu.clientName}
        </Link>
        {fu.note && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{fu.note}</p>
        )}
      </div>

      {/* Status */}
      <Badge
        variant={
          fu.status === "closed"
            ? "default"
            : fu.status === "not_interested"
              ? "danger"
              : fu.status === "negotiation" || fu.status === "site_visit_scheduled"
                ? "warning"
                : "secondary"
        }
        className="w-fit shrink-0 text-[10px]"
      >
        {leadStatusLabels[fu.status]}
      </Badge>

      {/* Date chip */}
      {date && (
        <div
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
            isOverdue
              ? "bg-red-500/10 text-red-300"
              : isTodayDue
                ? "bg-amber-500/10 text-amber-300"
                : "bg-emerald-500/10 text-emerald-300",
          )}
        >
          <CalendarDays className="h-3 w-3" />
          {format(date, "EEE, dd MMM")}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────
export default function FollowUpsPage() {
  const { user } = useAuth();
  const { thisWeekFollowUps, loading } = useMyFollowUps(user);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`;

  const groups = buildGroups(thisWeekFollowUps);
  const totalCount = thisWeekFollowUps.length;

  return (
    <>
      <TopBar
        title="Follow-ups"
        description="Your follow-ups for the current week."
        mode="employee"
      />

      <div className="p-4 lg:p-8">
        {/* Week header card */}
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-accent" />
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Current Week
              </p>
              <h2 className="text-xl font-bold text-foreground">{weekLabel}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
              {totalCount} follow-up{totalCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Empty state */}
        {!loading && totalCount === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-2">
                <Inbox className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">No follow-ups this week</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You&apos;re all caught up! Check the Clients page to schedule new follow-ups.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grouped sections */}
        {groups.map((group) => {
          if (group.items.length === 0) return null;
          return (
            <div key={group.label} className="mb-6">
              {/* Group header */}
              <div className={cn("mb-2 flex items-center gap-2 text-sm font-semibold", group.colour)}>
                {group.icon}
                <span>{group.label}</span>
                <span className="ml-1 rounded-full bg-surface-2 px-2 py-0 text-xs text-muted-foreground">
                  {group.items.length}
                </span>
              </div>

              {/* Rows */}
              <Card>
                <CardContent className="p-2">
                  <div className="flex flex-col">
                    {group.items.map((fu) => (
                      <FollowUpRow key={fu.followupId} fu={fu} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </>
  );
}
