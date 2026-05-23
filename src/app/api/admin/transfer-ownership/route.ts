import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const { clientId, assignedUserId, assignedUserName } = (await req.json()) as {
      clientId?: string;
      assignedUserId?: string;
      assignedUserName?: string;
    };

    if (!clientId || !assignedUserId || !assignedUserName) {
      return NextResponse.json({ error: "Client and new owner are required." }, { status: 400 });
    }

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
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to transfer ownership." },
      { status: 500 },
    );
  }
}
