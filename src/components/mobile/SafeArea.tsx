"use client";

import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface SafeAreaProps {
  children: ReactNode;
  className?: string;
  bottom?: boolean;
  top?: boolean;
}

export function SafeArea({
  children,
  className,
  bottom = true,
  top = true,
}: SafeAreaProps) {
  return (
    <div
      className={cn(
        "min-h-screen-safe",
        top && "pt-safe",
        bottom && "pb-safe",
        className
      )}
    >
      {children}
    </div>
  );
}
