import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const { idToken } = (await req.json()) as { idToken?: string };
    if (!idToken) {
      return NextResponse.json({ error: "Missing id token." }, { status: 400 });
    }

    // Verify the token to get the UID
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Fetch role from Firestore (source of truth)
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    const userData = userSnap.exists ? (userSnap.data() as { role?: string; fullName?: string }) : undefined;
    const role = userData?.role ?? "employee";
    const fullName = userData?.fullName ?? decoded.email ?? decoded.uid;

    // Set the role as a Firebase custom claim so it's embedded in the session cookie JWT
    const currentClaims = decoded.firebase?.sign_in_provider ? {} : (decoded as Record<string, unknown>);
    if ((currentClaims as { role?: string }).role !== role) {
      await adminAuth.setCustomUserClaims(decoded.uid, { role });
      // Force-refresh: re-verify after claim update
      // (The new idToken from the client will carry the claim on next login)
    }

    const expiresIn = 60 * 60 * 8 * 1000; // 8 hours — §4.1 session timeout
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const cookieName = role === "admin" || role === "super_admin" ? "admin-session" : "user-session";

    // §4.11 — Log user login event
    await adminDb.collection("auditLogs").add({
      action: "user_login",
      performedBy: decoded.uid,
      performedByName: fullName,
      targetId: decoded.uid,
      details: `User logged in (role: ${role})`,
      timestamp: Timestamp.now(),
    });

    const response = NextResponse.json({ ok: true, role });
    response.cookies.set(cookieName, sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to create session." }, { status: 401 });
  }
}
