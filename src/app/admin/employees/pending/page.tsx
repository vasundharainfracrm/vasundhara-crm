"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import type { AppUser } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default function PendingEmployeesPage() {
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingUsers = async () => {
    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "employee"),
        where("status", "==", "pending_approval")
      );
      const snapshot = await getDocs(q);
      const users: AppUser[] = [];
      snapshot.forEach((docSnap) => {
        users.push(docSnap.data() as AppUser);
      });
      setPendingUsers(users);
    } catch (err) {
      console.error("Failed to fetch pending users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "super_admin")) {
      fetchPendingUsers();
    }
  }, [user]);

  const handleApprove = async (uid: string) => {
    try {
      await updateDoc(doc(db, "users", uid), { status: "active" });
      setPendingUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (err) {
      console.error("Failed to approve", err);
      alert("Failed to approve user");
    }
  };

  const handleReject = async (uid: string) => {
    if (!confirm("Are you sure you want to reject and delete this request?")) return;
    try {
      // For simplicity, we just delete the pending user doc. 
      // The auth user remains but they have no database document, essentially locking them out.
      await deleteDoc(doc(db, "users", uid));
      setPendingUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (err) {
      console.error("Failed to reject", err);
      alert("Failed to reject user");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
          <p className="text-muted-foreground">Review and approve new employee registrations.</p>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No pending requests found.
                </TableCell>
              </TableRow>
            ) : (
              pendingUsers.map((u) => (
                <TableRow key={u.uid}>
                  <TableCell className="font-medium">{u.fullName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.mobileNumber}</TableCell>
                  <TableCell>{u.department}</TableCell>
                  <TableCell>{u.createdAt ? format(u.createdAt.toDate(), "dd MMM yyyy") : "N/A"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => handleApprove(u.uid)} className="text-emerald-500 hover:text-emerald-600">
                      Approve
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleReject(u.uid)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                      Reject
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
