import {
  collection,
  limit,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db, getDocs, onSnapshot } from "@/lib/firebase";
import type { AppUser, Client } from "@/types";

/**
 * Subscribes to ALL clients that have a followUpDate set.
 * Ordered by followUpDate ascending (most overdue first).
 * Used by the super_admin follow-up monitor page.
 */
export function subscribeAllFollowUpClients(
  viewer: AppUser,
  callback: (clients: Client[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "clients"),
      where("followUpDate", "!=", null),
      orderBy("followUpDate", "asc"),
      limit(2000),
    ),
    (snapshot) => {
      let items = snapshot.docs
        .map((d) => ({ clientId: d.id, ...d.data() }) as Client)
        .filter((c) => !c.deletedAt);
      if (!viewer.isGhost) {
        items = items.filter((c) => !c.isGhost);
      }
      callback(items);
    },
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
    return subscribeAllFollowUpClients(viewer, callback);
  }

  let latestClients: Client[] = [];
  let employeeUids: Set<string> = new Set();
  let clientsSettled = false;
  let usersSettled = false;

  function emit() {
    if (!clientsSettled || !usersSettled) return;
    let allowed = latestClients.filter(
      (c) =>
        c.assignedUserId === viewer.uid ||
        employeeUids.has(c.assignedUserId),
    );
    if (!viewer.isGhost) {
      allowed = allowed.filter((c) => !c.isGhost);
    }
    callback(allowed);
  }

  // Subscribe to users once to build and maintain the employee set
  const unsubUsers = onSnapshot(
    collection(db, "users"),
    (snapshot) => {
      employeeUids = new Set(
        snapshot.docs
          .filter((d) => (d.data() as AppUser).role === "employee")
          .map((d) => d.id),
      );
      usersSettled = true;
      emit();
    },
    (error) => {
      console.error("subscribeFollowUpClients users sub error:", error);
    }
  );

  // Subscribe to follow-up clients
  const unsubClients = onSnapshot(
    query(
      collection(db, "clients"),
      where("followUpDate", "!=", null),
      orderBy("followUpDate", "asc"),
      limit(2000),
    ),
    (snapshot) => {
      latestClients = snapshot.docs
        .map((d) => ({ clientId: d.id, ...d.data() }) as Client)
        .filter((c) => !c.deletedAt);
      clientsSettled = true;
      emit();
    },
    (error) => {
      console.error("subscribeFollowUpClients clients sub error:", error);
    }
  );

  return () => {
    unsubUsers();
    unsubClients();
  };
}
