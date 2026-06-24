/** @type {import('tailwindcss').Config} */
const { heroui } = require("@heroui/react");
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        surface: "hsl(var(--surface))",
        'surface-foreground': "hsl(var(--surface-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          container: "hsl(var(--primary-container))",
          "on-container": "hsl(var(--primary-on-container))",
          hover: "hsl(var(--primary-hover))",
          active: "hsl(var(--primary-active))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          container: "hsl(var(--secondary-container))",
          "on-container": "hsl(var(--secondary-on-container))",
        },
        tertiary: {
          DEFAULT: "hsl(var(--tertiary))",
          foreground: "hsl(var(--tertiary-foreground))",
          container: "hsl(var(--tertiary-container))",
          "on-container": "hsl(var(--tertiary-on-container))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          container: "hsl(var(--warning-container))",
        },
        critical: {
          DEFAULT: "hsl(var(--critical))",
          foreground: "hsl(var(--critical-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        outline: "hsl(var(--outline))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    heroui({
      layout: {
        radius: {
          small: "8px",
          medium: "10px",
          large: "14px",
        },
        borderWidth: {
          small: "1px",
          medium: "1px",
          large: "1.5px",
        },
      },
      themes: {
        light: {
          colors: {
            background: "#f5f7fa",
            foreground: "#1a1f2e",
            primary: {
              DEFAULT: "#1a8fe8",
              foreground: "#ffffff",
            },
            success: {
              DEFAULT: "#1a9e5c",
              foreground: "#ffffff",
            },
            danger: {
              DEFAULT: "#d93025",
              foreground: "#ffffff",
            },
            warning: {
              DEFAULT: "#f59e0b",
              foreground: "#1a0f00",
            },
            default: {
              DEFAULT: "#e8edf2",
              foreground: "#1a1f2e",
            },
            content1: "#ffffff",
            content2: "#f8fafc",
            content3: "#f1f5f9",
            content4: "#e2e8f0",
            divider: "#e2e8f0",
          },
        },
        dark: {
          colors: {
            background: "#0f1117",
            foreground: "#e8edf6",
            primary: {
              DEFAULT: "#4da6f5",
              foreground: "#0a1628",
            },
            success: {
              DEFAULT: "#3dd68c",
              foreground: "#00200e",
            },
            danger: {
              DEFAULT: "#f07070",
              foreground: "#ffffff",
            },
            warning: {
              DEFAULT: "#fbbf24",
              foreground: "#1a0f00",
            },
            default: {
              DEFAULT: "#1e2433",
              foreground: "#e8edf6",
            },
            content1: "#161b27",
            content2: "#1a2030",
            content3: "#1e2538",
            content4: "#232a40",
            divider: "#2a3347",
          },
        },
      },
    }),
  ],
}
