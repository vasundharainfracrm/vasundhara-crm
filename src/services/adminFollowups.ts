import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, Client } from "@/types";

/**
 * Subscribes to ALL clients that have a followUpDate set.
 * Ordered by followUpDate ascending (most overdue first).
 * Used by the super_admin follow-up monitor page.
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

/**
 * Subscribes to follow-up clients scoped by the viewer's role:
 *
 * - super_admin → all clients with a followUpDate
 * - admin       → own leads + leads assigned to employees (role==='employee')
 *                 — other admins' leads are excluded
 *
 * Returns an unsubscribe function.
 */
export function subscribeFollowUpClients(
  viewer: AppUser,
  callback: (clients: Client[]) => void,
): Unsubscribe {
  // Super admin sees everything — delegate to existing function.
  if (viewer.role === "super_admin") {
    return subscribeAllFollowUpClients(callback);
  }

  // Admin: fetch all follow-up clients then filter to own + employees only.
  // We first load the set of employee UIDs (role === "employee") so we can
  // exclude leads that belong to other admins.
  let latestClients: Client[] = [];
  let employeeUids: Set<string> = new Set();
  let settled = false;

  // Kick off a one-time fetch of all user roles to build the employee set.
  // We refresh it whenever the client snapshot fires to stay current.
  async function fetchEmployeeUids() {
    const snap = await getDocs(collection(db, "users"));
    employeeUids = new Set(
      snap.docs
        .filter((d) => (d.data() as AppUser).role === "employee")
        .map((d) => d.id),
    );
  }

  function emit() {
    if (!settled) return;
    const allowed = latestClients.filter(
      (c) =>
        c.assignedUserId === viewer.uid ||
        employeeUids.has(c.assignedUserId),
    );
    callback(allowed);
  }

  // Subscribe to follow-up clients (all, then filter client-side).
  const unsub = onSnapshot(
    query(
      collection(db, "clients"),
      where("followUpDate", "!=", null),
      orderBy("followUpDate", "asc"),
      limit(500),
    ),
    async (snapshot) => {
      latestClients = snapshot.docs
        .map((d) => ({ clientId: d.id, ...d.data() }) as Client)
        .filter((c) => !c.deletedAt);

      // Re-fetch employee UIDs on each snapshot to handle new hires.
      await fetchEmployeeUids();
      settled = true;
      emit();
    },
  );

  return unsub;
}
