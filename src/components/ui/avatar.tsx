import { cn, initials } from "@/lib/utils";

export function Avatar({ name, className }: { name?: string | null; className?: string }) {
  return (
    <div className={cn("flex h-9 w-9 items-center justify-center rounded-full border bg-surface-2 text-xs font-semibold", className)}>
      {initials(name)}
    </div>
  );
}
