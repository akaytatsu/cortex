import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useResponsiveOrientation } from './useOrientation';

export type DensityLevel = 'compact' | 'normal' | 'comfortable' | 'spacious';

export interface DensityConfig {
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontSize: string;
    lineHeight: string;
  };
  components: {
    buttonHeight: string;
    inputHeight: string;
    iconSize: string;
    padding: string;
    gap: string;
  };
  layout: {
    headerHeight: string;
    navigationHeight: string;
    sidebarWidth: string;
    panelWidth: string;
  };
}

const DENSITY_CONFIGS: Record<DensityLevel, DensityConfig> = {
  compact: {
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '0.75rem',
      lg: '1rem',
      xl: '1.25rem',
    },
    typography: {
      fontSize: '0.75rem',
      lineHeight: '1rem',
    },
    components: {
      buttonHeight: '32px',
      inputHeight: '32px',
      iconSize: '16px',
      padding: '0.5rem',
      gap: '0.5rem',
    },
    layout: {
      headerHeight: '44px',
      navigationHeight: '48px',
      sidebarWidth: '240px',
      panelWidth: '260px',
    },
  },
  normal: {
    spacing: {
      xs: '0.375rem',
      sm: '0.75rem',
      md: '1rem',
      lg: '1.25rem',
      xl: '1.5rem',
    },
    typography: {
      fontSize: '0.875rem',
      lineHeight: '1.25rem',
    },
    components: {
      buttonHeight: '36px',
      inputHeight: '36px',
      iconSize: '18px',
      padding: '0.75rem',
      gap: '0.75rem',
    },
    layout: {
      headerHeight: '52px',
      navigationHeight: '56px',
      sidebarWidth: '260px',
      panelWidth: '280px',
    },
  },
  comfortable: {
    spacing: {
      xs: '0.5rem',
      sm: '1rem',
      md: '1.25rem',
      lg: '1.5rem',
      xl: '2rem',
    },
    typography: {
      fontSize: '1rem',
      lineHeight: '1.5rem',
    },
    components: {
      buttonHeight: '44px',
      inputHeight: '44px',
      iconSize: '20px',
      padding: '1rem',
      gap: '1rem',
    },
    layout: {
      headerHeight: '60px',
      navigationHeight: '64px',
      sidebarWidth: '280px',
      panelWidth: '320px',
    },
  },
  spacious: {
    spacing: {
      xs: '0.75rem',
      sm: '1.25rem',
      md: '1.5rem',
      lg: '2rem',
      xl: '2.5rem',
    },
    typography: {
      fontSize: '1.125rem',
      lineHeight: '1.75rem',
    },
    components: {
      buttonHeight: '48px',
      inputHeight: '48px',
      iconSize: '24px',
      padding: '1.25rem',
      gap: '1.25rem',
    },
    layout: {
      headerHeight: '68px',
      navigationHeight: '72px',
      sidebarWidth: '320px',
      panelWidth: '360px',
    },
  },
};

/**
 * Hook para gerenciar densidade adaptativa baseada na orientação e tamanho da tela
 */
export function useAdaptiveDensity(userPreference?: DensityLevel): {
  density: DensityLevel;
  config: DensityConfig;
  classes: string;
  cssVariables: Record<string, string>;
} {
  const {
    isMobileLandscape,
    isMobilePortrait,
    isTabletLandscape,
    isTabletPortrait,
    width,
    height,
    aspectRatio,
  } = useResponsiveOrientation();

  const adaptiveDensity = useMemo(() => {
    // Se o usuário tem preferência, respeitamos
    if (userPreference) {
      return userPreference;
    }

    // Densidade automática baseada na orientação e dispositivo
    if (isMobileLandscape) {
      // Landscape mobile: densidade compacta para aproveitar altura limitada
      return aspectRatio > 2 ? 'compact' : 'normal'; // Ultra-wide pode ser um pouco mais espaçoso
    }

    if (isMobilePortrait) {
      // Portrait mobile: densidade normal, mas compacta em telas pequenas
      return height < 700 ? 'compact' : 'normal';
    }

    if (isTabletLandscape) {
      // Tablet landscape: densidade confortável
      return 'comfortable';
    }

    if (isTabletPortrait) {
      // Tablet portrait: densidade normal a confortável
      return width > 900 ? 'comfortable' : 'normal';
    }

    // Desktop: densidade confortável
    return 'comfortable';
  }, [
    userPreference,
    isMobileLandscape,
    isMobilePortrait,
    isTabletLandscape,
    isTabletPortrait,
    width,
    height,
    aspectRatio,
  ]);

  const config = DENSITY_CONFIGS[adaptiveDensity];

  const classes = useMemo(() => {
    const baseClass = `density-${adaptiveDensity}`;
    const orientationClass = isMobileLandscape
      ? 'density-landscape-mobile'
      : isMobilePortrait
      ? 'density-portrait-mobile'
      : isTabletLandscape
      ? 'density-landscape-tablet'
      : isTabletPortrait
      ? 'density-portrait-tablet'
      : 'density-desktop';

    return `${baseClass} ${orientationClass}`;
  }, [adaptiveDensity, isMobileLandscape, isMobilePortrait, isTabletLandscape, isTabletPortrait]);

  const cssVariables = useMemo(() => {
    return {
      '--density-spacing-xs': config.spacing.xs,
      '--density-spacing-sm': config.spacing.sm,
      '--density-spacing-md': config.spacing.md,
      '--density-spacing-lg': config.spacing.lg,
      '--density-spacing-xl': config.spacing.xl,
      '--density-font-size': config.typography.fontSize,
      '--density-line-height': config.typography.lineHeight,
      '--density-button-height': config.components.buttonHeight,
      '--density-input-height': config.components.inputHeight,
      '--density-icon-size': config.components.iconSize,
      '--density-padding': config.components.padding,
      '--density-gap': config.components.gap,
      '--density-header-height': config.layout.headerHeight,
      '--density-navigation-height': config.layout.navigationHeight,
      '--density-sidebar-width': config.layout.sidebarWidth,
      '--density-panel-width': config.layout.panelWidth,
    };
  }, [config]);

  return {
    density: adaptiveDensity,
    config,
    classes,
    cssVariables,
  };
}

/**
 * Hook específico para densidade de componentes
 */
export function useComponentDensity(component: 'button' | 'input' | 'card' | 'list' | 'menu') {
  const { density, config } = useAdaptiveDensity();

  const componentConfigs = {
    button: {
      height: config.components.buttonHeight,
      padding: config.components.padding,
      fontSize: config.typography.fontSize,
      gap: config.components.gap,
      iconSize: config.components.iconSize,
    },
    input: {
      height: config.components.inputHeight,
      padding: config.components.padding,
      fontSize: config.typography.fontSize,
    },
    card: {
      padding: config.components.padding,
      gap: config.spacing.md,
      fontSize: config.typography.fontSize,
    },
    list: {
      itemHeight: density === 'compact' ? '36px' : density === 'normal' ? '44px' : '52px',
      padding: config.spacing.sm,
      gap: config.spacing.xs,
      fontSize: config.typography.fontSize,
    },
    menu: {
      itemHeight: density === 'compact' ? '32px' : density === 'normal' ? '40px' : '48px',
      padding: config.spacing.sm,
      fontSize: config.typography.fontSize,
      iconSize: config.components.iconSize,
    },
  };

  return {
    density,
    ...componentConfigs[component],
  };
}

/**
 * Props para componente wrapper de densidade adaptativa
 */
export interface AdaptiveDensityProviderProps {
  children: ReactNode;
  userPreference?: DensityLevel;
  className?: string;
}