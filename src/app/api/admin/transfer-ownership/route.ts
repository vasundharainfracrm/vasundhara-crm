import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

// Payload schema — validated server-side before any DB write.
const transferOwnershipSchema = z.object({
  clientId: z.string().min(1, "clientId is required."),
  assignedUserId: z.string().min(1, "assignedUserId is required."),
  assignedUserName: z.string().min(2, "assignedUserName is required."),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const body = await req.json();

    // Server-side validation — client-side Zod can be bypassed via direct API calls
    const parsed = transferOwnershipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { clientId, assignedUserId, assignedUserName } = parsed.data;

    await adminDb.collection("clients").doc(clientId).update({
      assignedUserId,
      assignedUserName,
      updatedAt: Timestamp.now(),
    });

    await adminDb.collection("auditLogs").add({
      action: "ownership_transferred",
      performedBy: admin.uid,
      performedByName: admin.fullName,
      targetId: clientId,
      details: `Transferred ownership to ${assignedUserName}`,
      timestamp: Timestamp.now(),
      expireAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to transfer ownership." },
      { status: 500 },
    );
  }
}

