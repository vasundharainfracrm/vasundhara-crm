"use client";

import { ChevronLeft, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

type TopBarProps = {
  title: string;
  description?: string;
  mode: "employee" | "admin";
  ctaHref?: string;
  ctaLabel?: string;
  /** If provided, shows a bordered back button in the navbar that navigates here */
  backHref?: string;
};

export function TopBar({ title, mode, ctaHref, ctaLabel, backHref }: TopBarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="flex min-h-16 items-center gap-3 px-4 lg:px-8">
        <MobileNav mode={mode} />

        {/* Back button — only shown when backHref is provided */}
        {backHref && (
          <button
            onClick={() => router.push(backHref)}
            title="Go back"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-accent hover:bg-surface hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{title}</h1>
        </div>

        <div className="hidden w-64 items-center gap-2 rounded-lg border bg-surface px-3 focus-within:ring-2 focus-within:ring-accent md:flex">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            className="flex h-9 w-full bg-transparent px-0 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border-0 shadow-none"
            placeholder="Search workspace"
          />
        </div>

        {ctaHref ? (
          <Link href={ctaHref} className={cn(buttonVariants(), "inline-flex items-center gap-2")}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{ctaLabel}</span>
          </Link>
        ) : null}

        <ThemeToggle />
      </div>
    </header>
  );
}
