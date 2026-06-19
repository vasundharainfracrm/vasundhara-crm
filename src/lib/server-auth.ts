import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import type { AppUser } from "@/types";

/**
 * §4.1 — Reads the typed session cookie (admin-session or user-session),
 * verifies it server-side with checkRevoked=true, and returns the Firestore user.
 * Returns null if missing, expired, or revoked.
 */
export async function getSessionUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  // Support both new typed cookies and legacy single cookie
  const session =
    cookieStore.get("admin-session")?.value ??
    cookieStore.get("user-session")?.value ??
    cookieStore.get("session")?.value;

  if (!session) return null;

  let decoded;
  try {
    // checkRevoked=true enforces server-side revocation (e.g. after password reset)
    decoded = await adminAuth.verifySessionCookie(session, true);
  } catch {
    return null;
  }

  try {
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userSnap.exists) return null;
    const user = { uid: decoded.uid, ...(userSnap.data() as Omit<AppUser, "uid">) } as AppUser;

    // Enforce soft billing switch (bypass for admin and super_admin roles)
    if (user.role !== "admin" && user.role !== "super_admin") {
      const { checkServerBillingLimit, isUserBypassed } = await import("./billing-guard");
      const isBypassed = await isUserBypassed(user.uid);
      if (!isBypassed) {
        await checkServerBillingLimit();
      }
    }

    return user;
  } catch (err: any) {
    if (err.message?.includes("Resource Exhausted")) {
      throw err; // Propagate resource exhausted errors so API/Server Actions abort immediately
    }
    return null;
  }
}

export async function requireAdmin(): Promise<AppUser | null> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return null;
  }
  return user;
}

export async function requireSuperAdmin(): Promise<AppUser | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    return null;
  }
  return user;
}
