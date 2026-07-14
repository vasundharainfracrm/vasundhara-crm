import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";

const deleteEmployeeSchema = z.object({
  targetUid: z.string().min(1, "Target UID is required."),
  reassignToUid: z.string().optional().or(z.null()),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = deleteEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { targetUid, reassignToUid } = parsed.data;

    if (targetUid === admin.uid) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    const targetSnap = await adminDb.collection("users").doc(targetUid).get();
    if (!targetSnap.exists) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const targetData = targetSnap.data();
    if (targetData?.isGhost) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const targetFullName = targetData?.fullName || "Unknown";
    const now = Timestamp.now();

    // 1. Query ALL clients assigned to the target employee (including soft-deleted ones)
    const clientsSnapshot = await adminDb
      .collection("clients")
      .where("assignedUserId", "==", targetUid)
      .get();

    if (!clientsSnapshot.empty) {
      // Firestore batches max out at 500 operations — split into chunks
      const chunks: FirebaseFirestore.DocumentReference[][] = [];
      const docs = clientsSnapshot.docs;
      for (let i = 0; i < docs.length; i += 250) {
        chunks.push(docs.slice(i, i + 250).map((d) => d.ref));
      }

      if (reassignToUid) {
        // Validate the reassignment target exists and is active
        const reassignSnap = await adminDb.collection("users").doc(reassignToUid).get();
        if (!reassignSnap.exists || reassignSnap.data()?.isGhost) {
          return NextResponse.json({ error: "Reassignment target not found." }, { status: 404 });
        }
        const reassignName = reassignSnap.data()?.fullName || "Unknown";

        // Reassign ALL leads (active AND soft-deleted) to the new owner
        for (const chunk of chunks) {
          const batch = adminDb.batch();
          for (const ref of chunk) {
            batch.update(ref, {
              assignedUserId: reassignToUid,
              assignedUserName: reassignName,
              originalAssignedUserName: targetFullName,
              isOrphan: false,
              updatedAt: now,
            });
          }
          await batch.commit();
        }
      } else {
        // No reassignment — mark leads as orphaned
        for (const chunk of chunks) {
          const batch = adminDb.batch();
          for (const ref of chunk) {
            batch.update(ref, {
              isOrphan: true,
              orphanedAt: now,
              originalAssignedUserName: targetFullName,
              updatedAt: now,
            });
          }
          await batch.commit();
        }
      }
    }

    // 2. Delete Firestore User Doc
    await adminDb.collection("users").doc(targetUid).delete();

    // 3. Delete Firebase Auth User
    await adminAuth.deleteUser(targetUid);

    // 4. Log the action
    await adminDb.collection("auditLogs").add({
      action: "employee_deleted",
      performedBy: admin.uid,
      performedByName: admin.fullName,
      targetId: targetUid,
      details: `Deleted employee ${targetFullName} (${targetUid}). Leads ${
        reassignToUid ? `reassigned to ${reassignToUid}` : `orphaned (${clientsSnapshot?.size ?? 0} leads)`
      }`,
      timestamp: now,
      expireAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete employee." },
      { status: 500 },
    );
  }
}
