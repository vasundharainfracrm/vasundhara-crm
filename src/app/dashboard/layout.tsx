import { ProtectedShell } from "@/components/layout/ProtectedShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedShell mode="employee">{children}</ProtectedShell>;
}
