import { useState, useEffect } from 'react';

export interface OrientationState {
  orientation: 'portrait' | 'landscape';
  angle: number;
  isSupported: boolean;
}

export interface ViewportDimensions {
  width: number;
  height: number;
  isLandscape: boolean;
  isPortrait: boolean;
  isMobile: boolean;
  aspectRatio: number;
}

/**
 * Hook para detectar mudanças de orientação do dispositivo
 * Combina Screen Orientation API com fallback para window dimensions
 */
export function useOrientation(): OrientationState {
  const [orientation, setOrientation] = useState<OrientationState>(() => {
    if (typeof window === 'undefined') {
      return {
        orientation: 'portrait',
        angle: 0,
        isSupported: false,
      };
    }

    // Verifica se Screen Orientation API está disponível
    const isSupported = 'screen' in window && 'orientation' in window.screen;
    
    if (isSupported) {
      const screenOrientation = window.screen.orientation;
      return {
        orientation: screenOrientation.angle === 90 || screenOrientation.angle === 270 
          ? 'landscape' 
          : 'portrait',
        angle: screenOrientation.angle,
        isSupported: true,
      };
    }

    // Fallback usando window dimensions
    const isLandscape = window.innerWidth > window.innerHeight;
    return {
      orientation: isLandscape ? 'landscape' : 'portrait',
      angle: isLandscape ? 90 : 0,
      isSupported: false,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOrientationChange = () => {
      if ('screen' in window && 'orientation' in window.screen) {
        const screenOrientation = window.screen.orientation;
        setOrientation({
          orientation: screenOrientation.angle === 90 || screenOrientation.angle === 270 
            ? 'landscape' 
            : 'portrait',
          angle: screenOrientation.angle,
          isSupported: true,
        });
      } else {
        // Fallback para resize
        const isLandscape = window.innerWidth > window.innerHeight;
        setOrientation({
          orientation: isLandscape ? 'landscape' : 'portrait',
          angle: isLandscape ? 90 : 0,
          isSupported: false,
        });
      }
    };

    const handleResize = () => {
      // Debounce para evitar múltiplas chamadas durante resize
      setTimeout(handleOrientationChange, 100);
    };

    // Event listeners
    if ('screen' in window && 'orientation' in window.screen) {
      window.screen.orientation.addEventListener('change', handleOrientationChange);
    }
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      if ('screen' in window && 'orientation' in window.screen) {
        window.screen.orientation.removeEventListener('change', handleOrientationChange);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return orientation;
}

/**
 * Hook para obter dimensões detalhadas do viewport com informações de orientação
 */
export function useViewportDimensions(): ViewportDimensions {
  const [dimensions, setDimensions] = useState<ViewportDimensions>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 0,
        height: 0,
        isLandscape: false,
        isPortrait: true,
        isMobile: false,
        aspectRatio: 1,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = width > height;
    const isMobile = width < 768; // Breakpoint md

    return {
      width,
      height,
      isLandscape,
      isPortrait: !isLandscape,
      isMobile,
      aspectRatio: width / height,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isLandscape = width > height;
      const isMobile = width < 768;

      setDimensions({
        width,
        height,
        isLandscape,
        isPortrait: !isLandscape,
        isMobile,
        aspectRatio: width / height,
      });
    };

    // Debounce resize events
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', debouncedResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', debouncedResize);
    };
  }, []);

  return dimensions;
}

/**
 * Hook combinado que fornece informações completas de orientação e viewport
 */
export function useResponsiveOrientation() {
  const orientation = useOrientation();
  const viewport = useViewportDimensions();

  return {
    ...orientation,
    ...viewport,
    // Computed properties
    isMobileLandscape: viewport.isMobile && viewport.isLandscape,
    isMobilePortrait: viewport.isMobile && viewport.isPortrait,
    isTabletLandscape: !viewport.isMobile && viewport.width < 1024 && viewport.isLandscape,
    isTabletPortrait: !viewport.isMobile && viewport.width < 1024 && viewport.isPortrait,
  };
}