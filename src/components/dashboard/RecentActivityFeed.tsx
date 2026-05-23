import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Client } from "@/types";

export function RecentActivityFeed({ clients }: { clients: Client[] }) {
  const recent = clients.slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Clients</CardTitle>
        <CardDescription>Latest records in your visible workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recent.length ? (
          recent.map((client) => (
            <div key={client.clientId} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{client.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {client.city} · {client.assignedUserName}
                </p>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                {client.createdAt?.toDate ? formatDistanceToNow(client.createdAt.toDate(), { addSuffix: true }) : "recently"}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No client activity yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
