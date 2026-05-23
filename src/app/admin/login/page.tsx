"use client";

import { useState } from "react";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { getAuthErrorMessage } from "@/lib/utils";

export default function AdminLoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      if (loggedInUser?.role !== "admin" && loggedInUser?.role !== "super_admin") {
        await fetch("/api/auth/logout", { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "employee" }),
        });
        toast.error("Access denied. This portal is for administrators only.");
        setSubmitting(false);
        return;
      }
      sessionStorage.setItem("login_toast", "Welcome, Admin.");
      // Hard reload so firebase.ts re-initializes under the /admin namespace
      window.location.href = "/admin";
    } catch (err) {
      toast.error(getAuthErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h2 className="auth-form-title">Admin Sign in</h2>
      <p className="auth-form-desc">Restricted access — administrators only.</p>

      {/* Form */}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Admin email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="admin@vasundhra.com"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </Field>

        <Button className="w-full" type="submit" disabled={submitting}>
          {submitting ? "Verifying…" : "Sign in to Admin Portal"}
        </Button>
      </form>

      <div className="auth-divider" />

      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <Link className="hover:text-foreground transition-colors" href="/forgot-password">
          Forgot your password?
        </Link>
        <Link
          className="mt-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          href="/login"
        >
          ← Back to Employee login
        </Link>
      </div>
    </AuthShell>
  );
}
