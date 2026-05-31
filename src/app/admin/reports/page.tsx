"use client";

import { useMemo, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/dashboard/StatCard";
import { LeadFunnelChart } from "@/components/reports/LeadFunnelChart";
import { LeadsOverTimeChart } from "@/components/reports/LeadsOverTimeChart";
import { EmployeeBarChart } from "@/components/reports/EmployeeBarChart";
import { LeadSourceChart } from "@/components/reports/LeadSourceChart";
import { PriorityTrendChart } from "@/components/reports/PriorityTrendChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { useClients } from "@/hooks/useClients";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/lib/auth-context";

export default function ReportsPage() {
  const { user } = useAuth();
  const { clients } = useClients(user);
  const { employees } = useEmployees(true);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filteredClients = useMemo(() => {
    if (!from && !to) return clients;
    return clients.filter((c) => {
      const created = c.createdAt?.toDate?.();
      if (!created) return true;
      if (from && created < new Date(`${from}T00:00:00`)) return false;
      if (to && created > new Date(`${to}T23:59:59`)) return false;
      return true;
    });
  }, [clients, from, to]);

  // KPI metrics
  const total = filteredClients.length;
  const closed = filteredClients.filter((c) => c.leadStatus === "closed").length;
  const active = filteredClients.filter(
    (c) => !["closed", "not_interested"].includes(c.leadStatus)
  ).length;
  const conversionRate = total > 0 ? Math.round((closed / total) * 100) : 0;
  const highPriority = filteredClients.filter((c) => c.priority === "high").length;
  const activeEmployees = employees.filter((e) => e.status === "active").length;

  return (
    <>
      <TopBar title="Reports" mode="admin" />
      <div className="space-y-6 p-4 lg:p-8">

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
            <CardDescription>
              Filter all charts by client creation date.{" "}
              <span className="font-medium text-foreground">{filteredClients.length}</span> of {clients.length} clients shown.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <Field label="From">
                <DatePicker value={from} onChange={setFrom} placeholder="Start Date" className="w-44" />
              </Field>
              <Field label="To">
                <DatePicker value={to} onChange={setTo} placeholder="End Date" className="w-44" />
              </Field>
              {(from || to) && (
                <button
                  onClick={() => { setFrom(""); setTo(""); }}
                  className="mb-0.5 text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Clear filter
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPI Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Total Clients" value={total} helper="In selected range" />
          <StatCard label="Active Leads" value={active} helper="Not closed or lost" />
          <StatCard label="Closed Deals" value={closed} helper="Status: closed" />
          <StatCard label="Conversion Rate" value={`${conversionRate}%`} helper="Closed ÷ total" />
          <StatCard label="High Priority" value={highPriority} helper="Needs attention" />
          <StatCard label="Active Employees" value={activeEmployees} helper={`${employees.length} total`} />
        </div>

        {/* Row 2: Funnel (Donut) + Employee Leaderboard (Bar) */}
        <div className="grid gap-6 xl:grid-cols-2">
          <LeadFunnelChart clients={filteredClients} />
          <EmployeeBarChart clients={filteredClients} />
        </div>

        {/* Row 3: Leads Over Time (Area) — full width */}
        <LeadsOverTimeChart clients={clients} filteredClients={filteredClients} />

        {/* Row 4: Lead Source (Horizontal Bar) + Priority Trend (Line) */}
        <div className="grid gap-6 xl:grid-cols-2">
          <LeadSourceChart clients={filteredClients} />
          <PriorityTrendChart clients={clients} />
        </div>

      </div>
    </>
  );
}
