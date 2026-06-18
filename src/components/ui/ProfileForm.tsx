"use client";

import { useState } from "react";
import { doc } from "firebase/firestore";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, updateDoc } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

export function ProfileForm() {
  const { user, firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    mobileNumber: user?.mobileNumber || "",
  });

  // Change-password state
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!user) return null;

  // ── Profile update ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.mobileNumber.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      await updateDoc(doc(db, "users", user.uid), {
        fullName: formData.fullName,
        mobileNumber: formData.mobileNumber,
      });
      toast.success("Profile updated successfully");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // ── Password change ───────────────────────────────────────────────────────
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firebaseUser || !firebaseUser.email) {
      toast.error("Unable to verify identity. Please log out and log back in.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (pwForm.currentPassword === pwForm.newPassword) {
      toast.error("New password must be different from your current password.");
      return;
    }

    setPwLoading(true);
    try {
      // Step 1: Re-authenticate to verify current password
      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        pwForm.currentPassword,
      );
      await reauthenticateWithCredential(firebaseUser, credential);

      // Step 2: Update the password
      await updatePassword(firebaseUser, pwForm.newPassword);

      toast.success("Password changed successfully. Use your new password next time you log in.");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("Current password is incorrect.");
      } else if (code === "auth/requires-recent-login") {
        toast.error("Session expired. Please log out and log back in before changing your password.");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to change password.");
      }
    } finally {
      setPwLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const PasswordToggle = ({
    show,
    onToggle,
  }: {
    show: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      tabIndex={-1}
      onClick={onToggle}
      className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Profile Info ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Update your personal information here.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email address cannot be changed.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={user.role.replace(/_/g, " ")} disabled className="bg-muted capitalize" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input
                id="mobileNumber"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Change Password ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Enter your current password to verify your identity, then set a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  placeholder="Your current password"
                  className="pr-10"
                  required
                />
                <PasswordToggle show={showCurrent} onToggle={() => setShowCurrent((v) => !v)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  placeholder="Min. 8 characters"
                  className="pr-10"
                  required
                />
                <PasswordToggle show={showNew} onToggle={() => setShowNew((v) => !v)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  className="pr-10"
                  required
                />
                <PasswordToggle show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
              </div>
              {pwForm.newPassword &&
                pwForm.confirmPassword &&
                pwForm.newPassword !== pwForm.confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match.</p>
                )}
            </div>

            <Button
              type="submit"
              disabled={pwLoading}
              className="mt-2"
            >
              {pwLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
