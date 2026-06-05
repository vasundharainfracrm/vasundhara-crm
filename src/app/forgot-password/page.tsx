"use client";

import Link from "next/link";
import { PhoneCall, ShieldAlert } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <h2 className="auth-form-title">Forgot password?</h2>
      <p className="auth-form-desc">
        Password resets for this system are managed by your administrator.
      </p>

      <div
        style={{
          borderRadius: 10,
          border: "1px solid rgba(245,158,11,0.35)",
          background: "rgba(245,158,11,0.07)",
          padding: "1rem 1.125rem",
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-start",
        }}
      >
        <ShieldAlert
          style={{ color: "var(--warning, #f59e0b)", flexShrink: 0, marginTop: 2 }}
          size={18}
        />
        <div style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "var(--foreground)" }}>
          <strong>Contact your Super Admin</strong> to have your password reset. They can assign
          you a new temporary password so you can log back in.
          <br />
          <span style={{ color: "var(--muted-foreground)", fontSize: "0.8125rem" }}>
            Once you log in, you can change your password from your profile settings.
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.8125rem",
          color: "var(--muted-foreground)",
          marginTop: "0.25rem",
        }}
      >
        <PhoneCall size={14} />
        <span>Reach out via your organisation&apos;s internal contact.</span>
      </div>

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
