"use client";

import { useState } from "react";

import Link from "next/link";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { getAuthErrorMessage } from "@/lib/utils";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      sessionStorage.setItem("login_toast", "Welcome back.");
      // Hard reload so firebase.ts re-initializes under the correct URL namespace
      window.location.href = loggedInUser?.role === "admin" ? "/admin" : "/dashboard";
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h2 className="auth-form-title">Sign in</h2>
      <p className="auth-form-desc">Use your employee or admin credentials.</p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
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
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="auth-divider" />

      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <Link className="hover:text-foreground transition-colors" href="/forgot-password">
          Forgot your password?
        </Link>
        <span>
          Don&apos;t have an account?{" "}
          <Link className="text-foreground hover:underline" href="/signup">
            Create account
          </Link>
        </span>
        <a
          className="mt-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          href="/admin/login"
        >
          Admin portal →
        </a>
      </div>
    </AuthShell>
  );
}
