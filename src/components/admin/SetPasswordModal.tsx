"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface SetPasswordModalProps {
  targetUid: string;
  targetName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetPasswordModal({
  targetUid,
  targetName,
  open,
  onOpenChange,
}: SetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setNewPassword("");
      setConfirmPassword("");
      setShowNew(false);
      setShowConfirm(false);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit() {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid, newPassword }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to set password.");

      toast.success(`Password updated for ${targetName}. They will need to log in again.`);
      handleClose(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to set password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title={`Set Password — ${targetName}`}
      description="Assign a new temporary password. The user will be logged out immediately and must sign in with this password."
      footer={
        <>
          <Button variant="secondary" onClick={() => handleClose(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting…
              </>
            ) : (
              <>
                <KeyRound className="mr-2 h-4 w-4" />
                Set Password
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-1">
        <Field label="New password">
          <div className="relative">
            <Input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="pr-10"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowNew((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Field label="Confirm new password">
          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="pr-10"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {newPassword && confirmPassword && newPassword !== confirmPassword && (
          <p className="text-sm text-destructive">Passwords do not match.</p>
        )}
      </div>
    </Dialog>
  );
}
