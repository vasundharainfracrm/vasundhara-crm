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
    if (targetSnap.data()?.isGhost) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // 1. Reassign clients if requested
    if (reassignToUid) {
      const clientsSnapshot = await adminDb.collection("clients").where("assignedTo", "==", targetUid).get();
      if (!clientsSnapshot.empty) {
        const batch = adminDb.batch();
        clientsSnapshot.docs.forEach((doc) => {
          batch.update(doc.ref, { 
            assignedTo: reassignToUid,
            updatedAt: Timestamp.now()
          });
        });
        await batch.commit();
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
      details: `Deleted employee ${targetUid}. Leads reassigned to: ${reassignToUid || "None (Orphaned)"}`,
      timestamp: Timestamp.now(),
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
