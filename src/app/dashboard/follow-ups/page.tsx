"use client";

import {
  format,
  isBefore,
  isToday,
  startOfToday,
} from "date-fns";
import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Inbox,
  MessageSquarePlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { TopBar } from "@/components/layout/TopBar";
import { useMyFollowUps } from "@/hooks/useFollowUps";
import { useAuth } from "@/lib/auth-context";
import { followUpSchema } from "@/lib/validation";
import { createFollowUp } from "@/services/followups";
import { subscribeClient } from "@/services/clients";
import { leadStatusLabels, type Client, type FollowUp } from "@/types";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

// ─── Helpers ───────────────────────────────────────────────────────────────

type Group = {
  label: string;
  icon: React.ReactNode;
  colour: string;
  items: FollowUp[];
};

function buildGroups(followUps: FollowUp[]): Group[] {
  const todayStart = startOfToday();
  const overdue: FollowUp[] = [];
  const today: FollowUp[] = [];
  const upcoming: FollowUp[] = [];

  for (const fu of followUps) {
    const date = fu.nextFollowUpDate?.toDate?.();
    if (!date) continue;
    if (isToday(date)) today.push(fu);
    else if (isBefore(date, todayStart)) overdue.push(fu);
    else upcoming.push(fu);
  }

  return [
    { label: "Overdue", icon: <AlertCircle className="h-4 w-4" />, colour: "text-red-400", items: overdue },
    { label: "Today", icon: <Clock className="h-4 w-4" />, colour: "text-accent", items: today },
    { label: "Upcoming", icon: <CheckCircle2 className="h-4 w-4" />, colour: "text-emerald-400", items: upcoming },
  ];
}

const priorityBadge: Record<string, { label: string; variant: "danger" | "warning" | "outline" }> = {
  high: { label: "High", variant: "danger" },
  medium: { label: "Medium", variant: "warning" },
  low: { label: "Low", variant: "outline" },
};

// ─── Log-interaction slide panel ───────────────────────────────────────────

type LogValues = { note: string; nextFollowUpDate: string };

function LogPanel({
  fu,
  onClose,
}: {
  fu: FollowUp;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    return subscribeClient(fu.clientId, setClient);
  }, [fu.clientId]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogValues>({
    resolver: zodResolver(followUpSchema),
    defaultValues: { note: "", nextFollowUpDate: "" },
  });

  async function onSubmit(values: LogValues) {
    if (!user || !client) return;
    try {
      await createFollowUp(values, client, user);
      toast.success("Follow-up logged.");
      reset();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log follow-up.");
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-40 flex items-end justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Dimmed overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Panel */}
      <aside className="relative z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Log Interaction</p>
            <h2 className="mt-0.5 text-base font-semibold text-foreground">{fu.clientName}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <Field label="What happened? (note)" error={errors.note?.message}>
            <Textarea
              {...register("note")}
              placeholder="e.g. Called client, interested in 3BHK. Follow-up scheduled."
              rows={4}
            />
          </Field>

          <Field label="Next follow-up date" error={errors.nextFollowUpDate?.message}>
            <Controller
              control={control}
              name="nextFollowUpDate"
              render={({ field }) => (
                <DatePicker value={field.value} onChange={field.onChange} placeholder="Select date" />
              )}
            />
          </Field>

          <div className="mt-auto flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Saving…" : "Save & update date"}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}

// ─── Single follow-up row ───────────────────────────────────────────────────

function FollowUpRow({
  fu,
  onLog,
}: {
  fu: FollowUp;
  onLog: (fu: FollowUp) => void;
}) {
  const date = fu.nextFollowUpDate?.toDate?.();
  const todayStart = startOfToday();
  const isOverdue = date && fu.status !== "closed" && fu.status !== "not_interested"
    ? isBefore(date, todayStart) && !isToday(date)
    : false;
  const isTodayDue = date ? isToday(date) : false;
  const pri = fu.priority ? priorityBadge[fu.priority] : null;

  return (
    <div className="group flex flex-col gap-2 rounded-lg px-4 py-3 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4">
      {/* Lead name → navigates to detail */}
      <Link
        href={`/dashboard/clients/${fu.clientId}`}
        className="min-w-0 flex-1"
      >
        <span className="block truncate text-sm font-semibold text-foreground transition-colors group-hover:text-accent">
          {fu.clientName}
        </span>
        {fu.note && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{fu.note}</p>
        )}
      </Link>

      {/* Badges */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {/* Lead status */}
        <Badge
          variant={fu.status as any}
          className="text-[10px]"
        >
          {leadStatusLabels[fu.status]}
        </Badge>

        {/* Priority */}
        {pri && (
          <Badge variant={pri.variant} className="text-[10px]">
            {pri.label}
          </Badge>
        )}

        {/* Date */}
        {date && (
          <Badge
            variant={isOverdue ? "danger" : isTodayDue ? "default" : "outline"}
            className="text-[10px]"
          >
            <CalendarDays className="mr-1 h-3 w-3" />
            {format(date, "EEE, dd MMM")}
          </Badge>
        )}

        {/* Log quick action */}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => { e.preventDefault(); onLog(fu); }}
          title="Log interaction"
        >
          <MessageSquarePlus className="mr-1 h-3.5 w-3.5" />
          Log
        </Button>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function FollowUpsPage() {
  const { user } = useAuth();
  const { thisWeekFollowUps, stats, loading } = useMyFollowUps(user);
  const [activePanel, setActivePanel] = useState<FollowUp | null>(null);

  const groups = buildGroups(thisWeekFollowUps);
  const totalCount = thisWeekFollowUps.length;

  return (
    <>
      <TopBar
        title="My Follow-ups"
        description="Leads requiring your attention — overdue and due this week."
        mode="employee"
      />

      <div className="p-4 lg:p-8">
        {/* ── Stat pills header ──────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {stats.overdue > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
              <AlertCircle className="h-3.5 w-3.5" />
              {stats.overdue} Overdue
            </span>
          )}
          {stats.today > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              <Clock className="h-3.5 w-3.5" />
              {stats.today} Today
            </span>
          )}
          {stats.upcoming > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {stats.upcoming} Upcoming
            </span>
          )}
          {totalCount > 0 && (
            <span className="ml-auto rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              {totalCount} total
            </span>
          )}
        </div>

        {/* ── Empty state ────────────────────────────────────────── */}
        {!loading && totalCount === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-2">
                <Inbox className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">All caught up!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No follow-ups due this week. Head to{" "}
                  <Link href="/dashboard/clients" className="text-accent underline-offset-4 hover:underline">
                    My Clients
                  </Link>{" "}
                  to schedule new ones.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Grouped sections ───────────────────────────────────── */}
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

              <Card>
                <CardContent className="p-2">
                  <div className="flex flex-col divide-y divide-border/50">
                    {group.items.map((fu) => (
                      <FollowUpRow
                        key={fu.followupId}
                        fu={fu}
                        onLog={setActivePanel}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* ── Slide panel ────────────────────────────────────────────── */}
      {activePanel && (
        <LogPanel fu={activePanel} onClose={() => setActivePanel(null)} />
      )}
    </>
  );
}
