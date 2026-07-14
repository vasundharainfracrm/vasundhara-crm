import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-normal transition-colors shadow-sm", {
  variants: {
    variant: {
      default: "border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90 dark:bg-emerald-700 dark:text-emerald-50",
      secondary: "border-transparent bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90 dark:bg-neutral-800 dark:text-neutral-100",
      warning: "border-transparent bg-amber-500 text-neutral-950 hover:bg-amber-500/90 dark:bg-amber-600 dark:text-white",
      danger: "border-transparent bg-rose-600 text-white hover:bg-rose-600/90 dark:bg-rose-700 dark:text-rose-50",
      outline: "border-border text-muted-foreground bg-transparent",
      
      // Lead stage specific solid colors
      new_lead: "border-transparent bg-blue-600 text-white hover:bg-blue-600/90 dark:bg-blue-700 dark:text-blue-50",
      contacted: "border-transparent bg-violet-600 text-white hover:bg-violet-600/90 dark:bg-violet-700 dark:text-violet-50",
      interested: "border-transparent bg-teal-600 text-white hover:bg-teal-600/90 dark:bg-teal-700 dark:text-teal-50",
      site_visit_scheduled: "border-transparent bg-orange-500 text-white hover:bg-orange-500/90 dark:bg-orange-600 dark:text-orange-50",
      negotiation: "border-transparent bg-amber-500 text-neutral-950 hover:bg-amber-500/90 dark:bg-amber-600 dark:text-white",
      closed: "border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90 dark:bg-emerald-700 dark:text-emerald-50",
      not_interested: "border-transparent bg-rose-600 text-white hover:bg-rose-600/90 dark:bg-rose-700 dark:text-rose-50",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />;
}
