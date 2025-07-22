import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemeLogic } from './useTheme';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock matchMedia
const matchMediaMock = vi.fn();

describe('useTheme', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock window.localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      value: matchMediaMock,
      writable: true
    });

    // Mock document.documentElement
    Object.defineProperty(document, 'documentElement', {
      value: {
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
        },
        style: {
          setProperty: vi.fn(),
        }
      },
      writable: true
    });

    // Default matchMedia implementation
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? false : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with system theme by default', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => useThemeLogic());
    
    expect(result.current.theme).toBe('system');
    expect(result.current.actualTheme).toBe('light');
  });

  it('initializes with stored theme from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('dark');
    
    const { result } = renderHook(() => useThemeLogic());
    
    expect(result.current.theme).toBe('dark');
    expect(result.current.actualTheme).toBe('dark');
  });

  it('detects dark system preference', () => {
    localStorageMock.getItem.mockReturnValue(null);
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? true : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    
    const { result } = renderHook(() => useThemeLogic());
    
    expect(result.current.theme).toBe('system');
    expect(result.current.actualTheme).toBe('dark');
  });

  it('sets theme and updates localStorage', () => {
    const { result } = renderHook(() => useThemeLogic());
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(result.current.theme).toBe('dark');
    expect(result.current.actualTheme).toBe('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('cortex-theme', 'dark');
  });

  it('resolves system theme correctly', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? true : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    
    const { result } = renderHook(() => useThemeLogic());
    
    act(() => {
      result.current.setTheme('system');
    });
    
    expect(result.current.theme).toBe('system');
    expect(result.current.actualTheme).toBe('dark');
  });

  it('applies theme classes to document', () => {
    const { result } = renderHook(() => useThemeLogic());
    const mockClassList = document.documentElement.classList;
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(mockClassList.remove).toHaveBeenCalledWith('light', 'dark');
    expect(mockClassList.add).toHaveBeenCalledWith('dark');
  });

  it('updates CSS custom properties', () => {
    const { result } = renderHook(() => useThemeLogic());
    const mockStyle = document.documentElement.style;
    
    act(() => {
      result.current.setTheme('light');
    });
    
    expect(mockStyle.setProperty).toHaveBeenCalledWith('--background', '248 250 252');
    expect(mockStyle.setProperty).toHaveBeenCalledWith('--foreground', '15 23 42');
  });

  it('listens to system theme changes', () => {
    const mockAddEventListener = vi.fn();
    const mockRemoveEventListener = vi.fn();
    
    matchMediaMock.mockImplementation(() => ({
      matches: false,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    }));
    
    const { unmount } = renderHook(() => useThemeLogic());
    
    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    
    unmount();
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('handles theme changes when system preference changes', () => {
    let changeCallback: (() => void) | undefined;
    
    matchMediaMock.mockImplementation(() => ({
      matches: false,
      addEventListener: (event: string, callback: () => void) => {
        if (event === 'change') {
          changeCallback = callback;
        }
      },
      removeEventListener: vi.fn(),
    }));
    
    const { result } = renderHook(() => useThemeLogic());
    
    // Set theme to system
    act(() => {
      result.current.setTheme('system');
    });
    
    // Simulate system theme change to dark
    matchMediaMock.mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    
    // Trigger the change callback
    act(() => {
      changeCallback?.();
    });
    
    expect(result.current.actualTheme).toBe('dark');
  });
});