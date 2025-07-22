/**
 * Theme Hook - Manages dark/light mode theme switching
 * Provides context and utilities for theme management across the application
 */

import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

export function useThemeLogic(): ThemeContextValue {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    
    const stored = localStorage.getItem('cortex-theme') as Theme | null;
    return stored || 'system';
  });

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    
    const stored = localStorage.getItem('cortex-theme') as Theme | null;
    
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    
    // System preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('cortex-theme', newTheme);
      
      let resolvedTheme: 'light' | 'dark';
      
      if (newTheme === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        resolvedTheme = newTheme;
      }
      
      setActualTheme(resolvedTheme);
      
      // Apply theme to document
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(resolvedTheme);
      
      // Update CSS custom properties for theme-aware colors
      updateThemeVariables(resolvedTheme);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        const newActualTheme = mediaQuery.matches ? 'dark' : 'light';
        setActualTheme(newActualTheme);
        
        // Apply theme to document
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(newActualTheme);
        
        updateThemeVariables(newActualTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    
    // Initial setup
    handleChange();
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return {
    theme,
    setTheme,
    actualTheme
  };
}

function updateThemeVariables(theme: 'light' | 'dark') {
  const root = document.documentElement;
  
  if (theme === 'light') {
    // Light theme CSS variables
    root.style.setProperty('--background', '248 250 252'); // neutral-50
    root.style.setProperty('--foreground', '15 23 42'); // neutral-900
    root.style.setProperty('--card', '241 245 249'); // neutral-100
    root.style.setProperty('--card-foreground', '15 23 42'); // neutral-900
    root.style.setProperty('--popover', '241 245 249'); // neutral-100
    root.style.setProperty('--popover-foreground', '15 23 42'); // neutral-900
    root.style.setProperty('--primary', '59 130 246'); // primary-500
    root.style.setProperty('--primary-foreground', '248 250 252'); // neutral-50
    root.style.setProperty('--secondary', '168 85 247'); // secondary-500
    root.style.setProperty('--secondary-foreground', '248 250 252'); // neutral-50
    root.style.setProperty('--muted', '226 232 240'); // neutral-200
    root.style.setProperty('--muted-foreground', '71 85 105'); // neutral-600
    root.style.setProperty('--accent', '226 232 240'); // neutral-200
    root.style.setProperty('--accent-foreground', '15 23 42'); // neutral-900
    root.style.setProperty('--destructive', '239 68 68'); // error-500
    root.style.setProperty('--destructive-foreground', '248 250 252'); // neutral-50
    root.style.setProperty('--border', '203 213 225'); // neutral-300
    root.style.setProperty('--input', '203 213 225'); // neutral-300
    root.style.setProperty('--ring', '59 130 246'); // primary-500
  } else {
    // Dark theme CSS variables
    root.style.setProperty('--background', '2 6 23'); // slate-950
    root.style.setProperty('--foreground', '248 250 252'); // slate-50
    root.style.setProperty('--card', '15 23 42'); // slate-900
    root.style.setProperty('--card-foreground', '248 250 252'); // slate-50
    root.style.setProperty('--popover', '15 23 42'); // slate-900
    root.style.setProperty('--popover-foreground', '248 250 252'); // slate-50
    root.style.setProperty('--primary', '59 130 246'); // primary-500
    root.style.setProperty('--primary-foreground', '2 6 23'); // slate-950
    root.style.setProperty('--secondary', '168 85 247'); // secondary-500
    root.style.setProperty('--secondary-foreground', '2 6 23'); // slate-950
    root.style.setProperty('--muted', '30 41 59'); // slate-800
    root.style.setProperty('--muted-foreground', '148 163 184'); // slate-400
    root.style.setProperty('--accent', '30 41 59'); // slate-800
    root.style.setProperty('--accent-foreground', '248 250 252'); // slate-50
    root.style.setProperty('--destructive', '239 68 68'); // error-500
    root.style.setProperty('--destructive-foreground', '248 250 252'); // slate-50
    root.style.setProperty('--border', '51 65 85'); // slate-700
    root.style.setProperty('--input', '51 65 85'); // slate-700
    root.style.setProperty('--ring', '59 130 246'); // primary-500
  }
}