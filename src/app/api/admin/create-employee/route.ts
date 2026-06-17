import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/server-auth";
import { employeeSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const body = await req.json();

    // Server-side validation — client-side Zod can be bypassed via direct API calls
    const parsed = employeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const values = parsed.data;
    const authUser = await adminAuth.createUser({
      email: values.email,
      password: values.password || Math.random().toString(36).slice(2, 12),
      displayName: values.fullName,
      phoneNumber: values.mobileNumber.startsWith("+") ? values.mobileNumber : undefined,
      disabled: values.status === "inactive",
    });

    // Set role as a custom claim so session cookies carry it for middleware
    await adminAuth.setCustomUserClaims(authUser.uid, { role: "employee" });


    await adminDb.collection("users").doc(authUser.uid).set({
      uid: authUser.uid,
      fullName: values.fullName,
      email: values.email,
      mobileNumber: values.mobileNumber,
      role: "employee",
      department: values.department,
      status: values.status,
      joiningDate: Timestamp.now(),
      createdAt: Timestamp.now(),
    });

    await adminDb.collection("auditLogs").add({
      action: "employee_created",
      performedBy: admin.uid,
      performedByName: admin.fullName,
      targetId: authUser.uid,
      details: `Created employee ${values.fullName}`,
      timestamp: Timestamp.now(),
      expireAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
    });

    return NextResponse.json({ uid: authUser.uid });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create employee." },
      { status: 500 },
    );
  }
}
