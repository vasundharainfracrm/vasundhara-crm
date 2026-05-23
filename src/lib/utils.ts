import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function initials(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (
      msg.includes("auth/invalid-credential") ||
      msg.includes("auth/user-not-found") ||
      msg.includes("auth/wrong-password")
    ) {
      return "Invalid email or password.";
    }
    if (msg.includes("auth/too-many-requests")) {
      return "Too many failed attempts. Please try again later.";
    }
    if (msg.includes("auth/email-already-in-use")) {
      return "An account with this email already exists.";
    }
    if (msg.includes("auth/weak-password")) {
      return "Password should be at least 6 characters.";
    }
    if (msg.includes("auth/invalid-email")) {
      return "Please enter a valid email address.";
    }
    
    // Fallback: Strip the "Firebase: Error (...)" wrapper if present
    if (msg.startsWith("Firebase:")) {
      return msg.split("(")[0].replace("Firebase: Error", "").trim() || "Authentication failed.";
    }
    return msg;
  }
  return "An unexpected error occurred.";
}
