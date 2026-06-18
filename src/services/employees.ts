import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { db, onSnapshot, updateDoc } from "@/lib/firebase";
import { writeAuditLog } from "@/services/audit";
import type { AppUser, EmployeeFormValues } from "@/types";

export function subscribeEmployees(callback: (employees: AppUser[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(200)), (snapshot) => {
    callback(
      snapshot.docs
        .map((item) => ({ uid: item.id, ...item.data() }) as AppUser)
        .filter((e) => !e.isGhost)
    );
  });
}

export async function updateEmployee(uid: string, values: EmployeeFormValues, performedBy: AppUser) {
  // NOTE: 'role' is intentionally excluded here.
  // Role changes must go through /api/superadmin/promote-to-admin
  // which atomically updates both the Firestore document AND the Firebase Auth custom claim.
  // A client-side Firestore-only role change would cause a broken half-state.
  await updateDoc(doc(db, "users", uid), {
    fullName: values.fullName,
    email: values.email,
    mobileNumber: values.mobileNumber,
    department: values.department,
    status: values.status,
  });

  await writeAuditLog({
    action: "employee_updated",
    performedBy: performedBy.uid,
    performedByName: performedBy.fullName,
    targetId: uid,
    details: `Updated employee ${values.fullName} — status: ${values.status}`,
    isGhost: performedBy.isGhost || false,
  });
}

export async function approveEmployeeStatus(uid: string, employeeName: string, performedBy: AppUser) {
  await updateDoc(doc(db, "users", uid), {
    status: "active",
  });

  await writeAuditLog({
    action: "employee_approved",
    performedBy: performedBy.uid,
    performedByName: performedBy.fullName,
    targetId: uid,
    details: `Approved employee ${employeeName}`,
    isGhost: performedBy.isGhost || false,
  });
}
