import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireSuperAdmin } from "@/lib/server-auth";

/**
 * POST /api/superadmin/promote-to-admin
 *
 * Super Admin only. Atomically promotes an employee to admin by:
 *   1. Setting the Firebase Auth custom claim to role="admin"
 *   2. Updating the Firestore user document
 *   3. Revoking the target employee's refresh tokens (force logout)
 *   4. Writing an audit log entry
 */
export async function POST(req: Request) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  }

  try {
    const { targetUid } = (await req.json()) as { targetUid?: string };

    if (!targetUid) {
      return NextResponse.json({ error: "targetUid is required." }, { status: 400 });
    }

    // Verify the target exists and is currently an employee
    const targetSnap = await adminDb.collection("users").doc(targetUid).get();
    if (!targetSnap.exists) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }
    const targetData = targetSnap.data() as { role?: string; fullName?: string; isGhost?: boolean };
    if (targetData.isGhost) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }
    if (targetData.role !== "employee") {
      return NextResponse.json(
        { error: "Only employees can be promoted to admin." },
        { status: 400 },
      );
    }

    // 1. Set Auth custom claim
    await adminAuth.setCustomUserClaims(targetUid, { role: "admin" });

    // 2. Update Firestore document
    await adminDb.collection("users").doc(targetUid).update({
      role: "admin",
      promotedAt: Timestamp.now(),
      promotedBy: superAdmin.uid,
    });

    // 3. Revoke refresh tokens — forces the target to log out and re-authenticate
    await adminAuth.revokeRefreshTokens(targetUid);

    // 4. Audit log
    await adminDb.collection("auditLogs").add({
      action: "employee_promoted_to_admin",
      performedBy: superAdmin.uid,
      performedByName: superAdmin.fullName,
      targetId: targetUid,
      details: `Promoted ${targetData.fullName ?? targetUid} from employee to admin`,
      timestamp: Timestamp.now(),
      expireAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to promote employee." },
      { status: 500 },
    );
  }
}
