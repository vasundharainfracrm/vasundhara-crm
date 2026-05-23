"use client";

import { usePathname } from "next/navigation";
import { ProtectedShell } from "@/components/layout/ProtectedShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The /admin/login page must not be wrapped in ProtectedShell
  // (it's the unauthenticated entry point for admins)
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return <ProtectedShell mode="admin">{children}</ProtectedShell>;
}
