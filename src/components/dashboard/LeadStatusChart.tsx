"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { leadStatusLabels, leadStatuses, type Client } from "@/types";

export function LeadStatusChart({ clients }: { clients: Client[] }) {
  const data = leadStatuses.map((status) => ({
    status: leadStatusLabels[status],
    leads: clients.filter((client) => client.leadStatus === status).length,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Status</CardTitle>
        <CardDescription>Pipeline distribution by current status.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="#242424" vertical={false} />
              <XAxis dataKey="status" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{ background: "#111", border: "1px solid #262626", borderRadius: 8 }}
              />
              <Bar dataKey="leads" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
