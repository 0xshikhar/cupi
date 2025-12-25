import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-share-tech-mono)",
          "IBM Plex Mono",
          "Monaco",
          "Courier New",
          "monospace",
        ],
        mono: [
          "var(--font-share-tech-mono)",
          "IBM Plex Mono",
          "Monaco",
          "Courier New",
          "monospace",
        ],
        display: [
          "var(--font-orbitron)",
          "Inter",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.75rem" }], // 10px
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        // Premium Retro-Tech - Institutional Dark
        background: "#000000",
        foreground: "#E0E0E0",
        card: {
          DEFAULT: "#0F0F0F",
          foreground: "#E0E0E0",
        },
        popover: {
          DEFAULT: "#0F0F0F",
          foreground: "#E0E0E0",
        },
        primary: {
          DEFAULT: "#00FF95",
          foreground: "#000000",
          50: "rgba(0, 255, 149, 0.1)",
          100: "rgba(0, 255, 149, 0.2)",
          200: "rgba(0, 255, 149, 0.3)",
          300: "rgba(0, 255, 149, 0.4)",
          400: "rgba(0, 255, 149, 0.5)",
          500: "#00FF95",
          600: "#3AFFB5",
          700: "#00FF95",
          800: "#00FF95",
          900: "#00FF95",
        },
        secondary: {
          DEFAULT: "#0A0A0A",
          foreground: "#9A9A9A",
        },
        muted: {
          DEFAULT: "#0F0F0F",
          foreground: "#666666",
        },
        accent: {
          DEFAULT: "#3AFFB5",
          foreground: "#000000",
        },
        destructive: {
          DEFAULT: "#FF4444",
          foreground: "#E0E0E0",
        },
        border: "#1A1A1A",
        input: "#1A1A1A",
        ring: "#00FF95",
        chart: {
          "1": "#00FF95",
          "2": "#3AFFB5",
          "3": "#FF4444",
          "4": "#00FF88",
          "5": "#FFB800",
        },
        // Success, warning, error colors - Refined
        success: {
          DEFAULT: "#00FF88",
          foreground: "#000000",
          light: "rgba(0, 255, 136, 0.1)",
        },
        warning: {
          DEFAULT: "#FFB800",
          foreground: "#000000",
          light: "rgba(255, 184, 0, 0.1)",
        },
        error: {
          DEFAULT: "#FF4444",
          foreground: "#E0E0E0",
          light: "rgba(255, 68, 68, 0.1)",
        },
        // Premium grays - Institutional
        gray: {
          50: "#000000",
          100: "#0A0A0A",
          200: "#0F0F0F",
          300: "#1A1A1A",
          400: "#1A1A1A",
          500: "#666666",
          600: "#9A9A9A",
          700: "#9A9A9A",
          800: "#E0E0E0",
          900: "#E0E0E0",
        },
      },
      screens: {
        xs: "480px",
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
