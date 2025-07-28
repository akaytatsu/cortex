export type Theme = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'cortex-theme';

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to get stored theme:', error);
  }
  return 'system';
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Failed to store theme:', error);
  }
}

export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  
  const effectiveTheme = getEffectiveTheme(theme);
  const root = document.documentElement;
  
  // Remove existing theme classes
  root.classList.remove('light', 'dark');
  root.removeAttribute('data-theme');
  
  // Apply new theme
  root.classList.add(effectiveTheme);
  root.setAttribute('data-theme', effectiveTheme);
}

export function initializeTheme(): Theme {
  const storedTheme = getStoredTheme();
  applyTheme(storedTheme);
  return storedTheme;
}

export function toggleTheme(currentTheme: Theme): Theme {
  let newTheme: Theme;
  
  switch (currentTheme) {
    case 'light':
      newTheme = 'dark';
      break;
    case 'dark':
      newTheme = 'system';
      break;
    case 'system':
      newTheme = 'light';
      break;
    default:
      newTheme = 'system';
  }
  
  setStoredTheme(newTheme);
  applyTheme(newTheme);
  return newTheme;
}

export function cycleTheme(currentTheme: Theme): Theme {
  return toggleTheme(currentTheme);
}

export function setTheme(theme: Theme): void {
  setStoredTheme(theme);
  applyTheme(theme);
}

// Listen for system theme changes
export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };
  
  mediaQuery.addEventListener('change', handler);
  
  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}