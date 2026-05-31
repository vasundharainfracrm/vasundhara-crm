"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ── Compound sub-components (used by delete confirmation dialogs etc.) ──

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-2", className)}>{children}</div>;
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-lg font-semibold", className)}>{children}</h2>;
}

export function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-1 text-sm text-muted-foreground", className)}>{children}</p>;
}

// ── Original monolithic Dialog (kept for backwards compat) ──

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Dialog({ open, onOpenChange, title, description, children, footer }: DialogProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenChange, open]);

  if (!open || !mounted) return null;

  const dialogContent = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <button className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={() => onOpenChange(false)} />
      <div className={cn("relative w-full max-w-md rounded-lg border bg-surface shadow-2xl")}>
        {title ? (
          <div className="flex items-start justify-between gap-4 border-b p-5">
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-end p-3 pb-0">
            <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="p-5">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t p-5">{footer}</div> : null}
      </div>
    </div>
  );
  
  const { createPortal } = require("react-dom");
  return createPortal(dialogContent, document.body);
}
