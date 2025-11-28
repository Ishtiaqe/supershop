// Shared theme colors for consistency between global.css and providers.tsx
export const themeColors = {
  light: {
    background: { hsl: "210 40% 98%", hex: "#fafbfc" }, // Gray 50/Slate 50 mix
    foreground: { hsl: "222 47% 11%", hex: "#0f172a" }, // Slate 900
    primary: { hsl: "249 95% 60%", hex: "#4f46e5" }, // Indigo 600
    mutedForeground: { hsl: "215.4 16.3% 46.9%", hex: "#64748b" }, // Slate 500
    success: { hsl: "142 76% 36%", hex: "#16a34a" }, // Green 600
    destructive: { hsl: "0 84.2% 60.2%", hex: "#dc2626" }, // Red 600
    border: { hsl: "214.3 31.8% 91.4%", hex: "#e2e8f0" }, // Slate 200
    card: { hsl: "0 0% 100%", hex: "#ffffff" },
    muted: { hsl: "210 40% 96.1%", hex: "#f1f5f9" },
  },
  dark: {
    background: { hsl: "222 47% 11%", hex: "#0f172a" }, // Slate 950
    foreground: { hsl: "210 40% 98%", hex: "#f8fafc" }, // Slate 50
    primary: { hsl: "249 95% 65%", hex: "#6366f1" }, // Indigo 500
    mutedForeground: { hsl: "215 20.2% 65.1%", hex: "#94a3b8" }, // Slate 400
    success: { hsl: "142 70% 50%", hex: "#22c55e" }, // Green 500
    destructive: { hsl: "0 62.8% 30.6%", hex: "#ef4444" }, // Red 500
    border: { hsl: "217.2 32.6% 17.5%", hex: "#334155" }, // Slate 700
    card: { hsl: "222 47% 11%", hex: "#0f172a" },
    muted: { hsl: "217.2 32.6% 17.5%", hex: "#1e293b" },
  },
};

// Helper to get colors for a mode
export function getThemeColors(mode: 'light' | 'dark') {
  return themeColors[mode];
}