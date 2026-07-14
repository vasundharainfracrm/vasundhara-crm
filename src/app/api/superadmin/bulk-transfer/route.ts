import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requireSuperAdmin } from "@/lib/server-auth";

const bulkTransferSchema = z.object({
  clientIds: z.array(z.string().min(1)).min(1, "At least one client ID is required."),
  assignedUserId: z.string().min(1, "assignedUserId is required."),
  assignedUserName: z.string().min(1, "assignedUserName is required."),
  alsoRestore: z.boolean().optional().default(false),
});

/**
 * POST /api/superadmin/bulk-transfer
 *
 * Super Admin only. Batch-transfers clients to a new owner.
 * Optionally also restores soft-deleted leads ("Transfer & Restore").
 */
export async function POST(req: Request) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = bulkTransferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { clientIds, assignedUserId, assignedUserName, alsoRestore } = parsed.data;

    // Validate the target user exists and is active
    const targetSnap = await adminDb.collection("users").doc(assignedUserId).get();
    if (!targetSnap.exists || targetSnap.data()?.isGhost) {
      return NextResponse.json({ error: "Target employee not found." }, { status: 404 });
    }
    const targetData = targetSnap.data();
    if (targetData?.status !== "active") {
      return NextResponse.json({ error: "Target employee must be active." }, { status: 400 });
    }

    const now = Timestamp.now();

    // Batch in chunks of 250 (Firestore batch limit is 500 ops)
    for (let i = 0; i < clientIds.length; i += 250) {
      const chunk = clientIds.slice(i, i + 250);
      const batch = adminDb.batch();

      for (const clientId of chunk) {
        const ref = adminDb.collection("clients").doc(clientId);
        const update: Record<string, unknown> = {
          assignedUserId,
          assignedUserName,
          isOrphan: false,
          updatedAt: now,
        };

        if (alsoRestore) {
          update.deletedAt = null;
          update.deletedById = null;
          update.deletedByName = null;
        }

        batch.update(ref, update);
      }

      await batch.commit();
    }

    // Audit log
    await adminDb.collection("auditLogs").add({
      action: alsoRestore ? "bulk_transfer_and_restore" : "bulk_transfer",
      performedBy: superAdmin.uid,
      performedByName: superAdmin.fullName,
      targetId: clientIds.join(","),
      details: `${alsoRestore ? "Transferred & restored" : "Transferred"} ${clientIds.length} client(s) to ${assignedUserName}`,
      timestamp: now,
      expireAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
    });

    return NextResponse.json({ ok: true, count: clientIds.length });
  } catch (error) {
    console.error("Bulk transfer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete bulk transfer." },
      { status: 500 },
    );
  }
}
