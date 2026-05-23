"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { employeeSchema } from "@/lib/validation";
import { useAuth } from "@/lib/auth-context";
import { updateEmployee, approveEmployeeStatus } from "@/services/employees";
import { CheckCircle, XCircle } from "lucide-react";
import { DeleteEmployeeDialog } from "./DeleteEmployeeDialog";
import type { AppUser, EmployeeFormValues } from "@/types";

export function EmployeeForm({ employee }: { employee?: AppUser }) {
  const { user } = useAuth();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  const isSuperAdmin = user?.role === "super_admin";
  // Regular admins are view-only — they cannot create, edit, delete, or approve anyone.
  // All employee management is reserved for super_admin.
  const isViewOnly = !isSuperAdmin;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      fullName: employee?.fullName || "",
      email: employee?.email || "",
      mobileNumber: employee?.mobileNumber || "",
      department: employee?.department || "Sales",
      // Role default:
      // - editing existing: use their actual role
      // - new employee: default to employee
      role: employee?.role || "employee",
      status: employee?.status || "active",
      password: "",
    },
  });

  const currentRole = watch("role");

  async function onSubmit(values: EmployeeFormValues) {
    if (isViewOnly) return;
    try {
      if (employee) {
        // Check if super_admin is promoting an employee to admin via the dropdown
        if (values.role === "admin" && employee.role === "employee") {
          // Use the dedicated promote API which sets both Firestore + Auth claim atomically
          setIsPromoting(true);
          const promoteRes = await fetch("/api/superadmin/promote-to-admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetUid: employee.uid }),
          });
          const promotePayload = await promoteRes.json();
          if (!promoteRes.ok) throw new Error(promotePayload.error || "Promote failed.");
          toast.success(`${employee.fullName} promoted to Admin. They must log in again.`);
          router.push("/admin/employees");
          return;
        }

        // Normal update (no role change or allowed update)
        await updateEmployee(employee.uid, values, user!);
        toast.success("Employee updated.");
      } else {
        // Creating a brand new employee — super_admin only
        const response = await fetch("/api/admin/create-employee", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to create employee.");
        toast.success("Employee created.");
      }
      router.push("/admin/employees");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save employee.");
    } finally {
      setIsPromoting(false);
    }
  }

  async function handleApprove() {
    if (!employee || !user || isViewOnly) return;
    try {
      await approveEmployeeStatus(employee.uid, employee.fullName, user);
      toast.success("Employee approved successfully.");
      router.push("/admin/employees");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve employee.");
    }
  }

  async function handleReject() {
    if (!employee || isViewOnly) return;
    try {
      const response = await fetch("/api/admin/delete-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: employee.uid }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to reject employee.");
      toast.success("Employee rejected and removed.");
      router.push("/admin/employees");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to reject employee.");
    }
  }

  // Which role options are available in the dropdown?
  // super_admin editing an EMPLOYEE: can choose Employee or Admin (promotes via API)
  // super_admin editing an ADMIN: role is locked (admin → super_admin only via handover page)
  // super_admin creating new: can choose Employee or Admin
  // view-only admin: role field is just a read-only display
  const canChangeRole = isSuperAdmin && (employee?.role === "employee" || !employee);
  const isRoleLocked = isSuperAdmin && employee?.role === "admin";

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>{employee ? "Employee Details" : "New Employee"}</CardTitle>
              <CardDescription>
                {isViewOnly
                  ? "View-only. Only Super Admin can create or edit employee accounts."
                  : employee
                    ? "Manage access, department, status, and role."
                    : "Create a new employee account."}
              </CardDescription>
            </div>
            {employee && (
              <Badge
                variant={
                  employee.status === "active"
                    ? "default"
                    : employee.status === "pending_approval"
                      ? "secondary"
                      : "danger"
                }
                className="capitalize text-sm px-3 py-1"
              >
                {employee.status.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Full name" error={errors.fullName?.message}>
            <Input {...register("fullName")} disabled={isViewOnly} />
          </Field>

          <Field label="Email" error={errors.email?.message}>
            {/* Email is editable when creating a new employee, locked when editing */}
            <Input
              type="email"
              {...register("email")}
              disabled={isViewOnly || Boolean(employee)}
            />
          </Field>

          <Field label="Mobile number" error={errors.mobileNumber?.message}>
            <Input {...register("mobileNumber")} disabled={isViewOnly} />
          </Field>

          <Field label="Department" error={errors.department?.message}>
            <Input {...register("department")} disabled={isViewOnly} />
          </Field>

          <Field label="Role" error={errors.role?.message}>
            {canChangeRole ? (
              // Super admin editing an employee or creating new: dropdown with Employee / Admin
              <Select {...register("role")}>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </Select>
            ) : (
              // Locked: either view-only admin, or editing an existing admin account
              <Input
                value={
                  isRoleLocked
                    ? "Admin (use handover page to elevate to Super Admin)"
                    : (employee?.role ?? "employee").replace(/_/g, " ")
                }
                disabled
                className="bg-muted capitalize"
              />
            )}
          </Field>

          <Field label="Status" error={errors.status?.message}>
            <Select {...register("status")} disabled={isViewOnly}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>

          {/* Temporary password — only shown when creating a new employee */}
          {!employee && isSuperAdmin ? (
            <Field label="Temporary password" error={errors.password?.message}>
              <Input type="password" {...register("password")} />
            </Field>
          ) : null}

          {/* ── Action Bar ────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between md:col-span-2 pt-4 border-t flex-wrap gap-3">
            {/* Left side: delete (super_admin editing existing only) */}
            <div>
              {employee && isSuperAdmin && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete employee
                </Button>
              )}
            </div>

            {/* Right side: approve/reject/save */}
            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                {isViewOnly ? "Back" : "Cancel"}
              </Button>

              {/* Approve / Reject — only for pending_approval, super_admin only */}
              {employee?.status === "pending_approval" && isSuperAdmin && (
                <>
                  <Button type="button" variant="destructive" onClick={handleReject}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    type="button"
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={handleApprove}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}

              {/* Save — super_admin only */}
              {isSuperAdmin && (
                <Button type="submit" disabled={isSubmitting || isPromoting}>
                  {isPromoting
                    ? "Promoting..."
                    : isSubmitting
                      ? "Saving..."
                      : currentRole === "admin" && employee?.role === "employee"
                        ? "Promote to Admin"
                        : "Save employee"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {employee && (
        <DeleteEmployeeDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          targetUid={employee.uid}
          targetName={employee.fullName}
          onSuccess={() => router.push("/admin/employees")}
        />
      )}
    </form>
  );
}
