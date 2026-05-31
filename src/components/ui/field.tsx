import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

type FieldProps = {
  label: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, error, children }: FieldProps) {
  return (
    <div className="space-y-2 min-w-0">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
