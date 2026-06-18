"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth-context";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { ClientsProvider } from "@/lib/clients-context";
import { Button } from "@/components/ui/button";
import { Clock, Play } from "lucide-react";

export function ProtectedShell({
  mode,
  children,
}: {
  mode: "employee" | "admin";
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { isInactive, resume } = useInactivityLogout();

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

  if (isInactive) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/50 backdrop-blur-xl animate-in fade-in duration-300">
        <div className="relative w-full max-w-md p-8 rounded-2xl border bg-surface/80 shadow-2xl text-center flex flex-col items-center space-y-6 mx-4 border-border">
          {/* Subtle glowing elements in backdrop */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

          {/* Animated Icon Container */}
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 text-accent border border-accent/20 animate-pulse">
            <Clock className="w-10 h-10 animate-spin" style={{ animationDuration: "8s" }} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Session Paused</h2>
            <p className="text-sm text-muted-foreground leading-relaxed px-2">
              For security and bandwidth efficiency, your active database connection was suspended. Click below to instantly resume your work.
            </p>
          </div>

          <Button 
            onClick={resume} 
            className="w-full flex items-center justify-center gap-2 group relative overflow-hidden transition-all duration-300 active:scale-95 shadow-md hover:bg-emerald-400"
          >
            <Play className="w-4 h-4 transition-transform group-hover:scale-110" />
            Resume Session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ClientsProvider user={user}>
      <div className="min-h-screen bg-background text-foreground lg:flex">
        <Sidebar mode={mode} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </ClientsProvider>
  );
}
