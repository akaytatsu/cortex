import { useState, useEffect } from 'react';
import { 
  Theme, 
  initializeTheme, 
  setTheme as setThemeLib, 
  toggleTheme as toggleThemeLib,
  getEffectiveTheme,
  watchSystemTheme 
} from '~/lib/theme';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize theme on mount
    const initialTheme = initializeTheme();
    setThemeState(initialTheme);
    setEffectiveTheme(getEffectiveTheme(initialTheme));
    setIsLoading(false);

    // Watch for system theme changes
    const unwatch = watchSystemTheme((systemTheme) => {
      setThemeState(currentTheme => {
        if (currentTheme === 'system') {
          setEffectiveTheme(systemTheme);
        }
        return currentTheme;
      });
    });

    return unwatch;
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeLib(newTheme);
    setThemeState(newTheme);
    setEffectiveTheme(getEffectiveTheme(newTheme));
  };

  const toggleTheme = () => {
    const newTheme = toggleThemeLib(theme);
    setThemeState(newTheme);
    setEffectiveTheme(getEffectiveTheme(newTheme));
  };

  return {
    theme,
    effectiveTheme,
    isLoading,
    setTheme,
    toggleTheme,
  };
}