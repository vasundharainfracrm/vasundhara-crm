"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Dialog } from "@/components/ui/dialog";

const employeeLinks = [
  ["Dashboard", "/dashboard"],
  ["My Clients", "/dashboard/clients"],
  ["Follow-ups", "/dashboard/follow-ups"],
];

const adminLinks = [
  ["Dashboard", "/admin"],
  ["All Clients", "/admin/clients"],
  ["Employees", "/admin/employees"],
  ["Follow-ups", "/admin/follow-ups"],
  ["Reports", "/admin/reports"],
  ["Audit Logs", "/admin/audit-logs"],
];

export function MobileNav({ mode }: { mode: "employee" | "admin" }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { logout } = useAuth();
  const links = mode === "admin" ? adminLinks : employeeLinks;

  const handleLogoutClick = () => {
    setOpen(false);
    setLogoutOpen(true);
  };

  const confirmLogout = () => {
    setLogoutOpen(false);
    logout();
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <Button variant="secondary" size="icon" onClick={() => setOpen(true)} aria-label="Open navigation">
        <Menu className="h-4 w-4" />
      </Button>
      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex">
              <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
                onClick={() => setOpen(false)} 
                aria-hidden="true" 
              />
              <div className="relative z-10 flex h-full w-80 max-w-[85vw] flex-col border-r bg-background p-4 shadow-xl overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src="/vasu-logo-mark.png" alt="Logo" className="h-8 w-8 object-contain rounded" />
                    <div>
                      <p className="text-sm font-semibold">Vasundhra CRM</p>
                      <p className="text-xs text-muted-foreground">
                        {mode === "admin" ? "Admin" : "Employee"} workspace
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close navigation">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-6 flex flex-col space-y-2 flex-1">
                  {links.map(([label, href]) => (
                    <Link
                      key={href}
                      href={href}
                      prefetch={false}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface hover:text-foreground"
                    >
                      {label}
                    </Link>
                  ))}
                  <div className="mt-auto pt-4">
                    <Button className="w-full justify-start text-muted-foreground hover:text-foreground" variant="ghost" onClick={handleLogoutClick}>
                      Logout
                    </Button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <Dialog 
        open={logoutOpen} 
        onOpenChange={setLogoutOpen}
        title="Confirm Logout"
        description="Are you sure you want to end your session?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLogoutOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmLogout}>Sign out</Button>
          </>
        }
      >
        <p className="text-sm">You will need to sign in again to access the dashboard.</p>
      </Dialog>
    </div>
  );
}
