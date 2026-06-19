import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  getCountFromServer,
  type Unsubscribe,
} from "firebase/firestore";
import { db, addDoc, getDoc, onSnapshot, updateDoc, deleteDoc } from "@/lib/firebase";
import type { AppUser, Client, ClientFormValues } from "@/types";
import { normalizePhone, toISTDateString } from "@/lib/utils";
import { writeAuditLog } from "@/services/audit";

export function toTimestamp(dateValue?: string | null) {
  return dateValue ? Timestamp.fromDate(new Date(`${dateValue}T00:00:00+05:30`)) : null;
}

function payloadFromForm(values: ClientFormValues) {
  const defaultCreated = toISTDateString(new Date());
  return {
    ...values,
    primaryMobile: normalizePhone(values.primaryMobile),
    alternateMobile: normalizePhone(values.alternateMobile || ""),
    budget: Number(values.budget || 0),
    followUpDate: toTimestamp(values.followUpDate),
    createdAt: toTimestamp(values.createdAt || defaultCreated) || serverTimestamp(),
  };
}

export async function checkDuplicateClient(values: Pick<ClientFormValues, "primaryMobile" | "alternateMobile" | "email">) {
  const response = await fetch("/api/clients/check-duplicate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      primaryMobile: normalizePhone(values.primaryMobile),
      alternateMobile: normalizePhone(values.alternateMobile || ""),
      email: values.email,
    }),
  });

  if (!response.ok) throw new Error("Unable to check duplicates.");
  return (await response.json()) as { isDuplicate: boolean; ownerName?: string };
}

export async function createClient(
  values: ClientFormValues,
  user: AppUser,
  assignedTo?: { uid: string; fullName: string },
) {
  const assignee = assignedTo ?? { uid: user.uid, fullName: user.fullName };
  const docRef = await addDoc(collection(db, "clients"), {
    ...payloadFromForm(values),
    assignedUserId: assignee.uid,
    assignedUserName: assignee.fullName,
    updatedAt: serverTimestamp(),
    isGhost: user.isGhost || false,
  });

  await updateDoc(docRef, { clientId: docRef.id });
  await writeAuditLog({
    action: "client_created",
    performedBy: user.uid,
    performedByName: user.fullName,
    targetId: docRef.id,
    details: `Created client ${values.fullName}`,
    isGhost: user.isGhost || false,
  });

  return docRef.id;
}

export async function updateClient(clientId: string, values: ClientFormValues, user: AppUser) {
  await updateDoc(doc(db, "clients", clientId), {
    ...payloadFromForm(values),
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "client_updated",
    performedBy: user.uid,
    performedByName: user.fullName,
    targetId: clientId,
    details: `Updated client ${values.fullName}`,
    isGhost: user.isGhost || false,
  });
}

export async function deleteClient(clientId: string, clientName: string, user: AppUser) {
  await updateDoc(doc(db, "clients", clientId), {
    deletedAt: serverTimestamp(),
    deletedById: user.uid,
    deletedByName: user.fullName,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "client_deleted",
    performedBy: user.uid,
    performedByName: user.fullName,
    targetId: clientId,
    details: `Deleted client ${clientName}`,
    isGhost: user.isGhost || false,
  });
}

/** Patch a small subset of client fields directly from the detail page. */
export async function patchClient(
  clientId: string,
  patch: { leadStatus?: string; priority?: string; followUpDate?: string | null },
  clientName: string,
  user: AppUser,
) {
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.leadStatus !== undefined) data.leadStatus = patch.leadStatus;
  if (patch.priority !== undefined) data.priority = patch.priority;
  if (patch.followUpDate !== undefined) data.followUpDate = toTimestamp(patch.followUpDate ?? "");

  await updateDoc(doc(db, "clients", clientId), data);

  await writeAuditLog({
    action: "client_updated",
    performedBy: user.uid,
    performedByName: user.fullName,
    targetId: clientId,
    details: `Quick-updated ${clientName}: ${Object.keys(patch).join(", ")}`,
    isGhost: user.isGhost || false,
  });
}


