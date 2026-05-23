"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";

export default function ForgotPasswordPage() {
  const { sendReset } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await sendReset(email);
      setSent(true);
      toast.success("Password reset email sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send reset email.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h2 className="auth-form-title">Reset password</h2>
      <p className="auth-form-desc">
        Enter your email and we&apos;ll send a reset link.
      </p>

      {sent ? (
        <div
          style={{
            borderRadius: 10,
            border: "1px solid rgba(16,185,129,0.3)",
            background: "rgba(16,185,129,0.07)",
            padding: "1rem 1.125rem",
            color: "var(--accent)",
            fontSize: "0.875rem",
            lineHeight: 1.6,
          }}
        >
          ✓ Check your inbox — a reset link has been sent to <strong>{email}</strong>.
        </div>
      ) : (
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
          <Button className="w-full" type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}

      <div className="auth-divider" />

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link className="text-foreground hover:underline" href="/login">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
