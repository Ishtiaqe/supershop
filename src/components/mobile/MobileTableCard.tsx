"use client";

import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface MobileTableCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MobileTableCard({
  children,
  className,
  onClick,
}: MobileTableCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-sm",
        onClick && "active:scale-[0.99] transition-transform cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

interface MobileTableCardRowProps {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}

export function MobileTableCardRow({
  label,
  value,
  className,
}: MobileTableCardRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-1.5 text-sm border-b border-border/50 last:border-0",
        className
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
