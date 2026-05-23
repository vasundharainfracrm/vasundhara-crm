"use client";

import { useMemo } from "react";
import { Pie, PieChart, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { leadStatuses, leadStatusLabels, type Client } from "@/types";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
];

const chartConfig = leadStatuses.reduce((acc, status, idx) => {
  acc[status] = { label: leadStatusLabels[status], color: CHART_COLORS[idx] };
  return acc;
}, {} as Record<string, { label: string; color: string }>) satisfies ChartConfig;

type Props = { clients: Client[] };

export function LeadFunnelChart({ clients }: Props) {
  const data = useMemo(() =>
    leadStatuses
      .map((status, idx) => ({
        status,
        name: leadStatusLabels[status],
        value: clients.filter((c) => c.leadStatus === status).length,
        fill: CHART_COLORS[idx],
      }))
      .filter((d) => d.value > 0),
    [clients]
  );

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto min-h-[280px] w-full max-w-[360px]">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={72}
              outerRadius={110}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
            <ChartLegend content={<ChartLegendContent nameKey="name" />} className="flex-wrap gap-x-4 gap-y-1" />
          </PieChart>
        </ChartContainer>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{total}</span> leads total
        </p>
      </CardContent>
    </Card>
  );
}
