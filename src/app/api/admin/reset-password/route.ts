import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const { email, userId } = (await req.json()) as { email?: string; userId?: string };
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

    const link = await adminAuth.generatePasswordResetLink(email);
    await adminDb.collection("auditLogs").add({
      action: "password_reset_link_generated",
      performedBy: admin.uid,
      performedByName: admin.fullName,
      targetId: userId || email,
      details: `Generated password reset link for ${email}`,
      timestamp: Timestamp.now(),
    });

    return NextResponse.json({ link });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate reset link." },
      { status: 500 },
    );
  }
}
