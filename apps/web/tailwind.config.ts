import type { Config } from "tailwindcss";
import { designSystem } from "./app/lib/design-system";

export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    screens: designSystem.screens,
    colors: {
      // Include Tailwind default colors
      inherit: 'inherit',
      current: 'currentColor',
      transparent: 'transparent',
      black: '#000000',
      white: '#ffffff',
      // Gray scale
      gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
        950: '#030712'
      },
      ...designSystem.colors,
      // Theme-aware semantic colors
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      card: 'hsl(var(--card))',
      'card-foreground': 'hsl(var(--card-foreground))',
      popover: 'hsl(var(--popover))',
      'popover-foreground': 'hsl(var(--popover-foreground))',
      primary: {
        ...designSystem.colors.primary,
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))'
      },
      secondary: {
        ...designSystem.colors.secondary,
        DEFAULT: 'hsl(var(--secondary))',
        foreground: 'hsl(var(--secondary-foreground))'
      },
      muted: {
        DEFAULT: 'hsl(var(--muted))',
        foreground: 'hsl(var(--muted-foreground))'
      },
      accent: {
        DEFAULT: 'hsl(var(--accent))',
        foreground: 'hsl(var(--accent-foreground))'
      },
      destructive: {
        DEFAULT: 'hsl(var(--destructive))',
        foreground: 'hsl(var(--destructive-foreground))'
      },
      border: 'hsl(var(--border))',
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))'
    },
    fontSize: designSystem.typography.fontSize,
    fontWeight: designSystem.typography.fontWeight,
    letterSpacing: designSystem.typography.letterSpacing,
    lineHeight: designSystem.typography.lineHeight,
    spacing: designSystem.spacing,
    borderRadius: designSystem.borderRadius,
    boxShadow: designSystem.boxShadow,
    zIndex: designSystem.zIndex,
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace"
        ]
      },
      keyframes: designSystem.animation.keyframes,
      animation: {
        'fade-in': 'fadeIn 150ms ease-in-out',
        'slide-in': 'slideIn 200ms ease-in-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      backdropBlur: {
        xs: '2px'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ],
} satisfies Config;
