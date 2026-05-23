"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { leadSources, type Client } from "@/types";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const chartConfig = leadSources.reduce((acc, src, idx) => {
  acc[src] = { label: src, color: COLORS[idx] };
  return acc;
}, {} as Record<string, { label: string; color: string }>) satisfies ChartConfig;

type Props = { clients: Client[] };

export function LeadSourceChart({ clients }: Props) {
  const data = useMemo(() =>
    leadSources
      .map((src, idx) => ({
        source: src,
        count: clients.filter((c) => c.leadSource === src).length,
        fill: COLORS[idx],
      }))
      .sort((a, b) => b.count - a.count),
    [clients]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Source Mix</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[220px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} className="text-xs" />
            <YAxis
              type="category"
              dataKey="source"
              tickLine={false}
              axisLine={false}
              width={60}
              className="text-xs"
            />
            <ChartTooltip content={<ChartTooltipContent nameKey="source" hideLabel />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.source} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
