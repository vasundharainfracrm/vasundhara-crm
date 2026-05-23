"use client";

import React from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type BreadcrumbEntry = {
  label: string;
  href?: string;
};

type PageBreadcrumbProps = {
  crumbs: BreadcrumbEntry[];
  className?: string;
};

export function PageBreadcrumb({ crumbs, className }: PageBreadcrumbProps) {
  return (
    <div className={`px-4 pt-5 pb-1 lg:px-8 ${className ?? ""}`}>
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <BreadcrumbItem>
                {crumb.href ? (
                  // Use Next.js Link for client-side navigation — avoids full page
                  // reload that would clear Firebase auth state and trigger redirect.
                  <Link
                    href={crumb.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <BreadcrumbPage className="text-sm font-medium">{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {idx < crumbs.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
