"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ComponentType } from "react";
import { BarChart3, BriefcaseBusiness, ChevronLeft, ChevronRight, ClipboardList, Home, LogOut, ScrollText, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const employeeNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "My Clients", href: "/dashboard/clients", icon: BriefcaseBusiness },
  { label: "Follow-ups", href: "/dashboard/follow-ups", icon: ClipboardList },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: Home },
  { label: "All Clients", href: "/admin/clients", icon: BriefcaseBusiness },
  { label: "Employees", href: "/admin/employees", icon: Users },
  { label: "Follow-ups", href: "/admin/follow-ups", icon: ClipboardList },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
];

export function Sidebar({ mode }: { mode: "employee" | "admin" }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const nav = mode === "admin" ? adminNav : employeeNav;
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const confirmLogout = () => {
    setLogoutOpen(false);
    logout();
  };

  return (
    <>
      <aside 
        className={cn(
          "hidden h-screen shrink-0 border-r bg-background/95 p-4 lg:sticky lg:top-0 lg:flex lg:flex-col transition-all duration-300",
          isCollapsed ? "w-[80px]" : "w-72"
        )}
      >
        <div className="flex items-center justify-between mb-4">
          {!isCollapsed && (
            <Link href={mode === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-3 rounded-lg px-2 flex-1 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">Vasundhra CRM</p>
                  {mode === "admin" ? <Badge variant="secondary" className="px-1 py-0 text-[10px]">ADMIN</Badge> : null}
                </div>
              </div>
            </Link>
          )}
          {isCollapsed && (
            <Link href={mode === "admin" ? "/admin" : "/dashboard"} className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold" title="Vasundhra CRM">
              V
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6 shrink-0", isCollapsed && "mx-auto mt-4 absolute -right-3 top-6 bg-surface border rounded-full shadow-sm z-10")}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </Button>
        </div>

        <Separator className="mb-4" />

        <nav className="space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition hover:bg-surface hover:text-foreground",
                  active && "bg-surface text-foreground",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2">
          <Separator className="mb-4" />
          
          <Link
            href={mode === "admin" ? "/admin/profile" : "/dashboard/profile"}
            title={isCollapsed ? "Profile Settings" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition hover:bg-surface hover:text-foreground",
              pathname.includes("/profile") && "bg-surface text-foreground",
              isCollapsed && "justify-center px-0"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span className="truncate">Profile Settings</span>}
          </Link>

          <Button 
            className={cn("w-full h-10 text-muted-foreground hover:text-foreground", isCollapsed ? "justify-center px-0" : "justify-start px-3")} 
            variant="ghost" 
            onClick={() => setLogoutOpen(true)}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span className="ml-3 truncate">Logout</span>}
          </Button>
          
          {!isCollapsed && (
            <div className="flex items-center gap-3 px-2 pt-2">
              <Avatar name={user?.fullName} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user?.fullName || "User"}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

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
    </>
  );
}
