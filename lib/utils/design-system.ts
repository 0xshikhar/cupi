/**
 * Stratifi Design System
 *
 * This file contains standardized design tokens and utility functions
 * to maintain a consistent, premium appearance across the application.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const colors = {
  // Primary brand colors
  brand: {
    purple: {
      50: "#f5f3ff",
      100: "#ede9fe",
      200: "#ddd6fe",
      300: "#c4b5fd",
      400: "#a78bfa",
      500: "#8b5cf6",
      600: "#7c3aed", // Primary brand color
      700: "#6d28d9",
      800: "#5b21b6",
      900: "#4c1d95",
      950: "#2e1065",
    },
    indigo: {
      50: "#eef2ff",
      100: "#e0e7ff",
      200: "#c7d2fe",
      300: "#a5b4fc",
      400: "#818cf8",
      500: "#6366f1",
      600: "#4f46e5", // Secondary brand color
      700: "#4338ca",
      800: "#3730a3",
      900: "#312e81",
      950: "#1e1b4b",
    },
  },

  // UI colors
  ui: {
    background: {
      primary: "#0a0a0c", // Main app background
      secondary: "#121218", // Sidebar, cards
      tertiary: "#1a1a23", // Inputs, buttons
      glass: "rgba(18, 18, 24, 0.7)",
    },
    border: {
      light: "rgba(255, 255, 255, 0.1)",
      medium: "rgba(255, 255, 255, 0.15)",
      heavy: "rgba(255, 255, 255, 0.25)",
      glow: "rgba(124, 58, 237, 0.3)", // Purple glow
    },
    text: {
      primary: "#ffffff",
      secondary: "rgba(255, 255, 255, 0.7)",
      tertiary: "rgba(255, 255, 255, 0.5)",
      brand: "#8b5cf6", // Purple
      success: "#10b981", // Green
      warning: "#f59e0b", // Amber
      error: "#ef4444", // Red
    },
  },

  // Chart & visualization colors
  chart: {
    purple: "#7c3aed",
    indigo: "#4f46e5",
    blue: "#3b82f6",
    cyan: "#06b6d4",
    green: "#10b981",
    yellow: "#f59e0b",
    red: "#ef4444",
    pink: "#ec4899",
  },

  // Gradients
  gradients: {
    brand: "linear-gradient(to right, #7c3aed, #4f46e5)",
    glass:
      "linear-gradient(to bottom right, rgba(28, 27, 35, 0.5), rgba(18, 18, 24, 0.5))",
    success: "linear-gradient(to right, #059669, #10b981)",
    warning: "linear-gradient(to right, #d97706, #f59e0b)",
    error: "linear-gradient(to right, #dc2626, #ef4444)",
  },
};

// Typography scale (in pixels)
export const typography = {
  size: {
    "2xs": "10px", // Super small text
    xs: "12px", // Small labels
    sm: "14px", // Secondary text
    base: "16px", // Body text
    lg: "18px", // Sub-headings
    xl: "20px", // Small headings
    "2xl": "24px", // Medium headings
    "3xl": "30px", // Large headings
    "4xl": "36px", // Extra large headings
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  family: {
    sans: "'Sequel Sans Display Book', 'Sequel Sans Display Book Placeholder', '-apple-system', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'",
    mono: "'JetBrains Mono', monospace",
  },
};

// Spacing scale (in pixels)
export const spacing = {
  px: "1px",
  0: "0",
  0.5: "2px",
  1: "4px",
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "12px",
  3.5: "14px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "28px",
  8: "32px",
  9: "36px",
  10: "40px",
  11: "44px",
  12: "48px",
  14: "56px",
  16: "64px",
  20: "80px",
  24: "96px",
  28: "112px",
  32: "128px",
  36: "144px",
  40: "160px",
  44: "176px",
  48: "192px",
  52: "208px",
  56: "224px",
  60: "240px",
  64: "256px",
  72: "288px",
  80: "320px",
  96: "384px",
};

// Border radiuses
export const borderRadius = {
  none: "0",
  sm: "0.125rem",
  md: "0.25rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  "3xl": "1.5rem",
  full: "9999px",
};

// Shadows
export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  glow: {
    sm: "0 0 5px rgba(124, 58, 237, 0.3)",
    md: "0 0 10px rgba(124, 58, 237, 0.4)",
    lg: "0 0 15px rgba(124, 58, 237, 0.5)",
  },
};

// Responsive breakpoints
export const breakpoints = {
  xs: "480px", // Extra small devices (phones)
  sm: "640px", // Small devices (large phones, portrait tablets)
  md: "768px", // Medium devices (landscape tablets)
  lg: "1024px", // Large devices (laptops)
  xl: "1280px", // Extra large devices (desktops)
  "2xl": "1536px", // 2X large devices (large desktops)
};

// Z-index scale
export const zIndex = {
  0: "0",
  10: "10", // Base elements
  20: "20", // Dropdown menus, tooltips
  30: "30", // Modals, dialogs
  40: "40", // Overlays
  50: "50", // Maximum level for normal UI
  auto: "auto",
};

// Animation timing
export const animation = {
  faster: "100ms",
  fast: "200ms",
  normal: "300ms",
  slow: "500ms",
  slower: "700ms",
};

// Helper function to generate CSS variables
export const generateCssVariables = () => {
  let cssVars = "";

  // Colors
  Object.entries(colors.brand.purple).forEach(([key, value]) => {
    cssVars += `--color-brand-purple-${key}: ${value};\n`;
  });

  Object.entries(colors.brand.indigo).forEach(([key, value]) => {
    cssVars += `--color-brand-indigo-${key}: ${value};\n`;
  });

  Object.entries(colors.ui.background).forEach(([key, value]) => {
    cssVars += `--color-bg-${key}: ${value};\n`;
  });

  // Typography
  Object.entries(typography.size).forEach(([key, value]) => {
    cssVars += `--font-size-${key}: ${value};\n`;
  });

  // Spacing
  Object.entries(spacing).forEach(([key, value]) => {
    cssVars += `--spacing-${key}: ${value};\n`;
  });

  return cssVars;
};

// Common design utility functions
export const designUtils = {
  // Generate truncated text with ellipsis
  truncateText: (maxWidth: string) => `
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: ${maxWidth};
  `,

  // Glass effect for panels
  glassEffect: (opacity: number = 0.7) => `
    background: rgba(18, 18, 24, ${opacity});
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  `,

  // Custom scrollbar styling
  customScrollbar: () => `
    &::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: rgba(124, 58, 237, 0.5);
      border-radius: 3px;
    }
    
    &::-webkit-scrollbar-thumb:hover {
      background: rgba(124, 58, 237, 0.7);
    }
  `,
};

// Export all design tokens
export const designSystem = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  zIndex,
  animation,
  utils: designUtils,
};
