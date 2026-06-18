"use client";

import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      {/* ── Left branding panel ── */}
      <div className="auth-panel">
        {/* Ambient glow blobs */}
        <div className="auth-glow auth-glow-1" />
        <div className="auth-glow auth-glow-2" />

        <div className="auth-panel-inner">
          {/* Logo */}
          <div className="auth-logo">
            <img src="/vasu-logo.png" alt="Vasundhra CRM" className="h-12 object-contain" />
            <p className="auth-logo-sub mt-2 opacity-80">Real estate lead control</p>
          </div>

          {/* Headline */}
          <div className="auth-headline">
            <h1 className="auth-headline-h1">
              Close more deals,<br />
              <span className="auth-headline-accent">faster.</span>
            </h1>
            <p className="auth-headline-body">
              A unified pipeline for your entire sales team — from first
              contact to closed deal, every follow-up tracked.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        {/* Mobile logo (shown only on small screens) */}
        <div className="auth-mobile-logo flex items-center gap-2 justify-center mb-6">
          <img src="/vasu-logo-mark.png" alt="Logo" className="h-8 w-8 object-contain rounded" />
          <p className="auth-logo-name">Vasundhra CRM</p>
        </div>

        <div className="auth-form-inner">{children}</div>
      </div>
    </div>
  );
}
