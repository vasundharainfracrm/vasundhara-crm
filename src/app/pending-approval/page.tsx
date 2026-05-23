"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PendingApprovalPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.status !== "pending_approval")) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface border border-border">
          <Clock className="h-10 w-10 text-emerald-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Waiting for Approval</h1>
          <p className="text-muted-foreground">
            Your account has been created successfully. An administrator needs to approve your access before you can view the dashboard.
          </p>
        </div>

        <div className="pt-8">
          <Button variant="secondary" onClick={logout} className="w-full border-border/50 text-muted-foreground hover:text-foreground">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
