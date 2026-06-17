import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type AuditInput = {
  action: string;
  performedBy: string;
  performedByName: string;
  targetId: string;
  details: string;
  isGhost?: boolean;
};

export async function writeAuditLog(input: AuditInput) {
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + 90);

  await addDoc(collection(db, "auditLogs"), {
    ...input,
    timestamp: serverTimestamp(),
    expireAt: expireDate,
  });
}
