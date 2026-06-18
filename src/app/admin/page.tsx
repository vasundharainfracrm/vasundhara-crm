"use client";

import { LeadStatusChart } from "@/components/dashboard/LeadStatusChart";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { StatCard } from "@/components/dashboard/StatCard";
import { TopBar } from "@/components/layout/TopBar";
import { useClients } from "@/hooks/useClients";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/lib/auth-context";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { clients, loading, limitCount, hasMore } = useClients(user);
  const { metrics } = useDashboardStats(user, clients, loading, limitCount, hasMore);
  const { employees } = useEmployees(Boolean(user?.role === "admin" || user?.role === "super_admin"));
  const activeEmployees = employees.filter((e) => e.status === "active").length;

  return (
    <>
      <TopBar title="Admin Dashboard" mode="admin" />
      <div className="space-y-6 p-4 lg:p-8">
        {/* Row 1 — Volume stats */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Clients" value={metrics.total} helper="Across all employees" />
          <StatCard label="Active Employees" value={activeEmployees} helper={`${employees.length} total users`} />
          <StatCard label="Active Leads" value={metrics.activeLeads} helper="Not closed or lost" />
          <StatCard label="Closed Deals" value={metrics.closedLeads} helper="Company-wide" />
        </div>

        {/* Row 2 — Activity stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="New Leads Today" value={metrics.newLeadsToday} helper="Created today" />
          <StatCard label="Overdue Follow-ups" value={metrics.overdueFollowUps} helper="Needs attention" />
          <StatCard label="Conversion Rate" value={`${metrics.conversionRate}%`} helper="Closed ÷ total leads" />
        </div>

        {/* Charts */}
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <LeadStatusChart clients={clients} />
          <RecentActivityFeed clients={clients} />
        </div>
      </div>
    </>
  );
}
