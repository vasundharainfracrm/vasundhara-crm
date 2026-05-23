"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { AppUser, Client } from "@/types";

export function TransferOwnershipModal({
  client,
  employees,
  open,
  onOpenChange,
}: {
  client: Client;
  employees: AppUser[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [employeeId, setEmployeeId] = useState(client.assignedUserId);
  const [submitting, setSubmitting] = useState(false);
  const activeEmployees = employees.filter((employee) => employee.status === "active");

  async function transfer() {
    const employee = activeEmployees.find((item) => item.uid === employeeId);
    if (!employee) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/transfer-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.clientId,
          assignedUserId: employee.uid,
          assignedUserName: employee.fullName,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to transfer ownership.");
      toast.success("Ownership transferred.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transfer failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Transfer Ownership"
      description="Only admins can reassign a client owner."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={transfer} disabled={submitting || employeeId === client.assignedUserId}>
            {submitting ? "Transferring..." : "Transfer"}
          </Button>
        </>
      }
    >
      <Field label="New owner">
        <Select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
          {activeEmployees.map((employee) => (
            <option key={employee.uid} value={employee.uid}>
              {employee.fullName} · {employee.department}
            </option>
          ))}
        </Select>
      </Field>
    </Dialog>
  );
}
