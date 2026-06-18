import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

const resetPasswordSchema = z.object({
  email: z.string().email("Enter a valid email."),
  userId: z.string().optional(),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { email, userId } = parsed.data;

    const link = await adminAuth.generatePasswordResetLink(email);
    await adminDb.collection("auditLogs").add({
      action: "password_reset_link_generated",
      performedBy: admin.uid,
      performedByName: admin.fullName,
      targetId: userId || email,
      details: `Generated password reset link for ${email}`,
      timestamp: Timestamp.now(),
      expireAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
    });

    return NextResponse.json({ link });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate reset link." },
      { status: 500 },
    );
  }
}
