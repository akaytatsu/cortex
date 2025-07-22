/**
 * Theme Provider - Wraps the application with theme context
 * Provides theme management capabilities throughout the component tree
 */

import { type ReactNode } from 'react';
import { ThemeContext, useThemeLogic } from '../../hooks/useTheme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeValue = useThemeLogic();
  
  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}