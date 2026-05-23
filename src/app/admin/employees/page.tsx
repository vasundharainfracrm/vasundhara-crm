"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TopBar } from "@/components/layout/TopBar";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export default function EmployeesPage() {
  const { employees } = useEmployees();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";

  // Regular admins only see employees (role="employee").
  // They cannot see other admins or the super_admin.
  // Super admin sees everyone.
  const visibleEmployees = isSuperAdmin
    ? employees
    : employees.filter((e) => e.role === "employee");

  async function resetPassword(email: string, uid: string) {
    const response = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, userId: uid }),
    });
    const payload = await response.json();
    if (!response.ok) {
      toast.error(payload.error || "Unable to generate reset link.");
      return;
    }
    await navigator.clipboard.writeText(payload.link);
    toast.success("Reset link copied to clipboard.");
  }

  return (
    <>
      {/* "New employee" CTA is only shown to super_admin — admins are view-only */}
      <TopBar
        title="Employees"
        description={
          isSuperAdmin
            ? "Create, deactivate, and reset team access."
            : "View your team members."
        }
        mode="admin"
        ctaHref={isSuperAdmin ? "/admin/employees/new" : undefined}
        ctaLabel={isSuperAdmin ? "New employee" : undefined}
      />
      <div className="p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {isSuperAdmin ? "All Team Members" : "Employees"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No employees found.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleEmployees.map((employee) => (
                    <TableRow key={employee.uid}>
                      <TableCell className="font-medium">{employee.fullName}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell className="capitalize">
                        {employee.role.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            employee.status === "active"
                              ? "default"
                              : employee.status === "pending_approval"
                                ? "secondary"
                                : "danger"
                          }
                        >
                          {employee.status.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        {/* Password reset — super_admin only */}
                        {isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetPassword(employee.email, employee.uid)}
                          >
                            <KeyRound className="h-4 w-4" />
                            Reset
                          </Button>
                        )}
                        <Link
                          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                          href={`/admin/employees/${employee.uid}`}
                        >
                          {isSuperAdmin ? "Edit" : "View"}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
