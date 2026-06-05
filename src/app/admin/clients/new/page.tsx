"use client";

import { useState } from "react";
import { ClientForm } from "@/components/clients/ClientForm";
import { TopBar } from "@/components/layout/TopBar";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useEmployees } from "@/hooks/useEmployees";

export default function AdminNewClientPage() {
  const { user } = useAuth();
  const { employees } = useEmployees(true);

  // null = keep to self (the logged-in admin/super_admin)
  const [selectedUid, setSelectedUid] = useState<string>("__self__");

  if (!user) return null;

  const activeEmployees = employees.filter((e) => e.status === "active");

  // Resolve the assignedTo object from the selected uid
  const assignedTo =
    selectedUid === "__self__"
      ? { uid: user.uid, fullName: user.fullName }
      : (() => {
          const emp = activeEmployees.find((e) => e.uid === selectedUid);
          return emp ? { uid: emp.uid, fullName: emp.fullName } : { uid: user.uid, fullName: user.fullName };
        })();

  return (
    <>
      <TopBar
        title="Add Client"
        description="Duplicate check runs globally before saving."
        mode="admin"
        backHref="/admin/clients"
      />
      <PageBreadcrumb
        crumbs={[
          { label: "All Clients", href: "/admin/clients" },
          { label: "New Client" },
        ]}
      />
      <div className="space-y-5 p-4 lg:p-8">
        {/* ── Assignment card ── */}
        <Card>
          <CardHeader>
            <CardTitle>Assign To</CardTitle>
            <CardDescription>
              Choose which employee will own this client, or keep it assigned to yourself.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              id="admin-new-client-assign"
              value={selectedUid}
              onChange={(e) => setSelectedUid(e.target.value)}
              className="max-w-xs"
            >
              <option value="__self__">Keep to myself ({user.fullName})</option>
              {activeEmployees.map((emp) => (
                <option key={emp.uid} value={emp.uid}>
                  {emp.fullName} — {emp.department}
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>

        {/* ── Client form ── */}
        <ClientForm assignedTo={assignedTo} adminMode />
      </div>
    </>
  );
}
