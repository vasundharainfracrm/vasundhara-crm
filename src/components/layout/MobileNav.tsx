"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const employeeLinks = [
  ["Dashboard", "/dashboard"],
  ["My Clients", "/dashboard/clients"],
  ["Follow-ups", "/dashboard/follow-ups"],
];

const adminLinks = [
  ["Dashboard", "/admin"],
  ["All Clients", "/admin/clients"],
  ["Employees", "/admin/employees"],
  ["Reports", "/admin/reports"],
  ["Audit Logs", "/admin/audit-logs"],
];

export function MobileNav({ mode }: { mode: "employee" | "admin" }) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const links = mode === "admin" ? adminLinks : employeeLinks;

  return (
    <div className="lg:hidden">
      <Button variant="secondary" size="icon" onClick={() => setOpen(true)} aria-label="Open navigation">
        <Menu className="h-4 w-4" />
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/70">
          <div className="h-full w-80 max-w-[85vw] border-r bg-background p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Vasundhra CRM</p>
                <p className="text-xs text-muted-foreground">{mode === "admin" ? "Admin" : "Employee"} workspace</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close navigation">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-6 space-y-2">
              {links.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface hover:text-foreground"
                >
                  {label}
                </Link>
              ))}
              <Button className="mt-4 w-full justify-start" variant="ghost" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
