// Shared theme colors for consistency between global.css and providers.tsx
export const themeColors = {
  light: {
    background: { hsl: "234 100% 99%", hex: "#FDFBFF" }, // Off-white
    foreground: { hsl: "210 21% 11%", hex: "#1A1C1E" },
    primary: { hsl: "217 100% 61%", hex: "#3a86ff" }, // Azure
    onPrimary: { hsl: "0 0% 100%", hex: "#FFFFFF" },
    primaryContainer: { hsl: "219 100% 92%", hex: "#D6E4FF" },
    onPrimaryContainer: { hsl: "210 100% 11%", hex: "#001C38" },
    mutedForeground: { hsl: "215.4 16.3% 46.9%", hex: "#64748b" }, // Slate 500
    secondary: { hsl: "265 83% 57%", hex: "#8338ec" },
    onSecondary: { hsl: "0 0% 100%", hex: "#FFFFFF" },
    secondaryContainer: { hsl: "259 100% 93%", hex: "#E8DDFF" },
    onSecondaryContainer: { hsl: "261 100% 18%", hex: "#21005D" },
    tertiary: { hsl: "334 100% 50%", hex: "#ff006e" },
    onTertiary: { hsl: "0 0% 100%", hex: "#FFFFFF" },
    tertiaryContainer: { hsl: "345 100% 92%", hex: "#FFD9E3" },
    onTertiaryContainer: { hsl: "345 100% 11%", hex: "#3E0018" },
    success: { hsl: "142 76% 36%", hex: "#16a34a" }, // Green 600
    destructive: { hsl: "0 84.2% 60.2%", hex: "#dc2626" }, // Red 600
    warning: { hsl: "44 92% 52%", hex: "#ffbe0b" },
    warningContainer: { hsl: "48 100% 94%", hex: "#FFF5CC" },
    critical: { hsl: "19 97% 50%", hex: "#fb5607" },
    border: { hsl: "214.3 31.8% 91.4%", hex: "#e2e8f0" }, // Slate 200
    card: { hsl: "0 0% 100%", hex: "#ffffff" },
    muted: { hsl: "210 40% 96.1%", hex: "#f1f5f9" },
  },
  dark: {
    background: { hsl: "222 47% 11%", hex: "#0f172a" }, // Slate 950
    foreground: { hsl: "210 40% 98%", hex: "#f8fafc" }, // Slate 50
    primary: { hsl: "217 100% 75%", hex: "#8fb6ff" }, // lighter azure for dark
    onPrimary: { hsl: "0 0% 10%", hex: "#111827" },
    primaryContainer: { hsl: "217 70% 20%", hex: "#0d355a" },
    onPrimaryContainer: { hsl: "210 40% 98%", hex: "#f8fafc" },
    secondary: { hsl: "265 83% 50%", hex: "#7a2ee0" },
    onSecondary: { hsl: "0 0% 100%", hex: "#ffffff" },
    secondaryContainer: { hsl: "259 30% 12%", hex: "#23143a" },
    onSecondaryContainer: { hsl: "261 100% 94%", hex: "#f4f0ff" },
    tertiary: { hsl: "334 100% 60%", hex: "#ff4c8d" },
    onTertiary: { hsl: "0 0% 100%", hex: "#ffffff" },
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