import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    screens: {
      xs: "375px",
      sm: "375px", 
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1440px",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-family-sans)"],
        mono: ["var(--font-family-mono)"],
        serif: ["var(--font-family-serif)"],
      },
      fontSize: {
        xs: ["var(--font-size-xs)", { lineHeight: "var(--line-height-tight)" }],
        sm: ["var(--font-size-sm)", { lineHeight: "var(--line-height-snug)" }],
        base: ["var(--font-size-base)", { lineHeight: "var(--line-height-normal)" }],
        lg: ["var(--font-size-lg)", { lineHeight: "var(--line-height-normal)" }],
        xl: ["var(--font-size-xl)", { lineHeight: "var(--line-height-snug)" }],
        "2xl": ["var(--font-size-2xl)", { lineHeight: "var(--line-height-tight)" }],
        "3xl": ["var(--font-size-3xl)", { lineHeight: "var(--line-height-tight)" }],
        "4xl": ["var(--font-size-4xl)", { lineHeight: "var(--line-height-none)" }],
        "5xl": ["var(--font-size-5xl)", { lineHeight: "var(--line-height-none)" }],
        "6xl": ["var(--font-size-6xl)", { lineHeight: "var(--line-height-none)" }],
        "7xl": ["var(--font-size-7xl)", { lineHeight: "var(--line-height-none)" }],
        "8xl": ["var(--font-size-8xl)", { lineHeight: "var(--line-height-none)" }],
        "9xl": ["var(--font-size-9xl)", { lineHeight: "var(--line-height-none)" }],
      },
      spacing: {
        "0": "var(--spacing-0)",
        "px": "var(--spacing-px)",
        "0.5": "var(--spacing-0-5)",
        "1": "var(--spacing-1)",
        "1.5": "var(--spacing-1-5)",
        "2": "var(--spacing-2)",
        "2.5": "var(--spacing-2-5)",
        "3": "var(--spacing-3)",
        "3.5": "var(--spacing-3-5)",
        "4": "var(--spacing-4)",
        "5": "var(--spacing-5)",
        "6": "var(--spacing-6)",
        "7": "var(--spacing-7)",
        "8": "var(--spacing-8)",
        "9": "var(--spacing-9)",
        "10": "var(--spacing-10)",
        "11": "var(--spacing-11)",
        "12": "var(--spacing-12)",
        "14": "var(--spacing-14)",
        "16": "var(--spacing-16)",
        "20": "var(--spacing-20)",
        "24": "var(--spacing-24)",
        "28": "var(--spacing-28)",
        "32": "var(--spacing-32)",
        "36": "var(--spacing-36)",
        "40": "var(--spacing-40)",
        "44": "var(--spacing-44)",
        "48": "var(--spacing-48)",
        "52": "var(--spacing-52)",
        "56": "var(--spacing-56)",
        "60": "var(--spacing-60)",
        "64": "var(--spacing-64)",
        "72": "var(--spacing-72)",
        "80": "var(--spacing-80)",
        "96": "var(--spacing-96)",
      },
      colors: {
        primary: {
          50: "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          200: "var(--color-primary-200)",
          300: "var(--color-primary-300)",
          400: "var(--color-primary-400)",
          500: "var(--color-primary-500)",
          600: "var(--color-primary-600)",
          700: "var(--color-primary-700)",
          800: "var(--color-primary-800)",
          900: "var(--color-primary-900)",
          950: "var(--color-primary-950)",
        },
        secondary: {
          50: "var(--color-secondary-50)",
          100: "var(--color-secondary-100)",
          200: "var(--color-secondary-200)",
          300: "var(--color-secondary-300)",
          400: "var(--color-secondary-400)",
          500: "var(--color-secondary-500)",
          600: "var(--color-secondary-600)",
          700: "var(--color-secondary-700)",
          800: "var(--color-secondary-800)",
          900: "var(--color-secondary-900)",
          950: "var(--color-secondary-950)",
        },
        success: {
          50: "var(--color-success-50)",
          100: "var(--color-success-100)",
          200: "var(--color-success-200)",
          300: "var(--color-success-300)",
          400: "var(--color-success-400)",
          500: "var(--color-success-500)",
          600: "var(--color-success-600)",
          700: "var(--color-success-700)",
          800: "var(--color-success-800)",
          900: "var(--color-success-900)",
          950: "var(--color-success-950)",
        },
        warning: {
          50: "var(--color-warning-50)",
          100: "var(--color-warning-100)",
          200: "var(--color-warning-200)",
          300: "var(--color-warning-300)",
          400: "var(--color-warning-400)",
          500: "var(--color-warning-500)",
          600: "var(--color-warning-600)",
          700: "var(--color-warning-700)",
          800: "var(--color-warning-800)",
          900: "var(--color-warning-900)",
          950: "var(--color-warning-950)",
        },
        error: {
          50: "var(--color-error-50)",
          100: "var(--color-error-100)",
          200: "var(--color-error-200)",
          300: "var(--color-error-300)",
          400: "var(--color-error-400)",
          500: "var(--color-error-500)",
          600: "var(--color-error-600)",
          700: "var(--color-error-700)",
          800: "var(--color-error-800)",
          900: "var(--color-error-900)",
          950: "var(--color-error-950)",
        },
        info: {
          50: "var(--color-info-50)",
          100: "var(--color-info-100)",
          200: "var(--color-info-200)",
          300: "var(--color-info-300)",
          400: "var(--color-info-400)",
          500: "var(--color-info-500)",
          600: "var(--color-info-600)",
          700: "var(--color-info-700)",
          800: "var(--color-info-800)",
          900: "var(--color-info-900)",
          950: "var(--color-info-950)",
        },
        background: {
          primary: "var(--color-background-primary)",
          secondary: "var(--color-background-secondary)",
          tertiary: "var(--color-background-tertiary)",
          elevated: "var(--color-background-elevated)",
          overlay: "var(--color-background-overlay)",
        },
        surface: {
          primary: "var(--color-surface-primary)",
          secondary: "var(--color-surface-secondary)",
          tertiary: "var(--color-surface-tertiary)",
          hover: "var(--color-surface-hover)",
          pressed: "var(--color-surface-pressed)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
          disabled: "var(--color-text-disabled)",
          inverse: "var(--color-text-inverse)",
          link: "var(--color-text-link)",
          "link-hover": "var(--color-text-link-hover)",
        },
        border: {
          primary: "var(--color-border-primary)",
          secondary: "var(--color-border-secondary)",
          tertiary: "var(--color-border-tertiary)",
          focus: "var(--color-border-focus)",
          error: "var(--color-border-error)",
          success: "var(--color-border-success)",
          warning: "var(--color-border-warning)",
        },
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        inner: "var(--shadow-inner)",
        focus: "var(--shadow-focus)",
        none: "var(--shadow-none)",
        primary: "var(--shadow-primary)",
        secondary: "var(--shadow-secondary)",
        success: "var(--shadow-success)",
        warning: "var(--shadow-warning)",
        error: "var(--shadow-error)",
        info: "var(--shadow-info)",
      },
      transitionDuration: {
        instant: "var(--duration-instant)",
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        moderate: "var(--duration-moderate)",
        slow: "var(--duration-slow)",
        slower: "var(--duration-slower)",
        slowest: "var(--duration-slowest)",
      },
      transitionTimingFunction: {
        smooth: "var(--easing-smooth)",
        bounce: "var(--easing-bounce)",
        spring: "var(--easing-spring)",
        sharp: "var(--easing-sharp)",
        emphasized: "var(--easing-emphasized)",
      },
      animation: {
        "fade-in": "var(--animation-fade-in)",
        "fade-out": "var(--animation-fade-out)",
        "slide-up": "var(--animation-slide-up)",
        "slide-down": "var(--animation-slide-down)",
        "slide-left": "var(--animation-slide-left)",
        "slide-right": "var(--animation-slide-right)",
        "scale-up": "var(--animation-scale-up)",
        "scale-down": "var(--animation-scale-down)",
        bounce: "var(--animation-bounce)",
        pulse: "var(--animation-pulse)",
        spin: "var(--animation-spin)",
      },
      container: {
        center: true,
        padding: {
          DEFAULT: "1rem",
          sm: "1rem",
          md: "1.5rem",
          lg: "2rem",
          xl: "2.5rem",
          "2xl": "3rem",
        },
        screens: {
          sm: "375px",
          md: "768px",
          lg: "1024px",
          xl: "1280px",
          "2xl": "1440px",
        },
      },
    },
  },
  plugins: [
    function ({ addUtilities, addComponents }) {
      // Semantic Component Utilities
      addComponents({
        '.btn-base': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '0.375rem',
          fontWeight: '500',
          transition: 'var(--transition-button)',
          cursor: 'pointer',
          '&:disabled': {
            opacity: '0.5',
            cursor: 'not-allowed',
          },
        },
        '.input-base': {
          width: '100%',
          borderRadius: '0.375rem',
          border: '1px solid var(--color-border-primary)',
          backgroundColor: 'var(--color-surface-primary)',
          color: 'var(--color-text-primary)',
          transition: 'var(--transition-input)',
          '&:focus': {
            outline: 'none',
            borderColor: 'var(--color-border-focus)',
            boxShadow: 'var(--shadow-focus)',
          },
          '&:disabled': {
            opacity: '0.5',
            cursor: 'not-allowed',
          },
        },
        '.card-base': {
          backgroundColor: 'var(--color-surface-primary)',
          borderRadius: '0.5rem',
          border: '1px solid var(--color-border-primary)',
          transition: 'var(--transition-card)',
        },
        '.modal-base': {
          backgroundColor: 'var(--color-background-elevated)',
          borderRadius: '0.5rem',
          boxShadow: 'var(--elevation-modal)',
          border: '1px solid var(--color-border-primary)',
        },
      });

      // Adaptive Density Utilities
      addUtilities({
        '.density-compact': {
          '--density-spacing-xs': '0.25rem',
          '--density-spacing-sm': '0.5rem',
          '--density-spacing-md': '0.75rem',
          '--density-spacing-lg': '1rem',
          '--density-spacing-xl': '1.25rem',
          '--density-font-size': '0.75rem',
          '--density-line-height': '1rem',
          '--density-button-height': '32px',
          '--density-input-height': '32px',
          '--density-icon-size': '16px',
          '--density-padding': '0.5rem',
          '--density-gap': '0.5rem',
          '--density-header-height': '44px',
          '--density-navigation-height': '48px',
          '--density-sidebar-width': '240px',
          '--density-panel-width': '260px',
        },
        '.density-normal': {
          '--density-spacing-xs': '0.375rem',
          '--density-spacing-sm': '0.75rem',
          '--density-spacing-md': '1rem',
          '--density-spacing-lg': '1.25rem',
          '--density-spacing-xl': '1.5rem',
          '--density-font-size': '0.875rem',
          '--density-line-height': '1.25rem',
          '--density-button-height': '36px',
          '--density-input-height': '36px',
          '--density-icon-size': '18px',
          '--density-padding': '0.75rem',
          '--density-gap': '0.75rem',
          '--density-header-height': '52px',
          '--density-navigation-height': '56px',
          '--density-sidebar-width': '260px',
          '--density-panel-width': '280px',
        },
        '.density-comfortable': {
          '--density-spacing-xs': '0.5rem',
          '--density-spacing-sm': '1rem',
          '--density-spacing-md': '1.25rem',
          '--density-spacing-lg': '1.5rem',
          '--density-spacing-xl': '2rem',
          '--density-font-size': '1rem',
          '--density-line-height': '1.5rem',
          '--density-button-height': '44px',
          '--density-input-height': '44px',
          '--density-icon-size': '20px',
          '--density-padding': '1rem',
          '--density-gap': '1rem',
          '--density-header-height': '60px',
          '--density-navigation-height': '64px',
          '--density-sidebar-width': '280px',
          '--density-panel-width': '320px',
        },
        '.density-spacious': {
          '--density-spacing-xs': '0.75rem',
          '--density-spacing-sm': '1.25rem',
          '--density-spacing-md': '1.5rem',
          '--density-spacing-lg': '2rem',
          '--density-spacing-xl': '2.5rem',
          '--density-font-size': '1.125rem',
          '--density-line-height': '1.75rem',
          '--density-button-height': '48px',
          '--density-input-height': '48px',
          '--density-icon-size': '24px',
          '--density-padding': '1.25rem',
          '--density-gap': '1.25rem',
          '--density-header-height': '68px',
          '--density-navigation-height': '72px',
          '--density-sidebar-width': '320px',
          '--density-panel-width': '360px',
        },
        // Orientation-specific density classes
        '.density-landscape-mobile': {
          '@media (orientation: landscape) and (max-width: 768px)': {
            '--density-header-height': 'calc(var(--density-header-height) * 0.85)',
            '--density-navigation-height': 'calc(var(--density-navigation-height) * 0.85)',
            '--density-padding': 'calc(var(--density-padding) * 0.75)',
            '--density-gap': 'calc(var(--density-gap) * 0.75)',
          },
        },
        '.density-portrait-mobile': {
          '@media (orientation: portrait) and (max-width: 768px) and (max-height: 700px)': {
            '--density-spacing-md': 'calc(var(--density-spacing-md) * 0.85)',
            '--density-padding': 'calc(var(--density-padding) * 0.9)',
          },
        },
        '.density-landscape-tablet': {
          '@media (orientation: landscape) and (min-width: 768px) and (max-width: 1024px)': {
            '--density-sidebar-width': 'calc(var(--density-sidebar-width) * 1.1)',
            '--density-panel-width': 'calc(var(--density-panel-width) * 1.1)',
          },
        },
        '.density-portrait-tablet': {
          '@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px)': {
            '--density-header-height': 'calc(var(--density-header-height) * 1.1)',
            '--density-navigation-height': 'calc(var(--density-navigation-height) * 1.1)',
          },
        },
        '.density-desktop': {
          '@media (min-width: 1024px)': {
            '--density-sidebar-width': 'calc(var(--density-sidebar-width) * 1.2)',
            '--density-panel-width': 'calc(var(--density-panel-width) * 1.2)',
          },
        },
      });

      // Elevation Utilities
      addUtilities({
        '.elevation-0': { boxShadow: 'var(--elevation-0)' },
        '.elevation-1': { boxShadow: 'var(--elevation-1)' },
        '.elevation-2': { boxShadow: 'var(--elevation-2)' },
        '.elevation-3': { boxShadow: 'var(--elevation-3)' },
        '.elevation-4': { boxShadow: 'var(--elevation-4)' },
        '.elevation-5': { boxShadow: 'var(--elevation-5)' },
        '.elevation-6': { boxShadow: 'var(--elevation-6)' },
        '.elevation-surface': { boxShadow: 'var(--elevation-surface)' },
        '.elevation-card': { boxShadow: 'var(--elevation-card)' },
        '.elevation-button': { boxShadow: 'var(--elevation-button)' },
        '.elevation-dropdown': { boxShadow: 'var(--elevation-dropdown)' },
        '.elevation-modal': { boxShadow: 'var(--elevation-modal)' },
        '.elevation-overlay': { boxShadow: 'var(--elevation-overlay)' },
        '.elevation-popup': { boxShadow: 'var(--elevation-popup)' },
      });

      // Typography Scale Utilities
      addUtilities({
        '.text-display-large': { fontSize: 'var(--text-display-large)' },
        '.text-display-medium': { fontSize: 'var(--text-display-medium)' },
        '.text-display-small': { fontSize: 'var(--text-display-small)' },
        '.text-headline-large': { fontSize: 'var(--text-headline-large)' },
        '.text-headline-medium': { fontSize: 'var(--text-headline-medium)' },
        '.text-headline-small': { fontSize: 'var(--text-headline-small)' },
        '.text-title-large': { fontSize: 'var(--text-title-large)' },
        '.text-title-medium': { fontSize: 'var(--text-title-medium)' },
        '.text-title-small': { fontSize: 'var(--text-title-small)' },
        '.text-body-large': { fontSize: 'var(--text-body-large)' },
        '.text-body-medium': { fontSize: 'var(--text-body-medium)' },
        '.text-body-small': { fontSize: 'var(--text-body-small)' },
        '.text-label-large': { fontSize: 'var(--text-label-large)' },
        '.text-label-medium': { fontSize: 'var(--text-label-medium)' },
        '.text-label-small': { fontSize: 'var(--text-label-small)' },
      });

      // Spacing Utilities
      addUtilities({
        '.gap-component-xs': { gap: 'var(--spacing-component-xs)' },
        '.gap-component-sm': { gap: 'var(--spacing-component-sm)' },
        '.gap-component-md': { gap: 'var(--spacing-component-md)' },
        '.gap-component-lg': { gap: 'var(--spacing-component-lg)' },
        '.gap-component-xl': { gap: 'var(--spacing-component-xl)' },
        '.gap-component-2xl': { gap: 'var(--spacing-component-2xl)' },
        '.gap-section-xs': { gap: 'var(--spacing-section-xs)' },
        '.gap-section-sm': { gap: 'var(--spacing-section-sm)' },
        '.gap-section-md': { gap: 'var(--spacing-section-md)' },
        '.gap-section-lg': { gap: 'var(--spacing-section-lg)' },
        '.gap-section-xl': { gap: 'var(--spacing-section-xl)' },
        '.gap-page-xs': { gap: 'var(--spacing-page-xs)' },
        '.gap-page-sm': { gap: 'var(--spacing-page-sm)' },
        '.gap-page-md': { gap: 'var(--spacing-page-md)' },
        '.gap-page-lg': { gap: 'var(--spacing-page-lg)' },
        '.gap-page-xl': { gap: 'var(--spacing-page-xl)' },
      });

      // Mobile-First Responsive Utilities
      addUtilities({
        '.touch-target': {
          minHeight: '44px',
          minWidth: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        '.mobile-container': {
          width: '100%',
          maxWidth: '375px',
          margin: '0 auto',
          padding: '0 1rem',
        },
        '.tablet-container': {
          '@media (min-width: 768px)': {
            maxWidth: '768px',
            padding: '0 1.5rem',
          },
        },
        '.desktop-container': {
          '@media (min-width: 1024px)': {
            maxWidth: '1024px',
            padding: '0 2rem',
          },
        },
        '.grid-mobile': {
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1rem',
        },
        '.grid-tablet': {
          '@media (min-width: 768px)': {
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1.5rem',
          },
        },
        '.grid-desktop': {
          '@media (min-width: 1024px)': {
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2rem',
          },
        },
        '.sidebar-mobile': {
          position: 'fixed',
          top: '0',
          left: '-100%',
          width: '280px',
          height: '100vh',
          transition: 'left 0.3s ease-in-out',
          zIndex: '50',
        },
        '.sidebar-mobile.open': {
          left: '0',
        },
        '.main-mobile': {
          width: '100%',
          transition: 'margin-left 0.3s ease-in-out',
        },
        '.main-desktop': {
          '@media (min-width: 1024px)': {
            marginLeft: '280px',
            width: 'calc(100% - 280px)',
          },
        },
      });

      // Touch-friendly Components
      addComponents({
        '.btn-touch': {
          '@apply touch-target btn-base': {},
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
        },
        '.input-touch': {
          '@apply touch-target input-base': {},
          padding: '0.875rem 1rem',
          fontSize: '1rem',
        },
        '.mobile-menu-item': {
          '@apply touch-target': {},
          padding: '1rem',
          borderBottom: '1px solid var(--color-border-primary)',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'var(--color-surface-hover)',
          },
          '&:active': {
            backgroundColor: 'var(--color-surface-pressed)',
          },
        },
      });

      // Landscape-specific utilities
      addUtilities({
        '.landscape-optimized': {
          '@media (orientation: landscape) and (max-width: 768px)': {
            '--landscape-padding': '0.5rem',
            '--landscape-gap': '0.5rem',
          },
        },
        '.landscape-header': {
          '@media (orientation: landscape) and (max-width: 768px)': {
            height: '48px',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
          },
        },
        '.landscape-sidebar': {
          '@media (orientation: landscape) and (max-width: 768px)': {
            width: '260px',
          },
        },
        '.landscape-panel': {
          '@media (orientation: landscape) and (max-width: 768px)': {
            width: '280px',
          },
        },
        '.landscape-navigation': {
          '@media (orientation: landscape) and (max-width: 768px)': {
            height: '40px',
            paddingTop: '0.25rem',
            paddingBottom: '0.25rem',
          },
        },
        '.landscape-compact': {
          '@media (orientation: landscape) and (max-width: 768px)': {
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
            padding: '0.5rem',
          },
        },
        '.ultra-wide-landscape': {
          '@media (orientation: landscape) and (min-aspect-ratio: 2/1) and (max-width: 768px)': {
            '--landscape-sidebar-width': '280px',
            '--landscape-panel-width': '320px',
          },
        },
        '.standard-landscape': {
          '@media (orientation: landscape) and (min-aspect-ratio: 3/2) and (max-aspect-ratio: 2/1) and (max-width: 768px)': {
            '--landscape-sidebar-width': '260px',
            '--landscape-panel-width': '280px',
          },
        },
        // Portrait-specific utilities
        '.portrait-optimized': {
          '@media (orientation: portrait) and (max-width: 768px)': {
            '--portrait-padding': '1rem',
            '--portrait-gap': '0.75rem',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          },
        },
        '.portrait-header': {
          '@media (orientation: portrait) and (max-width: 768px)': {
            height: 'var(--portrait-header-height, 60px)',
            paddingTop: '0.75rem',
            paddingBottom: '0.75rem',
          },
        },
        '.portrait-navigation': {
          '@media (orientation: portrait) and (max-width: 768px)': {
            height: 'var(--portrait-navigation-height, 64px)',
            paddingTop: '0.5rem',
            paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))',
          },
        },
        '.portrait-content': {
          '@media (orientation: portrait) and (max-width: 768px)': {
            padding: 'var(--portrait-content-padding, 16px)',
            gap: 'var(--portrait-section-gap, 12px)',
          },
        },
        '.portrait-panel': {
          '@media (orientation: portrait) and (max-width: 768px)': {
            minHeight: 'var(--portrait-panel-min-height, 240px)',
            maxHeight: 'var(--portrait-panel-max-height, 320px)',
          },
        },
        '.portrait-small-screen': {
          '@media (orientation: portrait) and (max-width: 768px) and (max-height: 700px)': {
            '--portrait-header-height': '52px',
            '--portrait-navigation-height': '56px',
            '--portrait-section-gap': '8px',
            '--portrait-content-padding': '12px',
            '--portrait-panel-min-height': '200px',
          },
        },
        '.portrait-tall-screen': {
          '@media (orientation: portrait) and (max-width: 768px) and (min-height: 800px)': {
            '--portrait-panel-max-height': '400px',
            '--portrait-content-padding': '20px',
            '--portrait-section-gap': '16px',
          },
        },
        '.resize-handle': {
          position: 'absolute',
          top: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '4px',
          backgroundColor: 'var(--color-border-primary)',
          borderRadius: '2px',
          cursor: 'row-resize',
          touchAction: 'none',
          '&:hover': {
            backgroundColor: 'var(--color-border-focus)',
          },
          '&:active': {
            backgroundColor: 'var(--color-primary-500)',
          },
        },
      });
    },
  ],
} satisfies Config;
