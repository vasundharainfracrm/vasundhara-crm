"use client";

import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/dashboard/StatCard";
import { LeadStatusChart } from "@/components/dashboard/LeadStatusChart";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { useClients } from "@/hooks/useClients";
import { useAuth } from "@/lib/auth-context";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export default function DashboardPage() {
  const { user } = useAuth();
  const { clients, loading, limitCount, hasMore } = useClients(user);
  const { metrics } = useDashboardStats(user, clients, loading, limitCount, hasMore);

  return (
    <>
      <TopBar title="Dashboard" mode="employee" ctaHref="/dashboard/clients/new" ctaLabel="Add client" />
      <div className="space-y-6 p-4 lg:p-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="My Clients" value={metrics.total} helper="Owned by you" />
          <StatCard label="Active Leads" value={metrics.activeLeads} helper="Not closed or lost" />
          <StatCard label="Closed Deals" value={metrics.closedLeads} helper="Status: closed" />
          <StatCard label="Today's Follow-ups" value={metrics.todayFollowUps} helper="Due today" />
          <StatCard label="Overdue Follow-ups" value={metrics.overdueFollowUps} helper="Needs attention" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <LeadStatusChart clients={clients} />
          <RecentActivityFeed clients={clients} />
        </div>
      </div>
    </>
  );
}
