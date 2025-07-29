import { ReactNode, useEffect, useState } from 'react';
import { useResponsiveOrientation } from '../../hooks/useOrientation';

interface PortraitLayoutProps {
  children: ReactNode;
  className?: string;
  enableVerticalOptimization?: boolean;
}

/**
 * Layout específico para orientação portrait em dispositivos móveis
 * Otimiza o uso do espaço vertical disponível
 */
export function PortraitLayout({ 
  children, 
  className = '',
  enableVerticalOptimization = true 
}: PortraitLayoutProps) {
  const { isMobilePortrait, height } = useResponsiveOrientation();
  const [safeAreaTop, setSafeAreaTop] = useState(0);
  const [safeAreaBottom, setSafeAreaBottom] = useState(0);

  // Detecta safe areas para dispositivos com notch/home indicator
  useEffect(() => {
    if (typeof window !== 'undefined' && CSS.supports('padding-top: env(safe-area-inset-top)')) {
      const computedStyle = getComputedStyle(document.documentElement);
      const top = computedStyle.getPropertyValue('--safe-area-inset-top') || '0px';
      const bottom = computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0px';
      
      setSafeAreaTop(parseInt(top));
      setSafeAreaBottom(parseInt(bottom));
    }
  }, []);

  if (!isMobilePortrait) {
    return <div className={className}>{children}</div>;
  }

  // Portrait-specific optimizations
  const isSmallScreen = height < 700; // Small phones like iPhone SE
  const isTallScreen = height > 800; // Tall phones like iPhone 14 Pro Max
  
  const verticalOptimizations = enableVerticalOptimization ? {
    '--portrait-header-height': isSmallScreen ? '52px' : '60px',
    '--portrait-navigation-height': isSmallScreen ? '56px' : '64px',
    '--portrait-section-gap': isSmallScreen ? '8px' : '12px',
    '--portrait-content-padding': isSmallScreen ? '12px' : '16px',
    '--portrait-panel-min-height': isSmallScreen ? '200px' : '240px',
    '--portrait-panel-max-height': isTallScreen ? '400px' : '320px',
    '--safe-area-top': `${safeAreaTop}px`,
    '--safe-area-bottom': `${safeAreaBottom}px`,
  } : {};

  return (
    <div 
      className={`
        ${className} 
        portrait-optimized 
        ${isSmallScreen ? 'portrait-small-screen' : ''}
        ${isTallScreen ? 'portrait-tall-screen' : ''}
      `}
      style={{
        ...verticalOptimizations,
        height: `calc(100vh - ${safeAreaTop + safeAreaBottom}px)`,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/**
 * Hook para otimizações específicas de portrait
 */
export function usePortraitOptimizations() {
  const { isMobilePortrait, height, width } = useResponsiveOrientation();
  const [availableHeight, setAvailableHeight] = useState(height);

  useEffect(() => {
    if (!isMobilePortrait) return;

    const updateAvailableHeight = () => {
      // Considera altura do keyboard virtual quando visível
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        setAvailableHeight(visualViewport.height);
      } else {
        setAvailableHeight(window.innerHeight);
      }
    };

    // Listen for viewport changes (keyboard show/hide)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateAvailableHeight);
      return () => {
        window.visualViewport?.removeEventListener('resize', updateAvailableHeight);
      };
    }

    window.addEventListener('resize', updateAvailableHeight);
    return () => window.removeEventListener('resize', updateAvailableHeight);
  }, [isMobilePortrait]);

  const isSmallScreen = height < 700;
  const isTallScreen = height > 800;
  const isKeyboardVisible = availableHeight < height * 0.75;

  return {
    isMobilePortrait,
    isSmallScreen,
    isTallScreen,
    isKeyboardVisible,
    availableHeight,
    fullHeight: height,
    width,
    // Computed values for layout optimization
    headerHeight: isSmallScreen ? 52 : 60,
    navigationHeight: isSmallScreen ? 56 : 64,
    contentPadding: isSmallScreen ? 12 : 16,
    sectionGap: isSmallScreen ? 8 : 12,
    panelMinHeight: isSmallScreen ? 200 : 240,
    panelMaxHeight: isTallScreen ? 400 : 320,
  };
}

/**
 * Componente para gerenciar altura dinâmica de painéis em portrait
 */
interface PortraitPanelProps {
  children: ReactNode;
  minHeight?: number;
  maxHeight?: number;
  defaultHeight?: number;
  resizable?: boolean;
  className?: string;
}

export function PortraitPanel({ 
  children, 
  minHeight, 
  maxHeight, 
  defaultHeight,
  resizable = true,
  className = '' 
}: PortraitPanelProps) {
  const { 
    isMobilePortrait, 
    isSmallScreen, 
    availableHeight, 
    panelMinHeight, 
    panelMaxHeight 
  } = usePortraitOptimizations();

  const [panelHeight, setPanelHeight] = useState(() => {
    if (defaultHeight) return defaultHeight;
    return isSmallScreen ? panelMinHeight : panelMaxHeight;
  });

  const finalMinHeight = minHeight || panelMinHeight;
  const finalMaxHeight = maxHeight || Math.min(panelMaxHeight, availableHeight * 0.6);

  useEffect(() => {
    // Adjust panel height when orientation changes or keyboard appears
    if (isMobilePortrait) {
      const newHeight = Math.min(Math.max(panelHeight, finalMinHeight), finalMaxHeight);
      if (newHeight !== panelHeight) {
        setPanelHeight(newHeight);
      }
    }
  }, [isMobilePortrait, availableHeight, finalMinHeight, finalMaxHeight, panelHeight]);

  if (!isMobilePortrait) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div 
      className={`${className} portrait-panel`}
      style={{ 
        height: panelHeight,
        minHeight: finalMinHeight,
        maxHeight: finalMaxHeight,
      }}
    >
      {resizable && (
        <div 
          className="resize-handle"
          onTouchStart={(e) => {
            const startY = e.touches[0].clientY;
            const startHeight = panelHeight;

            const handleTouchMove = (e: TouchEvent) => {
              const deltaY = startY - e.touches[0].clientY;
              const newHeight = Math.min(
                Math.max(startHeight + deltaY, finalMinHeight),
                finalMaxHeight
              );
              setPanelHeight(newHeight);
            };

            const handleTouchEnd = () => {
              document.removeEventListener('touchmove', handleTouchMove);
              document.removeEventListener('touchend', handleTouchEnd);
            };

            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);
          }}
        />
      )}
      {children}
    </div>
  );
}