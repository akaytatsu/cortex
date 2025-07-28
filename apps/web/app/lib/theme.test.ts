import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getSystemTheme, 
  getStoredTheme, 
  setStoredTheme, 
  getEffectiveTheme, 
  applyTheme, 
  initializeTheme,
  toggleTheme,
  setTheme,
  watchSystemTheme,
  THEME_STORAGE_KEY 
} from './theme';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock window.matchMedia
const matchMediaMock = vi.fn();

// Mock document
const documentMock = {
  documentElement: {
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    },
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
  },
};

describe('Theme utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    Object.defineProperty(global, 'window', {
      value: { matchMedia: matchMediaMock },
      writable: true,
    });
    Object.defineProperty(global, 'document', {
      value: documentMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSystemTheme', () => {
    it('returns light when window is undefined (SSR)', () => {
      Object.defineProperty(global, 'window', { value: undefined });
      expect(getSystemTheme()).toBe('light');
    });

    it('returns dark when system prefers dark', () => {
      matchMediaMock.mockReturnValue({ matches: true });
      expect(getSystemTheme()).toBe('dark');
      expect(matchMediaMock).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    it('returns light when system prefers light', () => {
      matchMediaMock.mockReturnValue({ matches: false });
      expect(getSystemTheme()).toBe('light');
    });
  });

  describe('getStoredTheme', () => {
    it('returns system when window is undefined (SSR)', () => {
      Object.defineProperty(global, 'window', { value: undefined });
      expect(getStoredTheme()).toBe('system');
    });

    it('returns stored theme when valid', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      expect(getStoredTheme()).toBe('dark');
      expect(localStorageMock.getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
    });

    it('returns system when no stored theme', () => {
      localStorageMock.getItem.mockReturnValue(null);
      expect(getStoredTheme()).toBe('system');
    });

    it('returns system when stored theme is invalid', () => {
      localStorageMock.getItem.mockReturnValue('invalid');
      expect(getStoredTheme()).toBe('system');
    });

    it('handles localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(getStoredTheme()).toBe('system');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get stored theme:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('setStoredTheme', () => {
    it('does nothing when window is undefined (SSR)', () => {
      Object.defineProperty(global, 'window', { value: undefined });
      setStoredTheme('dark');
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('stores theme in localStorage', () => {
      setStoredTheme('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
    });

    it('handles localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      setStoredTheme('dark');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to store theme:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('getEffectiveTheme', () => {
    it('returns system theme when theme is system and system prefers dark', () => {
      matchMediaMock.mockReturnValue({ matches: true });
      expect(getEffectiveTheme('system')).toBe('dark');
    });

    it('returns system theme when theme is system and system prefers light', () => {
      matchMediaMock.mockReturnValue({ matches: false });
      expect(getEffectiveTheme('system')).toBe('light');
    });

    it('returns the theme itself when not system', () => {
      expect(getEffectiveTheme('light')).toBe('light');
      expect(getEffectiveTheme('dark')).toBe('dark');
    });
  });

  describe('applyTheme', () => {
    it('does nothing when document is undefined (SSR)', () => {
      Object.defineProperty(global, 'document', { value: undefined });
      applyTheme('dark');
      // Should not throw an error
    });

    it('applies dark theme correctly', () => {
      matchMediaMock.mockReturnValue({ matches: false }); // system is light
      applyTheme('dark');
      
      expect(documentMock.documentElement.classList.remove).toHaveBeenCalledWith('light', 'dark');
      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('applies light theme correctly', () => {
      applyTheme('light');
      
      expect(documentMock.documentElement.classList.remove).toHaveBeenCalledWith('light', 'dark');
      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('light');
      expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    });

    it('applies system theme based on system preference', () => {
      matchMediaMock.mockReturnValue({ matches: true }); // system prefers dark
      applyTheme('system');
      
      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });
  });

  describe('initializeTheme', () => {
    it('initializes with stored theme and applies it', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      const result = initializeTheme();
      
      expect(result).toBe('dark');
      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });
  });

  describe('toggleTheme', () => {
    it('cycles through themes correctly', () => {
      expect(toggleTheme('light')).toBe('dark');
      expect(toggleTheme('dark')).toBe('system');
      expect(toggleTheme('system')).toBe('light');
    });

    it('stores and applies the new theme', () => {
      const result = toggleTheme('light');
      
      expect(result).toBe('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });
  });

  describe('setTheme', () => {
    it('stores and applies the theme', () => {
      setTheme('dark');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });
  });

  describe('watchSystemTheme', () => {
    it('returns empty function when window is undefined (SSR)', () => {
      Object.defineProperty(global, 'window', { value: undefined });
      const unwatch = watchSystemTheme(() => {});
      expect(typeof unwatch).toBe('function');
      unwatch(); // Should not throw
    });

    it('sets up and tears down event listener correctly', () => {
      const addEventListener = vi.fn();
      const removeEventListener = vi.fn();
      const mediaQuery = {
        addEventListener,
        removeEventListener,
      };
      matchMediaMock.mockReturnValue(mediaQuery);
      
      const callback = vi.fn();
      const unwatch = watchSystemTheme(callback);
      
      expect(matchMediaMock).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      
      unwatch();
      expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('calls callback when system theme changes', () => {
      const addEventListener = vi.fn();
      const removeEventListener = vi.fn();
      const mediaQuery = {
        addEventListener,
        removeEventListener,
      };
      matchMediaMock.mockReturnValue(mediaQuery);
      
      const callback = vi.fn();
      watchSystemTheme(callback);
      
      // Simulate the event
      const handler = addEventListener.mock.calls[0][1];
      handler({ matches: true });
      
      expect(callback).toHaveBeenCalledWith('dark');
      
      handler({ matches: false });
      expect(callback).toHaveBeenCalledWith('light');
    });
  });
});