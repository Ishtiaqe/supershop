"use client";

import { cn } from "@/lib/utils";
import { useEffect, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  className,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-lg mx-auto rounded-t-2xl bg-background shadow-2xl outline-none animate-in slide-in-from-bottom-10 duration-300",
          "max-h-[70vh] overflow-hidden flex flex-col",
          className
        )}
      >
        <div
          className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-3 mb-2 shrink-0"
          aria-hidden="true"
        />
        {title && (
          <div className="px-4 py-3 border-b border-border shrink-0">
            <div className="text-lg font-semibold">{title}</div>
          </div>
        )}
        <div className="overflow-y-auto p-4 pb-safe">{children}</div>
      </div>
    </div>
  );
}
