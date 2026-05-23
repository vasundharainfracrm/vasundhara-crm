"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Client } from "@/types";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const chartConfig = {
  added: { label: "Leads Added", color: "var(--chart-1)" },
  closed: { label: "Closed", color: "var(--chart-3)" },
} satisfies ChartConfig;

type Props = { clients: Client[]; filteredClients: Client[] };
type Mode = "last6" | "filtered";

export function LeadsOverTimeChart({ clients, filteredClients }: Props) {
  const [mode, setMode] = useState<Mode>("last6");

  const activeClients = mode === "last6" ? clients : filteredClients;

  const data = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(now, 5 - i);
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const inRange = activeClients.filter((c) => {
        const d = c.createdAt?.toDate?.();
        return d && d >= start && d <= end;
      });
      return {
        month: format(month, "MMM yyyy"),
        added: inRange.length,
        closed: inRange.filter((c) => c.leadStatus === "closed").length,
      };
    });
  }, [activeClients]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Leads Over Time</CardTitle>
        <div className="flex items-center gap-1 rounded-lg border bg-muted p-1 text-xs">
          <button
            onClick={() => setMode("last6")}
            className={`rounded px-3 py-1 transition-colors ${
              mode === "last6" ? "bg-background text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Last 6 Months
          </button>
          <button
            onClick={() => setMode("filtered")}
            className={`rounded px-3 py-1 transition-colors ${
              mode === "filtered" ? "bg-background text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Date Filter
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
          <AreaChart data={data} margin={{ left: 0, right: 0 }}>
            <defs>
              <linearGradient id="gradAdded" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradClosed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="added"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#gradAdded)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="closed"
              stroke="var(--chart-3)"
              strokeWidth={2}
              fill="url(#gradClosed)"
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
