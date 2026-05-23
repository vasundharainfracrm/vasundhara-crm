"use client";

import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TopBar } from "@/components/layout/TopBar";
import { db } from "@/lib/firebase";
import type { AuditLog } from "@/types";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    return onSnapshot(query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(200)), (snapshot) => {
      setLogs(snapshot.docs.map((item) => ({ logId: item.id, ...item.data() }) as AuditLog));
    });
  }, []);

  return (
    <>
      <TopBar title="Audit Logs" description="Immutable mutation trail for admins." mode="admin" />
      <div className="p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.logId}>
                    <TableCell>{log.timestamp?.toDate ? format(log.timestamp.toDate(), "dd MMM yyyy, h:mm a") : "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{log.action}</Badge>
                    </TableCell>
                    <TableCell>{log.performedByName}</TableCell>
                    <TableCell className="font-mono text-xs">{log.targetId}</TableCell>
                    <TableCell>{log.details}</TableCell>
                  </TableRow>
                ))}
                {!logs.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No audit logs yet.
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
