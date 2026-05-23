"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function DuplicateWarningModal({
  open,
  ownerName,
  onClose,
}: {
  open: boolean;
  ownerName?: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title="Client Already Registered"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="text-sm text-muted-foreground">
          This client&apos;s mobile number is already registered in the system.
        </p>
        <div className="rounded-lg border bg-background p-3 text-sm">
          Registered under: <span className="font-semibold text-foreground">{ownerName || "another employee"}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          You cannot add this client. Contact your admin if you believe this is an error.
        </p>
      </div>
    </Dialog>
  );
}
