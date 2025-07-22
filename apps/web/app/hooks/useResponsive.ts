/**
 * Responsive Hook - Handles responsive design utilities
 * Provides breakpoint detection and responsive state management
 */

import { useEffect, useState } from 'react';
import { designSystem } from '../lib/design-system';

type Breakpoint = keyof typeof designSystem.screens;

interface ResponsiveState {
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  is2Xl: boolean;
  isTouch: boolean;
  width: number;
  height: number;
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        isSm: false,
        isMd: false,
        isLg: false,
        isXl: false,
        is2Xl: false,
        isTouch: false,
        width: 0,
        height: 0
      };
    }

    return getResponsiveState();
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleResize() {
      setState(getResponsiveState());
    }

    // Listen to resize events
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Initial check
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return state;
}

function getResponsiveState(): ResponsiveState {
  if (typeof window === 'undefined') {
    return {
      isSm: false,
      isMd: false,
      isLg: false,
      isXl: false,
      is2Xl: false,
      isTouch: false,
      width: 0,
      height: 0
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  // Parse breakpoint values (remove 'px' and convert to number)
  const sm = parseInt(designSystem.screens.sm);
  const md = parseInt(designSystem.screens.md);
  const lg = parseInt(designSystem.screens.lg);
  const xl = parseInt(designSystem.screens.xl);
  const xl2 = parseInt(designSystem.screens['2xl']);

  // Detect touch capability
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return {
    isSm: width >= sm,
    isMd: width >= md,
    isLg: width >= lg,
    isXl: width >= xl,
    is2Xl: width >= xl2,
    isTouch,
    width,
    height
  };
}

export function useBreakpoint(): Breakpoint | null {
  const { isSm, isMd, isLg, isXl, is2Xl } = useResponsive();

  if (is2Xl) return '2xl';
  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';
  
  return null;
}

export function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    
    const handleChange = () => {
      setMatches(media.matches);
    };

    media.addEventListener('change', handleChange);
    handleChange(); // Initial check

    return () => media.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}