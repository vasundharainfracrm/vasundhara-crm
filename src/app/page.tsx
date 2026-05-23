import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = (await cookies()).get("session")?.value;
  redirect(session ? "/dashboard" : "/login");
}
