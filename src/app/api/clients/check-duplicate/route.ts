import { NextResponse } from "next/server";
import type { DocumentData, QuerySnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/server-auth";
import { normalizePhone } from "@/lib/utils";

export async function POST(req: Request) {
  // Auth gate — prevent unauthenticated phone/email enumeration
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { primaryMobile, alternateMobile, email } = (await req.json()) as {
      primaryMobile?: string;
      alternateMobile?: string;
      email?: string;
    };

    const primary = normalizePhone(primaryMobile || "");
    const alternate = normalizePhone(alternateMobile || "");

    if (!primary) {
      return NextResponse.json({ error: "Primary mobile is required." }, { status: 400 });
    }

    const checks = [
      adminDb.collection("clients").where("primaryMobile", "==", primary).limit(1).get(),
      alternate ? adminDb.collection("clients").where("alternateMobile", "==", alternate).limit(1).get() : null,
      // Email is an optional secondary check — only run if non-empty
      email ? adminDb.collection("clients").where("email", "==", email).limit(1).get() : null,
    ].filter(Boolean) as Promise<QuerySnapshot<DocumentData>>[];

    const results = await Promise.all(checks);
    for (const snapshot of results) {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0].data();
        return NextResponse.json({
          isDuplicate: true,
          ownerName: doc.assignedUserName || "another employee",
        });
      }
    }

    return NextResponse.json({ isDuplicate: false });
  } catch {
    return NextResponse.json({ error: "Duplicate check failed." }, { status: 500 });
  }
}
