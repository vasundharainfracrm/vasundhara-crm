import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasAdminSession = cookieStore.get("admin-session")?.value;
  const hasUserSession = cookieStore.get("user-session")?.value;
  // Legacy single-cookie fallback
  const hasLegacySession = cookieStore.get("session")?.value;

  if (hasUserSession || hasLegacySession) redirect("/dashboard");
  if (hasAdminSession) redirect("/admin");
  redirect("/login");
}
