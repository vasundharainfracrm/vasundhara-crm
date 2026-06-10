import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Client } from "@/types";

/**
 * Subscribes to ALL clients that have a followUpDate set.
 * Ordered by followUpDate ascending (most overdue first).
 * Used by the admin follow-up monitor page.
 */
export function subscribeAllFollowUpClients(
  callback: (clients: Client[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "clients"),
      where("followUpDate", "!=", null),
      orderBy("followUpDate", "asc"),
      limit(500),
    ),
    (snapshot) =>
      callback(
        snapshot.docs
          .map((d) => ({ clientId: d.id, ...d.data() }) as Client)
          .filter((c) => !c.deletedAt),
      ),
  );
}
