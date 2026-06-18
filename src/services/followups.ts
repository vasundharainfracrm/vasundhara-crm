import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db, addDoc, onSnapshot, updateDoc } from "@/lib/firebase";
import { toTimestamp } from "@/services/clients";
import { writeAuditLog } from "@/services/audit";
import type { AppUser, Client, FollowUp } from "@/types";

export async function createFollowUp(
  values: { note: string; nextFollowUpDate?: string },
  client: Client,
  user: AppUser,
) {
  const nextTs = toTimestamp(values.nextFollowUpDate || "");

  // 1. Write the interaction log entry
  await addDoc(collection(db, "followups"), {
    clientId: client.clientId,
    clientName: client.fullName,
    note: values.note,
    nextFollowUpDate: nextTs,
    status: client.leadStatus,
    createdBy: user.uid,
    createdByName: user.fullName,
    createdAt: serverTimestamp(),
    isGhost: user.isGhost || false,
  });

  // 2. Update the client's followUpDate so the follow-up page reflects the new date.
  //    This clears overdue status when the employee logs an interaction with a new date.
  if (values.nextFollowUpDate) {
    await updateDoc(doc(db, "clients", client.clientId), {
      followUpDate: nextTs,
      updatedAt: serverTimestamp(),
    });
  }

  await writeAuditLog({
    action: "followup_created",
    performedBy: user.uid,
    performedByName: user.fullName,
    targetId: client.clientId,
    details: `Added follow-up for ${client.fullName}${values.nextFollowUpDate ? ` → next: ${values.nextFollowUpDate}` : ""}`,
    isGhost: user.isGhost || false,
  });
}

export function subscribeClientFollowUps(clientId: string, viewer: AppUser | null, callback: (followups: FollowUp[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "followups"), where("clientId", "==", clientId), orderBy("createdAt", "desc"), limit(50)),
    (snapshot) => {
      let items = snapshot.docs.map((item) => ({ followupId: item.id, ...item.data() }) as FollowUp);
      if (!viewer || !viewer.isGhost) {
        items = items.filter((fu) => !fu.isGhost);
      }
      callback(items);
    },
  );
}
