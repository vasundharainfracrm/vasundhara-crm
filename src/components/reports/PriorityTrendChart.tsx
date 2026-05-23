"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
  high: { label: "High Priority", color: "var(--chart-1)" },
  medium: { label: "Medium Priority", color: "var(--chart-3)" },
  low: { label: "Low Priority", color: "var(--chart-5)" },
} satisfies ChartConfig;

type Props = { clients: Client[] };

export function PriorityTrendChart({ clients }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(now, 5 - i);
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const inRange = clients.filter((c) => {
        const d = c.createdAt?.toDate?.();
        return d && d >= start && d <= end;
      });
      return {
        month: format(month, "MMM"),
        high: inRange.filter((c) => c.priority === "high").length,
        medium: inRange.filter((c) => c.priority === "medium").length,
        low: inRange.filter((c) => c.priority === "low").length,
      };
    });
  }, [clients]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Priority Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[220px] w-full">
          <LineChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="high"
              stroke="var(--color-high)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-high)" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="medium"
              stroke="var(--color-medium)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-medium)" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="low"
              stroke="var(--color-low)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-low)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
