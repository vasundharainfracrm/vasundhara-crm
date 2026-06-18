import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { rateLimit } from "@/lib/rate-limit";

// Allow 10 login attempts per IP per 15-minute window.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: Request) {
  // ── Rate limiting ──────────────────────────────────────────────────────
  // X-Forwarded-For is set by Vercel / reverse proxies. Fall back to a
  // stable key so misconfigured proxies don't open an unlimited bypass.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  const rl = rateLimit({ key: `session:${ip}`, limit: RATE_LIMIT, windowMs: RATE_WINDOW_MS });

  if (!rl.allowed) {
    const retryAfterSeconds = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(RATE_LIMIT),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
        },
      },
    );
  }

  try {
    const { idToken } = (await req.json()) as { idToken?: string };
    if (!idToken) {
      return NextResponse.json({ error: "Missing id token." }, { status: 400 });
    }

    // Verify the token to get the UID
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Fetch role from Firestore (source of truth)
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    const userData = userSnap.exists ? (userSnap.data() as { role?: string; fullName?: string; isGhost?: boolean }) : undefined;
    const role = userData?.role ?? "employee";
    const fullName = userData?.fullName ?? decoded.email ?? decoded.uid;

    // Set the role as a Firebase custom claim so it's embedded in the session cookie JWT
    const currentClaims = decoded.firebase?.sign_in_provider ? {} : (decoded as Record<string, unknown>);
    if ((currentClaims as { role?: string }).role !== role) {
      await adminAuth.setCustomUserClaims(decoded.uid, { role });
    }

    const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 days (168 hours)
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const cookieName = role === "admin" || role === "super_admin" ? "admin-session" : "user-session";

    // §4.11 — Log user login event
    if (!userData?.isGhost) {
      await adminDb.collection("auditLogs").add({
        action: "user_login",
        performedBy: decoded.uid,
        performedByName: fullName,
        targetId: decoded.uid,
        details: `User logged in (role: ${role})`,
        timestamp: Timestamp.now(),
        expireAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
      });
    }

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

