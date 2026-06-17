import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireSuperAdmin } from "@/lib/server-auth";

/**
 * POST /api/admin/set-password
 *
 * Super Admin only. Directly overrides the password of any employee or admin
 * without sending a reset email:
 *   1. Validates the target user exists
 *   2. Updates the password in Firebase Auth
 *   3. Revokes the target's refresh tokens (force logout)
 *   4. Writes an audit log entry
 */
export async function POST(req: Request) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  }

  try {
    const { targetUid, newPassword } = (await req.json()) as {
      targetUid?: string;
      newPassword?: string;
    };

    if (!targetUid) {
      return NextResponse.json({ error: "targetUid is required." }, { status: 400 });
    }
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 },
      );
    }

    // Verify target user exists and is not another super_admin
    const targetSnap = await adminDb.collection("users").doc(targetUid).get();
    if (!targetSnap.exists) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const targetData = targetSnap.data() as { role?: string; fullName?: string; email?: string; isGhost?: boolean };
    if (targetData.isGhost) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (targetData.role === "super_admin") {
      return NextResponse.json(
        { error: "Cannot override the password of a Super Admin account." },
        { status: 403 },
      );
    }

    // 1. Override the password in Firebase Auth
    await adminAuth.updateUser(targetUid, { password: newPassword });

    // 2. Revoke refresh tokens — forces the target to log in again
    await adminAuth.revokeRefreshTokens(targetUid);

    // 3. Audit log
    await adminDb.collection("auditLogs").add({
      action: "password_overridden",
      performedBy: superAdmin.uid,
      performedByName: superAdmin.fullName,
      targetId: targetUid,
      details: `Super Admin overrode password for ${targetData.fullName ?? targetData.email ?? targetUid}`,
      timestamp: Timestamp.now(),
      expireAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to set password." },
      { status: 500 },
    );
  }
}
