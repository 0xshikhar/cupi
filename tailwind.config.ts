import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
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
        // Peanut-inspired Palette
        background: "#FFF5F5", // Soft Cream/Pink background
        foreground: "#000000",

        // Brand Colors
        cupi: {
          pink: "#FFD1DC", // Primary Brand Pink
          cream: "#FFF5F5", // Background
          black: "#000000", // Text/Borders
          green: "#4ADE80", // Success
          red: "#FF4444",   // Error
        },

        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#000000",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#000000",
        },
        primary: {
          DEFAULT: "#FFD1DC", // Brand Pink
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "#FFFFFF",
          foreground: "#000000",
        },
        muted: {
          DEFAULT: "#F5F5F5",
          foreground: "#666666",
        },
        accent: {
          DEFAULT: "#FFD1DC",
          foreground: "#000000",
        },
        destructive: {
          DEFAULT: "#FF4444",
          foreground: "#FFFFFF",
        },
        border: "#000000", // High contrast borders
        input: "#FFFFFF",
        ring: "#FFD1DC",
        chart: {
          "1": "#FFD1DC",
          "2": "#FFB8C6",
          "3": "#FF9EAF",
          "4": "#FF8498",
          "5": "#FF6B81",
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
