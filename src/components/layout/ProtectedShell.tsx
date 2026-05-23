"use client";

import { useEffect } from "react";

import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth-context";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";

export function ProtectedShell({
  mode,
  children,
}: {
  mode: "employee" | "admin";
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  useInactivityLogout();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      fetch("/api/auth/logout", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: mode }),
      }).finally(() => {
        window.location.href = mode === "admin" ? "/admin/login" : "/login";
      });
      return;
    }
    if (mode === "admin" && user.role !== "admin" && user.role !== "super_admin") {
      window.location.href = "/dashboard";
      return;
    }
    if (mode === "employee" && user.status === "pending_approval") {
      window.location.href = "/pending-approval";
      return;
    }
  }, [loading, mode, user]);

  useEffect(() => {
    if (!loading && user) {
      const toastMessage = sessionStorage.getItem("login_toast");
      if (toastMessage) {
        toast.success(toastMessage);
        sessionStorage.removeItem("login_toast");
      }
    }
  }, [loading, user]);

  const isUnauthorizedAdmin = mode === "admin" && user?.role !== "admin" && user?.role !== "super_admin";
  const isPendingEmployee = mode === "employee" && user?.status === "pending_approval";

  if (loading || !user || isUnauthorizedAdmin || isPendingEmployee) {
    return (
      <div className="min-h-screen bg-background text-foreground lg:flex">
        {/* Skeleton Sidebar */}
        <aside className="hidden h-screen w-72 shrink-0 border-r bg-background/95 p-4 lg:sticky lg:top-0 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 rounded-lg px-2 py-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="my-4 h-[1px] w-full bg-border" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
          <div className="mt-auto space-y-4">
            <div className="h-[1px] w-full bg-border" />
            <div className="flex items-center gap-3 px-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        </aside>

        {/* Skeleton Main Content */}
        <main className="min-w-0 flex-1 p-4 lg:p-8 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl mt-8" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <Sidebar mode={mode} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
