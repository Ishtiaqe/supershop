"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircle, Info, AlertTriangle, XOctagon, Loader2 } from "lucide-react"
import { useTheme } from "@/components/providers"

const Toaster = ({ ...props }: ToasterProps) => {
  const { mode } = useTheme()

  return (
    <Sonner
      theme={mode as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CheckCircle className="size-4" />,
        info: <Info className="size-4" />,
        warning: <AlertTriangle className="size-4" />,
        error: <XOctagon className="size-4" />,
        loading: <Loader2 className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
