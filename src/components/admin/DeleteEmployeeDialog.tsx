"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { AppUser } from "@/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUid: string;
  targetName: string;
  onSuccess: () => void;
};

export function DeleteEmployeeDialog({ open, onOpenChange, targetUid, targetName, onSuccess }: Props) {
  const [employees, setEmployees] = useState<AppUser[]>([]);
  const [reassignToUid, setReassignToUid] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchEmployees = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("status", "==", "active")
        );
        const snap = await getDocs(q);
        const users: AppUser[] = [];
        snap.forEach((doc) => {
          const u = doc.data() as AppUser;
          // Filter out the user being deleted
          if (u.uid !== targetUid) {
            users.push(u);
          }
        });
        setEmployees(users);
      } catch (err) {
        console.error("Failed to load employees for reassignment", err);
      }
    };
    fetchEmployees();
  }, [open, targetUid]);

  const handleDelete = async () => {
    if (!confirm(`Are you absolutely sure you want to delete ${targetName}?`)) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch("/api/admin/delete-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUid,
          reassignToUid: reassignToUid || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete employee");

      toast.success("Employee deleted successfully");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Unable to delete employee");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Employee"
      description={`You are about to permanently delete ${targetName}'s account.`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Permanently Delete"}
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-2">
        <div className="rounded-md bg-amber-500/15 p-3 text-sm text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <strong>Warning:</strong> Deleting an employee is irreversible. Any leads or clients currently assigned to them must be reassigned below, otherwise they will be orphaned in the system.
        </div>

        <div className="space-y-2">
          <Label>Reassign their leads to:</Label>
          <Select 
            value={reassignToUid} 
            onChange={(e) => setReassignToUid(e.target.value)}
            disabled={isDeleting}
          >
            <option value="">-- Do not reassign (Orphan leads) --</option>
            {employees.map((emp) => (
              <option key={emp.uid} value={emp.uid}>
                {emp.fullName} ({emp.department})
              </option>
            ))}
          </Select>
        </div>
      </div>
    </Dialog>
  );
}
