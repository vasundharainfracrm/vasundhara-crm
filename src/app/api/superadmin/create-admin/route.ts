import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireSuperAdmin } from "@/lib/server-auth";
import type { AdminFormValues } from "@/types";

const createAdminSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  email: z.string().email("Enter a valid email."),
  mobileNumber: z.string().min(10, "Enter a 10 digit mobile number.").regex(/^[0-9+\-\s()]+$/, "Use a valid mobile number."),
  department: z.string().min(2, "Department is required."),
  adminPermissions: z.array(z.string()).optional(),
  password: z.string().min(8, "Password must be at least 8 characters.").optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createAdminSchema.safeParse(body);
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
    });

    // Set role as a custom claim so session cookies carry it for middleware
    await adminAuth.setCustomUserClaims(authUser.uid, { role: "admin" });

    await adminDb.collection("users").doc(authUser.uid).set({
      uid: authUser.uid,
      fullName: values.fullName,
      email: values.email,
      mobileNumber: values.mobileNumber,
      role: "admin",
      department: values.department,
      adminPermissions: values.adminPermissions || [],
      status: "active",
      joiningDate: Timestamp.now(),
      createdAt: Timestamp.now(),
    });

    await adminDb.collection("auditLogs").add({
      action: "admin_created",
      performedBy: superAdmin.uid,
      performedByName: superAdmin.fullName,
      targetId: authUser.uid,
      details: `Created admin ${values.fullName}`,
      timestamp: Timestamp.now(),
      expireAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
    });

    return NextResponse.json({ uid: authUser.uid });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create admin." },
      { status: 500 },
    );
  }
}
