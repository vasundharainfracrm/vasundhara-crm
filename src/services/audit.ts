import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type AuditInput = {
  action: string;
  performedBy: string;
  performedByName: string;
  targetId: string;
  details: string;
};

export async function writeAuditLog(input: AuditInput) {
  await addDoc(collection(db, "auditLogs"), {
    ...input,
    timestamp: serverTimestamp(),
  });
}