export async function getClient(clientId: string) {
  const snap = await getDoc(doc(db, "clients", clientId));
  if (!snap.exists()) return null;
  return { clientId: snap.id, ...snap.data() } as Client;
}

export function subscribeClients(
  user: AppUser,
  limitCount: number,
  callback: (clients: Client[], rawCount: number) => void
): Unsubscribe {
  const constraints =
    user.role === "admin" || user.role === "super_admin"
      ? [orderBy("createdAt", "desc"), limit(limitCount)]
      : [where("assignedUserId", "==", user.uid), orderBy("createdAt", "desc"), limit(limitCount)];

  return onSnapshot(query(collection(db, "clients"), ...constraints), (snapshot) => {
    const rawCount = snapshot.docs.length;
    let items = snapshot.docs.map((item) => ({ clientId: item.id, ...item.data() }) as Client);
    if (!user.isGhost) {
      items = items.filter((c) => !c.isGhost);
    }
    callback(items, rawCount);
  });
}

export function subscribeClient(clientId: string, callback: (client: Client | null) => void): Unsubscribe {
  return onSnapshot(doc(db, "clients", clientId), (snapshot) => {
    callback(snapshot.exists() ? ({ clientId: snapshot.id, ...snapshot.data() } as Client) : null);
  });
}

export function subscribeDeletedClients(user: AppUser, callback: (clients: Client[]) => void): Unsubscribe {
  const constraints =
    user.role === "admin" || user.role === "super_admin"
      ? [where("deletedAt", ">=", new Timestamp(0, 0)), orderBy("deletedAt", "desc"), limit(200)]
      : [
          where("assignedUserId", "==", user.uid),
          where("deletedAt", ">=", new Timestamp(0, 0)),
          orderBy("deletedAt", "desc"),
          limit(200)
        ];

  return onSnapshot(query(collection(db, "clients"), ...constraints), (snapshot) => {
    let items = snapshot.docs.map((item) => ({ clientId: item.id, ...item.data() }) as Client);
    if (!user.isGhost) {
      items = items.filter((c) => !c.isGhost);
    }
    // Sort client-side by deletedAt desc (as a secondary guarantee)
    items.sort((a, b) => {
      const aTime = a.deletedAt?.toMillis?.() ?? 0;
      const bTime = b.deletedAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
    callback(items);
  });
}

export async function getClientsTotalCount(user: AppUser): Promise<number> {
  const isDocAdmin = user.role === "admin" || user.role === "super_admin";
  
  const baseQuery = isDocAdmin
    ? collection(db, "clients")
    : query(collection(db, "clients"), where("assignedUserId", "==", user.uid));
    
  const deletedQuery = isDocAdmin
    ? query(collection(db, "clients"), where("deletedAt", ">=", new Timestamp(0, 0)))
    : query(
        collection(db, "clients"),
        where("assignedUserId", "==", user.uid),
        where("deletedAt", ">=", new Timestamp(0, 0))
      );

  const [totalSnap, deletedSnap] = await Promise.all([
    getCountFromServer(baseQuery),
    getCountFromServer(deletedQuery),
  ]);

  return Math.max(0, totalSnap.data().count - deletedSnap.data().count);
}

export async function restoreClient(clientId: string, clientName: string, user: AppUser) {
  await updateDoc(doc(db, "clients", clientId), {
    deletedAt: null,
    deletedById: null,
    deletedByName: null,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "client_restored",
    performedBy: user.uid,
    performedByName: user.fullName,
    targetId: clientId,
    details: `Restored client ${clientName}`,
    isGhost: user.isGhost || false,
  });
}

export async function permanentDeleteClient(clientId: string, clientName: string, user: AppUser) {
  if (user.role !== "super_admin") {
    throw new Error("Unauthorized. Only Super Admins can permanently delete clients.");
  }
  await deleteDoc(doc(db, "clients", clientId));

  await writeAuditLog({
    action: "client_permanently_deleted",
    performedBy: user.uid,
    performedByName: user.fullName,
    targetId: clientId,
    details: `Permanently deleted client ${clientName}`,
    isGhost: user.isGhost || false,
  });
}
