import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { type } = (await req.json().catch(() => ({}))) as { type?: "admin" | "employee" };
  const cookieName = type === "admin" ? "admin-session" : "user-session";

  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, "", {
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return response;
}
