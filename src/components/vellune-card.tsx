import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function VelluneCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("vellune-card min-w-0 rounded-2xl border border-border bg-card text-card-foreground", className)} {...props} />;
}