"use client";

import { format, isBefore, startOfToday } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TopBar } from "@/components/layout/TopBar";
import { useMyFollowUps } from "@/hooks/useFollowUps";
import { useAuth } from "@/lib/auth-context";
import { leadStatusLabels } from "@/types";

export default function FollowUpsPage() {
  const { user } = useAuth();
  const { followUps } = useMyFollowUps(user);

  return (
    <>
      <TopBar title="Follow-ups" description="Upcoming and overdue client actions." mode="employee" />
      <div className="p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>My Follow-ups</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUps.map((item) => {
                  const due = item.nextFollowUpDate?.toDate?.();
                  const overdue = due ? isBefore(due, startOfToday()) : false;
                  return (
                    <TableRow key={item.followupId}>
                      <TableCell>
                        <Link className="font-medium hover:text-accent" href={`/dashboard/clients/${item.clientId}`}>
                          {item.clientName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {due ? (
                          <Badge variant={overdue ? "danger" : "secondary"}>{format(due, "dd MMM yyyy")}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{leadStatusLabels[item.status]}</TableCell>
                      <TableCell>{item.note}</TableCell>
                    </TableRow>
                  );
                })}
                {!followUps.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No follow-ups yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
