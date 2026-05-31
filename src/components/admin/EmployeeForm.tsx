"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useState } from "react";
import { CheckCircle, Loader2, ShieldAlert, TriangleAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { employeeSchema } from "@/lib/validation";
import { useAuth } from "@/lib/auth-context";
import { useEmployees } from "@/hooks/useEmployees";
import { updateEmployee, approveEmployeeStatus } from "@/services/employees";
import { DeleteEmployeeDialog } from "./DeleteEmployeeDialog";
import type { AppUser, EmployeeFormValues } from "@/types";

export function EmployeeForm({ employee }: { employee?: AppUser }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Load all employees so we can populate the admin picker in the transfer dialog
  const { employees: allUsers } = useEmployees();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [selectedAdminUid, setSelectedAdminUid] = useState("");
  const [transferConfirmText, setTransferConfirmText] = useState("");

  const isSuperAdmin = user?.role === "super_admin";
  // Regular admins are view-only — they cannot create, edit, delete, or approve anyone.
  // All employee management is reserved for super_admin.
  const isViewOnly = !isSuperAdmin;

  // Is the form showing the super_admin's own account?
  const isOwnAccount = employee?.uid === user?.uid;

  // Admins available for ownership transfer (excluding self)
  const availableAdmins = allUsers.filter(
    (u) => u.role === "admin" && u.status === "active",
  );
  const selectedAdmin = availableAdmins.find((a) => a.uid === selectedAdminUid);

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
        // Super_admin promoting an employee to admin
        if (values.role === "admin" && employee.role === "employee") {
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

        // Normal update
        await updateEmployee(employee.uid, values, user!);
        toast.success("Employee updated.");
      } else {
        // Creating a new user — route to correct API based on role
        const endpoint =
          values.role === "admin"
            ? "/api/superadmin/create-admin"
            : "/api/admin/create-employee";

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(
            payload.error ||
              `Unable to create ${values.role === "admin" ? "admin" : "employee"}.`,
          );
        }
        toast.success(values.role === "admin" ? "Admin created." : "Employee created.");
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

  async function handleTransferOwnership() {
    if (!selectedAdminUid || transferConfirmText !== "TRANSFER") return;
    setIsTransferring(true);
    try {
      const response = await fetch("/api/superadmin/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newSuperAdminUid: selectedAdminUid }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Transfer failed.");

      toast.success(
        `Super Admin transferred to ${selectedAdmin?.fullName ?? "selected admin"}. Logging out now…`,
      );

      // Short delay so toast is visible, then force-logout
      setTimeout(async () => {
        await logout();
      }, 2000);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Transfer failed.");
      setIsTransferring(false);
    }
  }

  // Role dropdown: editable only when super_admin is editing an employee or creating new
  const canChangeRole = isSuperAdmin && (employee?.role === "employee" || !employee);

  // Readable label for locked role field
  const roleLabelForLocked = (() => {
    if (!employee) return "Employee";
    if (employee.role === "super_admin") return "Super Admin";
    if (employee.role === "admin") return "Admin";
    return employee.role.replace(/_/g, " ");
  })();

  // ── Action bar logic ─────────────────────────────────────────────────────
  // Left button:
  //   - super_admin viewing their OWN account → Transfer Ownership (amber)
  //   - super_admin viewing any other account (admin or employee) → Delete employee (red)
  //   - view-only admin → nothing
  const showTransferButton = isSuperAdmin && isOwnAccount && Boolean(employee);
  const showDeleteButton = isSuperAdmin && !isOwnAccount && Boolean(employee);

  // Save button: shown for super_admin on any account that is NOT their own super_admin profile
  const showSaveButton = isSuperAdmin && !(isOwnAccount && employee?.role === "super_admin");

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
              <Select {...register("role")}>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </Select>
            ) : (
              <Input
                value={roleLabelForLocked}
                disabled
                className="bg-muted capitalize"
              />
            )}
          </Field>

          <Field label="Status" error={errors.status?.message}>
            <Select
              {...register("status")}
              disabled={isViewOnly || employee?.role === "super_admin"}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>

          {/* Temporary password — only shown when creating a new user */}
          {!employee && isSuperAdmin ? (
            <Field label="Temporary password" error={errors.password?.message}>
              <Input type="password" {...register("password")} />
            </Field>
          ) : null}

          {/* ── Action Bar ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between md:col-span-2 pt-4 border-t flex-wrap gap-3">
            {/* Left side */}
            <div>
              {/* Transfer Ownership — super_admin's OWN profile page only */}
              {showTransferButton && (
                <Button
                  type="button"
                  variant="secondary"
                  className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900"
                  onClick={() => {
                    setSelectedAdminUid("");
                    setTransferConfirmText("");
                    setTransferOpen(true);
                  }}
                  disabled={availableAdmins.length === 0}
                >
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  {availableAdmins.length === 0
                    ? "No admins available for transfer"
                    : "Transfer Ownership"}
                </Button>
              )}

              {/* Delete employee — all accounts except own */}
              {showDeleteButton && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete employee
                </Button>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                {isViewOnly ? "Back" : "Cancel"}
              </Button>

              {/* Approve / Reject — pending_approval, super_admin only */}
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

              {/* Save */}
              {showSaveButton && (
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

      {/* Delete Dialog */}
      {showDeleteButton && employee && (
        <DeleteEmployeeDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          targetUid={employee.uid}
          targetName={employee.fullName}
          onSuccess={() => router.push("/admin/employees")}
        />
      )}

      {/* Transfer Ownership Dialog — super_admin's own profile only */}
      {showTransferButton && (
        <Dialog
          open={transferOpen}
          onOpenChange={(open) => {
            setTransferOpen(open);
            if (!open) {
              setSelectedAdminUid("");
              setTransferConfirmText("");
            }
          }}
          title="Transfer Super Admin Privileges"
          description="This is a one-way, irreversible action. You will be permanently demoted to Admin and both accounts will be immediately logged out."
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setTransferOpen(false)}
                disabled={isTransferring}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleTransferOwnership}
                disabled={
                  !selectedAdminUid ||
                  transferConfirmText !== "TRANSFER" ||
                  isTransferring
                }
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferring…
                  </>
                ) : (
                  "Confirm Transfer"
                )}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Warning */}
            <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
              <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                After confirmation, you will be immediately logged out and cannot undo this action.
              </span>
            </div>

            {/* Admin picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select admin to receive Super Admin privileges
              </label>
              <Select
                value={selectedAdminUid}
                onChange={(e) => setSelectedAdminUid(e.target.value)}
              >
                <option value="">— Select an admin —</option>
                {availableAdmins.map((admin) => (
                  <option key={admin.uid} value={admin.uid}>
                    {admin.fullName} ({admin.email})
                  </option>
                ))}
              </Select>
            </div>

            {/* Selected admin summary */}
            {selectedAdmin && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                <p><span className="font-medium">Name:</span> {selectedAdmin.fullName}</p>
                <p><span className="font-medium">Email:</span> {selectedAdmin.email}</p>
                <p><span className="font-medium">Department:</span> {selectedAdmin.department}</p>
              </div>
            )}

            {/* Confirm input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-destructive">
                Type <strong>TRANSFER</strong> to confirm
              </label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="TRANSFER"
                value={transferConfirmText}
                onChange={(e) => setTransferConfirmText(e.target.value)}
              />
            </div>
          </div>
        </Dialog>
      )}
    </form>
  );
}
