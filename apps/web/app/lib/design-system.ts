/**
 * Design System - Modern UI/UX Design Tokens
 * Implements a sophisticated color palette, typography scale, and spacing system
 * for the Cortex IDE with dark/light theme support and accessibility compliance
 */

// Color System - Primary (blue), Secondary (purple), Semantic colors, Neutral palette
export const colors = {
  // Primary Blue Palette
  primary: {
    50: '#eff6ff',
    100: '#dbeafe', 
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main primary
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554'
  },
  
  // Secondary Purple Palette
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7', // Main secondary
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764'
  },

  // Semantic Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main success
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d'
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Main warning
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Main error
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d'
  },

  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Main info
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e'
  },

  // Neutral Palette for Light Theme
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
  },

  // Dark Theme Neutral Palette
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
  }
} as const;

// Typography Scale - xs(0.75rem) to 2xl(1.5rem) with line heights
export const typography = {
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],        // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],    // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],       // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],    // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],     // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }]       // 24px
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em'
  },

  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375', 
    normal: '1.5',
    relaxed: '1.625',
    loose: '2'
  }
} as const;

// Spacing System - 0.5(0.125rem) to 12(3rem) following 8px grid
export const spacing = {
  px: '1px',
  0: '0px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem'        // 48px
} as const;

// Border Radius - sm(0.125rem) to xl(0.75rem) for consistent component styling
export const borderRadius = {
  none: '0px',
  sm: '0.125rem',   // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px'
} as const;

// Shadow System
export const boxShadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: '0 0 #0000'
} as const;

// Animation & Transitions
export const animation = {
  transition: {
    DEFAULT: 'all 150ms ease-in-out',
    fast: 'all 100ms ease-in-out',
    slow: 'all 300ms ease-in-out'
  },
  
  keyframes: {
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' }
    },
    slideIn: {
      '0%': { transform: 'translateX(-100%)' },
      '100%': { transform: 'translateX(0)' }
    },
    pulse: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.5' }
    }
  }
} as const;

// Theme Configuration
export const themes = {
  light: {
    background: colors.neutral[50],
    foreground: colors.neutral[900],
    card: colors.neutral[100],
    'card-foreground': colors.neutral[900],
    popover: colors.neutral[100],
    'popover-foreground': colors.neutral[900],
    primary: colors.primary[500],
    'primary-foreground': colors.neutral[50],
    secondary: colors.secondary[500],
    'secondary-foreground': colors.neutral[50],
    muted: colors.neutral[200],
    'muted-foreground': colors.neutral[600],
    accent: colors.neutral[200],
    'accent-foreground': colors.neutral[900],
    destructive: colors.error[500],
    'destructive-foreground': colors.neutral[50],
    border: colors.neutral[300],
    input: colors.neutral[300],
    ring: colors.primary[500]
  },
  
  dark: {
    background: colors.slate[950],
    foreground: colors.slate[50],
    card: colors.slate[900],
    'card-foreground': colors.slate[50],
    popover: colors.slate[900],
    'popover-foreground': colors.slate[50],
    primary: colors.primary[500],
    'primary-foreground': colors.slate[950],
    secondary: colors.secondary[500],
    'secondary-foreground': colors.slate[950],
    muted: colors.slate[800],
    'muted-foreground': colors.slate[400],
    accent: colors.slate[800],
    'accent-foreground': colors.slate[50],
    destructive: colors.error[500],
    'destructive-foreground': colors.slate[50],
    border: colors.slate[700],
    input: colors.slate[700],
    ring: colors.primary[500]
  }
} as const;

// Component Variants Configuration
export const variants = {
  button: {
    size: {
      sm: {
        height: spacing[8],        // 32px
        paddingX: spacing[3],      // 12px
        fontSize: typography.fontSize.sm[0],
        lineHeight: typography.fontSize.sm[1].lineHeight
      },
      md: {
        height: spacing[10],       // 40px
        paddingX: spacing[4],      // 16px
        fontSize: typography.fontSize.base[0],
        lineHeight: typography.fontSize.base[1].lineHeight
      },
      lg: {
        height: spacing[11],       // 44px
        paddingX: spacing[6],      // 24px
        fontSize: typography.fontSize.lg[0],
        lineHeight: typography.fontSize.lg[1].lineHeight
      }
    },
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      outline: 'outline',
      ghost: 'ghost',
      destructive: 'destructive'
    }
  },
  
  card: {
    variant: {
      elevated: 'elevated',
      outlined: 'outlined',
      filled: 'filled'
    },
    padding: {
      none: spacing[0],
      sm: spacing[3],       // 12px
      md: spacing[4],       // 16px
      lg: spacing[6]        // 24px
    }
  }
} as const;

// Breakpoints for Responsive Design
export const screens = {
  sm: '640px',
  md: '768px', 
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const;

// Z-Index Scale
export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  modal: '1040',
  popover: '1050',
  tooltip: '1060'
} as const;

// Export complete design system
export const designSystem = {
  colors,
  typography,
  spacing,
  borderRadius,
  boxShadow,
  animation,
  themes,
  variants,
  screens,
  zIndex
} as const;

export type ColorPalette = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type Theme = typeof themes.light;
export type DesignSystem = typeof designSystem;