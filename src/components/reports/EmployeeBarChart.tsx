"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

const chartConfig = {
  clients: { label: "Total Clients", color: "var(--chart-1)" },
  closed: { label: "Closed", color: "var(--chart-3)" },
} satisfies ChartConfig;

type Props = { clients: Client[] };

export function EmployeeBarChart({ clients }: Props) {
  const data = useMemo(() => {
    const map: Record<string, { name: string; clients: number; closed: number }> = {};
    for (const c of clients) {
      map[c.assignedUserId] ??= { name: c.assignedUserName, clients: 0, closed: 0 };
      map[c.assignedUserId].clients += 1;
      if (c.leadStatus === "closed") map[c.assignedUserId].closed += 1;
    }
    return Object.values(map).sort((a, b) => b.clients - a.clients);
  }, [clients]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
          <BarChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
              tickFormatter={(v: string) => v.split(" ")[0]}
            />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="clients" fill="var(--color-clients)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="closed" fill="var(--color-closed)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
