import { ReactNode } from 'react';
import { useResponsiveOrientation } from '../../hooks/useOrientation';

interface LandscapeLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Layout específico para orientação landscape em dispositivos móveis
 * Otimiza o uso do espaço horizontal disponível
 */
export function LandscapeLayout({ children, className = '' }: LandscapeLayoutProps) {
  const { isMobileLandscape, aspectRatio } = useResponsiveOrientation();

  if (!isMobileLandscape) {
    return <div className={className}>{children}</div>;
  }

  // Landscape-specific optimizations
  const isUltraWide = aspectRatio > 2; // Ultra-wide phones like iPhone 14 Pro Max
  const isStandardLandscape = aspectRatio >= 1.5 && aspectRatio <= 2;

  return (
    <div 
      className={`
        ${className} 
        landscape-optimized 
        ${isUltraWide ? 'ultra-wide-landscape' : ''}
        ${isStandardLandscape ? 'standard-landscape' : ''}
      `}
      style={{
        // Landscape-specific CSS custom properties
        '--landscape-sidebar-width': isUltraWide ? '280px' : '260px',
        '--landscape-panel-width': isUltraWide ? '320px' : '280px',
        '--landscape-header-height': '48px',
        '--landscape-nav-height': '40px',
        '--landscape-padding': isUltraWide ? '12px' : '8px',
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/**
 * Hook para classes CSS específicas de landscape
 */
export function useLandscapeClasses() {
  const { isMobileLandscape, aspectRatio } = useResponsiveOrientation();

  if (!isMobileLandscape) {
    return {
      container: '',
      header: '',
      sidebar: '',
      panel: '',
      navigation: '',
    };
  }

  const isUltraWide = aspectRatio > 2;

  return {
    container: `landscape:flex-row landscape:h-screen ${isUltraWide ? 'landscape:ultra-wide' : ''}`,
    header: 'landscape:h-12 landscape:py-2 landscape:px-3',
    sidebar: `landscape:w-64 ${isUltraWide ? 'landscape:w-72' : 'landscape:w-60'}`,
    panel: `landscape:w-72 ${isUltraWide ? 'landscape:w-80' : 'landscape:w-64'}`, 
    navigation: 'landscape:h-10 landscape:py-1',
  };
}

/**
 * Componente para otimizar densidade de elementos em landscape
 */
interface LandscapeDensityProps {
  children: ReactNode;
  density?: 'compact' | 'normal' | 'comfortable';
  className?: string;
}

export function LandscapeDensity({ 
  children, 
  density = 'compact', 
  className = '' 
}: LandscapeDensityProps) {
  const { isMobileLandscape } = useResponsiveOrientation();

  const densityClasses = {
    compact: isMobileLandscape ? 'space-y-1 text-sm' : 'space-y-2',
    normal: isMobileLandscape ? 'space-y-2 text-sm' : 'space-y-3',
    comfortable: isMobileLandscape ? 'space-y-3' : 'space-y-4',
  };

  return (
    <div className={`${densityClasses[density]} ${className}`}>
      {children}
    </div>
  );
}