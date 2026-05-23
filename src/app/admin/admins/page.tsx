"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, ShieldAlert, TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { TopBar } from "@/components/layout/TopBar";
import { useEmployees } from "@/hooks/useEmployees";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types";

export default function AdminsManagementPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { employees } = useEmployees(true);

  const [handoverOpen, setHandoverOpen] = useState(false);
  const [selectedAdminUid, setSelectedAdminUid] = useState("");
  const [isHandingOver, setIsHandingOver] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // Route protection — super_admin only
  useEffect(() => {
    if (user && user.role !== "super_admin") {
      router.replace("/admin");
    }
  }, [user, router]);

  if (!user || user.role !== "super_admin") return null;

  // All admins (not super_admin, not employees)
  const admins: AppUser[] = employees.filter(
    (e) => e.role === "admin" && e.uid !== user.uid,
  );

  async function handleHandover() {
    if (!selectedAdminUid || confirmText !== "HANDOVER") return;
    setIsHandingOver(true);
    try {
      const response = await fetch("/api/superadmin/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newSuperAdminUid: selectedAdminUid }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Handover failed.");

      toast.success("Super Admin privileges transferred. You will now be logged out.");

      // Small delay so the toast is visible, then force-logout
      setTimeout(async () => {
        await logout();
      }, 2000);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Handover failed.");
      setIsHandingOver(false);
    }
  }

  const selectedAdmin = admins.find((a) => a.uid === selectedAdminUid);

  return (
    <>
      <TopBar
        title="Admin Management"
        description="Manage sub-admins and their access. Only Super Admin can see this page."
        mode="admin"
        ctaHref="/admin/admins/new"
        ctaLabel="Create Admin"
      />
      <div className="p-4 lg:p-8 space-y-6">

        {/* Handover Banner */}
        <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base text-amber-800 dark:text-amber-400">
                Super Admin Handover
              </CardTitle>
            </div>
            <CardDescription className="text-amber-700 dark:text-amber-500">
              Transfer your Super Admin privileges to an existing admin. This action is
              irreversible — you will be demoted to Admin and immediately logged out.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
              onClick={() => setHandoverOpen(true)}
              disabled={admins.length === 0}
            >
              <ShieldAlert className="h-4 w-4 mr-2" />
              {admins.length === 0
                ? "No admins available for handover"
                : "Transfer Super Admin Privileges"}
            </Button>
          </CardContent>
        </Card>

        {/* Admin List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sub-Admins</CardTitle>
              <a href="/admin/admins/new" className={cn(buttonVariants({ size: "sm" }))}>
                <Plus className="h-4 w-4 mr-2" />
                Create Admin
              </a>
            </div>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                <p className="text-sm">No sub-admins have been created yet.</p>
                <p className="text-xs mt-1">
                  Create an admin account to delegate management responsibilities.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.uid}>
                      <TableCell className="font-medium">{admin.fullName}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>{admin.department}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            admin.status === "active"
                              ? "default"
                              : admin.status === "inactive"
                                ? "secondary"
                                : "danger"
                          }
                        >
                          {admin.status.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(admin.adminPermissions ?? []).length > 0 ? (
                            (admin.adminPermissions ?? []).map((p) => (
                              <Badge key={p} variant="secondary" className="text-xs capitalize">
                                {p}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">No permissions</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Handover Confirmation Dialog — uses existing Dialog component with footer prop */}
      <Dialog
        open={handoverOpen}
        onOpenChange={(open) => {
          setHandoverOpen(open);
          if (!open) {
            setSelectedAdminUid("");
            setConfirmText("");
          }
        }}
        title="Transfer Super Admin Privileges"
        description="This is a one-way, irreversible action. You will permanently lose Super Admin privileges and be demoted to Admin. You will be logged out immediately."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setHandoverOpen(false)}
              disabled={isHandingOver}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleHandover}
              disabled={!selectedAdminUid || confirmText !== "HANDOVER" || isHandingOver}
            >
              {isHandingOver ? "Transferring..." : "Confirm Handover"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Warning badge */}
          <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
            <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <span>After confirmation, you will be immediately logged out and cannot undo this action.</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Select admin to receive Super Admin privileges
            </label>
            <Select
              value={selectedAdminUid}
              onChange={(e) => setSelectedAdminUid(e.target.value)}
            >
              <option value="">— Select an admin —</option>
              {admins.map((admin) => (
                <option key={admin.uid} value={admin.uid}>
                  {admin.fullName} ({admin.email})
                </option>
              ))}
            </Select>
          </div>

          {selectedAdmin && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <p><span className="font-medium">Name:</span> {selectedAdmin.fullName}</p>
              <p><span className="font-medium">Email:</span> {selectedAdmin.email}</p>
              <p><span className="font-medium">Department:</span> {selectedAdmin.department}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-destructive">
              Type <strong>HANDOVER</strong> to confirm
            </label>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="HANDOVER"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
