import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireSuperAdmin } from "@/lib/server-auth";

/**
 * POST /api/superadmin/handover
 *
 * Super Admin only. Performs a one-way, irreversible Super Admin handover:
 *   1. Verifies the target is an existing active admin
 *   2. Atomically swaps roles in Firestore (batch write)
 *   3. Updates Firebase Auth custom claims for both users
 *   4. Revokes old super_admin's refresh tokens (force logout)
 *   5. Writes audit log for both users
 */
export async function POST(req: Request) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  }

  try {
    const { newSuperAdminUid } = (await req.json()) as { newSuperAdminUid?: string };

    if (!newSuperAdminUid) {
      return NextResponse.json({ error: "newSuperAdminUid is required." }, { status: 400 });
    }

    if (newSuperAdminUid === superAdmin.uid) {
      return NextResponse.json({ error: "Cannot transfer Super Admin to yourself." }, { status: 400 });
    }

    // Verify the target is an existing active admin
    const targetSnap = await adminDb.collection("users").doc(newSuperAdminUid).get();
    if (!targetSnap.exists) {
      return NextResponse.json({ error: "Target admin not found." }, { status: 404 });
    }
    const targetData = targetSnap.data() as { role?: string; fullName?: string; status?: string };
    if (targetData.role !== "admin") {
      return NextResponse.json(
        { error: "Only existing admins can receive Super Admin privileges." },
        { status: 400 },
      );
    }
    if (targetData.status !== "active") {
      return NextResponse.json({ error: "Target admin must be active." }, { status: 400 });
    }

    const now = Timestamp.now();

    // Atomic Firestore batch: swap roles
    const batch = adminDb.batch();

    batch.update(adminDb.collection("users").doc(superAdmin.uid), {
      role: "admin",
      handoverAt: now,
      handoverTo: newSuperAdminUid,
    });

    batch.update(adminDb.collection("users").doc(newSuperAdminUid), {
      role: "super_admin",
      receivedSuperAdminAt: now,
      receivedSuperAdminFrom: superAdmin.uid,
    });

    // Audit log — outgoing
    const outgoingRef = adminDb.collection("auditLogs").doc();
    batch.set(outgoingRef, {
      action: "super_admin_handover_sent",
      performedBy: superAdmin.uid,
      performedByName: superAdmin.fullName,
      targetId: newSuperAdminUid,
      details: `Super Admin transferred to ${targetData.fullName ?? newSuperAdminUid}`,
      timestamp: now,
    });

    // Audit log — incoming
    const incomingRef = adminDb.collection("auditLogs").doc();
    batch.set(incomingRef, {
      action: "super_admin_handover_received",
      performedBy: superAdmin.uid,
      performedByName: superAdmin.fullName,
      targetId: newSuperAdminUid,
      details: `${targetData.fullName ?? newSuperAdminUid} received Super Admin privileges from ${superAdmin.fullName}`,
      timestamp: now,
    });

    await batch.commit();

    // Update Firebase Auth custom claims (must be done after batch succeeds)
    await adminAuth.setCustomUserClaims(newSuperAdminUid, { role: "super_admin" });
    await adminAuth.setCustomUserClaims(superAdmin.uid, { role: "admin" });

    // Force logout the old super admin — their refresh tokens are now invalid
    await adminAuth.revokeRefreshTokens(superAdmin.uid);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete handover." },
      { status: 500 },
    );
  }
}
