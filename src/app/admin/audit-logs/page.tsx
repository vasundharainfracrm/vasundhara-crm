"use client";

import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TopBar } from "@/components/layout/TopBar";
import { db } from "@/lib/firebase";
import type { AuditLog, AppUser } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { ChevronLeft, ChevronRight, Search, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuditLogsPage() {
  const { user: currentUser } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, AppUser>>({});
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const map: Record<string, AppUser> = {};
      usersSnap.forEach((doc) => {
        map[doc.id] = doc.data() as AppUser;
      });
      setUsersMap(map);

      const logsSnap = await getDocs(
        query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(200))
      );
      setLogs(logsSnap.docs.map((item) => ({ logId: item.id, ...item.data() }) as AuditLog));
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (log.isGhost) return false;
    const performedByUser = usersMap[log.performedBy];
    if (performedByUser?.isGhost) return false;

    const logRole = performedByUser?.role || "system";
    
    // RBAC
    if (currentUser?.role === "admin") {
      if (logRole !== "employee") return false;
    }
    
    // Specific user search
    if (searchQuery && !log.performedByName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Role filter
    if (roleFilter !== "all" && logRole !== roleFilter) {
      return false;
    }

    // Date filters
    if (startDate) {
      const logDate = log.timestamp?.toDate();
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      if (logDate && logDate < sDate) return false;
    }
    if (endDate) {
      const logDate = log.timestamp?.toDate();
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      if (logDate && logDate > eDate) return false;
    }

    return true;
  });

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, startDate, endDate]);

  const downloadCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ["Time", "Action", "Performed By", "Details"];
    const rows = filteredLogs.map(log => {
      const time = log.timestamp?.toDate ? format(log.timestamp.toDate(), "dd MMM yyyy HH:mm:ss") : "-";
      const action = log.action;
      const performedBy = log.performedByName || log.performedBy;
      const details = `"${(log.details || "").replace(/"/g, '""')}"`;
      return [time, action, performedBy, details].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `audit_logs_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <TopBar title="Audit Logs" description="Immutable mutation trail for admins." mode="admin" />
      <div className="p-4 lg:p-8 space-y-6">
        
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground font-medium">Search User</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground font-medium">Role</label>
                <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                  <option value="system">System</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground font-medium">Start Date</label>
                <DatePicker value={startDate} onChange={setStartDate} placeholder="Start Date" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground font-medium">End Date</label>
                <DatePicker value={endDate} onChange={setEndDate} placeholder="End Date" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Activity</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={loadData} disabled={loading}>
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} /> Refresh
              </Button>
              <Button variant="secondary" size="sm" onClick={downloadCSV} disabled={loading || filteredLogs.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Download CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground animate-pulse">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.logId}>
                      <TableCell>{log.timestamp?.toDate ? format(log.timestamp.toDate(), "dd MMM yyyy, h:mm a") : "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="uppercase">{log.action.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell>{log.performedByName}</TableCell>
                      <TableCell>{log.details}</TableCell>
                    </TableRow>
                  ))
                )}
                {!loading && !paginatedLogs.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No audit logs found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            
            {/* Pagination Controls */}
            {filteredLogs.length > 0 && (
              <div className="flex items-center justify-between border-t pt-4 mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="secondary" 
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button 
                    variant="secondary" 
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
