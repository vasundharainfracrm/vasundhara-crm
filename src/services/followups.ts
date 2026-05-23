import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toTimestamp } from "@/services/clients";
import { writeAuditLog } from "@/services/audit";
import type { AppUser, Client, FollowUp, LeadStatus } from "@/types";

export async function createFollowUp(
  values: { note: string; nextFollowUpDate?: string; status: LeadStatus },
  client: Client,
  user: AppUser,
) {
  await addDoc(collection(db, "followups"), {
    clientId: client.clientId,
    clientName: client.fullName,
    note: values.note,
    nextFollowUpDate: toTimestamp(values.nextFollowUpDate || ""),
    status: values.status,
    createdBy: user.uid,
    createdByName: user.fullName,
    createdAt: serverTimestamp(),
  });

  await writeAuditLog({
    action: "followup_created",
    performedBy: user.uid,
    performedByName: user.fullName,
    targetId: client.clientId,
    details: `Added follow-up for ${client.fullName}`,
  });
}

export function subscribeClientFollowUps(clientId: string, callback: (followups: FollowUp[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "followups"), where("clientId", "==", clientId), orderBy("createdAt", "desc"), limit(50)),
    (snapshot) => callback(snapshot.docs.map((item) => ({ followupId: item.id, ...item.data() }) as FollowUp)),
  );
}

export function subscribeMyFollowUps(user: AppUser, callback: (followups: FollowUp[]) => void): Unsubscribe {
  const constraints =
    user.role === "admin"
      ? [orderBy("createdAt", "desc"), limit(100)]
      : [where("createdBy", "==", user.uid), orderBy("nextFollowUpDate", "asc"), limit(100)];

  return onSnapshot(query(collection(db, "followups"), ...constraints), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ followupId: item.id, ...item.data() }) as FollowUp));
  });
}
