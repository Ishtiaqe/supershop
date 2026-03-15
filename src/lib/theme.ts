// Shared theme colors for consistency between global.css and providers.tsx
export const themeColors = {
  light: {
    background: { hsl: "202 100% 98%", hex: "#f5fbff" },
    foreground: { hsl: "220 27% 14%", hex: "#1a2430" },
    primary: { hsl: "207 96% 54%", hex: "#1792fa" },
    onPrimary: { hsl: "0 0% 100%", hex: "#FFFFFF" },
    primaryContainer: { hsl: "205 100% 92%", hex: "#d6ecff" },
    onPrimaryContainer: { hsl: "213 94% 15%", hex: "#03284a" },
    mutedForeground: { hsl: "217 16% 38%", hex: "#546173" },
    secondary: { hsl: "166 73% 38%", hex: "#1aa788" },
    onSecondary: { hsl: "0 0% 100%", hex: "#FFFFFF" },
    secondaryContainer: { hsl: "162 65% 91%", hex: "#d7f6ee" },
    onSecondaryContainer: { hsl: "167 84% 15%", hex: "#04463b" },
    tertiary: { hsl: "24 95% 53%", hex: "#f97a16" },
    onTertiary: { hsl: "0 0% 100%", hex: "#FFFFFF" },
    tertiaryContainer: { hsl: "32 100% 91%", hex: "#ffe8d2" },
    onTertiaryContainer: { hsl: "23 93% 17%", hex: "#522007" },
    success: { hsl: "145 72% 38%", hex: "#1ba74f" },
    destructive: { hsl: "0 78% 57%", hex: "#e74141" },
    warning: { hsl: "39 96% 53%", hex: "#faac14" },
    warningContainer: { hsl: "41 100% 92%", hex: "#fff1d6" },
    critical: { hsl: "16 93% 52%", hex: "#f76014" },
    border: { hsl: "207 35% 86%", hex: "#cfdeeb" },
    card: { hsl: "0 0% 100%", hex: "#ffffff" },
    muted: { hsl: "205 52% 95%", hex: "#eaf3fa" },
  },
  dark: {
    background: { hsl: "0 0% 9%", hex: "#161616" },
    foreground: { hsl: "210 40% 98%", hex: "#f8fafc" },
    primary: { hsl: "206 100% 68%", hex: "#5fbaff" },
    onPrimary: { hsl: "222 47% 8%", hex: "#101625" },
    primaryContainer: { hsl: "208 72% 25%", hex: "#125987" },
    onPrimaryContainer: { hsl: "210 40% 98%", hex: "#f8fafc" },
    secondary: { hsl: "166 63% 46%", hex: "#2dc0a0" },
    onSecondary: { hsl: "0 0% 100%", hex: "#ffffff" },
    secondaryContainer: { hsl: "166 50% 22%", hex: "#1c5448" },
    onSecondaryContainer: { hsl: "164 76% 92%", hex: "#d7f8ef" },
    tertiary: { hsl: "26 100% 65%", hex: "#ff9a4c" },
    onTertiary: { hsl: "0 0% 100%", hex: "#ffffff" },
    mutedForeground: { hsl: "214 19% 70%", hex: "#9faec6" },
    success: { hsl: "147 67% 55%", hex: "#42d982" },
    destructive: { hsl: "0 81% 64%", hex: "#ed5a5a" },
    border: { hsl: "221 24% 28%", hex: "#353f58" },
    card: { hsl: "224 28% 15%", hex: "#1c2438" },
    muted: { hsl: "223 22% 23%", hex: "#2b3348" },
  },
};

// Helper to get colors for a mode
export function getThemeColors(mode: 'light' | 'dark') {
  return themeColors[mode];
}