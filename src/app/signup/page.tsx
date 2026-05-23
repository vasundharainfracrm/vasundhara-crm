"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { getAuthErrorMessage } from "@/lib/utils";
import { COUNTRY_CODES } from "@/lib/countries";

export default function SignupPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const mobileNumber = `${countryCode} ${phoneNumber}`.trim();
      await register({ fullName, email, mobileNumber, department, password });
      toast.success("Account created successfully.");
      router.push("/dashboard");
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h2 className="auth-form-title">Create account</h2>
      <p className="auth-form-desc">Sign up for an employee account.</p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Full name">
          <Input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
            placeholder="Priya Sharma"
          />
        </Field>
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
        <Field label="Mobile number">
          <div className="flex gap-2">
            <div className="relative flex h-10 w-[85px] shrink-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background">
              <span>{countryCode}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 opacity-50"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
              <select
                className="absolute inset-0 w-full cursor-pointer opacity-0"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label="Country Code"
              >
                {COUNTRY_CODES.map((country) => (
                  <option key={`${country.name}-${country.code}`} value={country.code}>
                    {country.name} ({country.code})
                  </option>
                ))}
              </select>
            </div>
            <Input
              className="flex-1"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              autoComplete="tel"
              placeholder="98765 43210"
            />
          </div>
        </Field>
        <Field label="Department">
          <Input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
            placeholder="Sales"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Field>

        <Button className="w-full" type="submit" disabled={submitting}>
          {submitting ? "Creating account…" : "Sign up"}
        </Button>
      </form>

      <div className="auth-divider" />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="text-foreground hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
