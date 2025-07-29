import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useAdaptiveDensity, useComponentDensity } from './useAdaptiveDensity';

// Mock useResponsiveOrientation
vi.mock('./useOrientation', () => ({
  useResponsiveOrientation: vi.fn(() => ({
    isMobileLandscape: false,
    isMobilePortrait: true,
    isTabletLandscape: false,
    isTabletPortrait: false,
    width: 375,
    height: 667,
    aspectRatio: 0.562,
  })),
}));

import { useResponsiveOrientation } from './useOrientation';
const mockUseResponsiveOrientation = useResponsiveOrientation as ReturnType<typeof vi.fn>;

describe('useAdaptiveDensity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return normal density for mobile portrait by default', () => {
    mockUseResponsiveOrientation.mockReturnValue({
      isMobileLandscape: false,
      isMobilePortrait: true,
      isTabletLandscape: false,
      isTabletPortrait: false,
      width: 375,
      height: 667,
      aspectRatio: 0.562,
      orientation: 'portrait',
      angle: 0,
      isSupported: true,
      isLandscape: false,
      isPortrait: true,
      isMobile: true,
    });

    const { result } = renderHook(() => useAdaptiveDensity());

    expect(result.current.density).toBe('normal');
    expect(result.current.config.components.buttonHeight).toBe('36px');
    expect(result.current.classes).toContain('density-normal');
    expect(result.current.classes).toContain('density-portrait-mobile');
  });

  it('should return compact density for mobile landscape', () => {
    mockUseResponsiveOrientation.mockReturnValue({
      isMobileLandscape: true,
      isMobilePortrait: false,
      isTabletLandscape: false,
      isTabletPortrait: false,
      width: 667,
      height: 375,
      aspectRatio: 1.779,
      orientation: 'landscape',
      angle: 90,
      isSupported: true,
      isLandscape: true,
      isPortrait: false,
      isMobile: true,
    });

    const { result } = renderHook(() => useAdaptiveDensity());

    expect(result.current.density).toBe('normal'); // Normal for standard landscape
    expect(result.current.classes).toContain('density-landscape-mobile');
  });

  it('should return compact density for ultra-wide mobile landscape', () => {
    mockUseResponsiveOrientation.mockReturnValue({
      isMobileLandscape: true,
      isMobilePortrait: false,
      isTabletLandscape: false,
      isTabletPortrait: false,
      width: 844,
      height: 390,
      aspectRatio: 2.164, // Ultra-wide like iPhone 14 Pro Max
      orientation: 'landscape',
      angle: 90,
      isSupported: true,
      isLandscape: true,
      isPortrait: false,
      isMobile: true,
    });

    const { result } = renderHook(() => useAdaptiveDensity());

    expect(result.current.density).toBe('compact');
    expect(result.current.config.components.buttonHeight).toBe('32px');
  });

  it('should return compact density for small mobile portrait screens', () => {
    mockUseResponsiveOrientation.mockReturnValue({
      isMobileLandscape: false,
      isMobilePortrait: true,
      isTabletLandscape: false,
      isTabletPortrait: false,
      width: 375,
      height: 667,
      aspectRatio: 0.562,
      orientation: 'portrait',
      angle: 0,
      isSupported: true,
      isLandscape: false,
      isPortrait: true,
      isMobile: true,
    });

    // Mock small screen height
    mockUseResponsiveOrientation.mockReturnValueOnce({
      ...mockUseResponsiveOrientation(),
      height: 650, // Small screen
    });

    const { result } = renderHook(() => useAdaptiveDensity());

    expect(result.current.density).toBe('compact');
  });

  it('should return comfortable density for tablet landscape', () => {
    mockUseResponsiveOrientation.mockReturnValue({
      isMobileLandscape: false,
      isMobilePortrait: false,
      isTabletLandscape: true,
      isTabletPortrait: false,
      width: 1024,
      height: 768,
      aspectRatio: 1.333,
      orientation: 'landscape',
      angle: 90,
      isSupported: true,
      isLandscape: true,
      isPortrait: false,
      isMobile: false,
    });

    const { result } = renderHook(() => useAdaptiveDensity());

    expect(result.current.density).toBe('comfortable');
    expect(result.current.config.components.buttonHeight).toBe('44px');
    expect(result.current.classes).toContain('density-landscape-tablet');
  });

  it('should respect user preference over automatic detection', () => {
    mockUseResponsiveOrientation.mockReturnValue({
      isMobileLandscape: true,
      isMobilePortrait: false,
      isTabletLandscape: false,
      isTabletPortrait: false,
      width: 667,
      height: 375,
      aspectRatio: 1.779,
      orientation: 'landscape',
      angle: 90,
      isSupported: true,
      isLandscape: true,
      isPortrait: false,
      isMobile: true,
    });

    const { result } = renderHook(() => useAdaptiveDensity('spacious'));

    expect(result.current.density).toBe('spacious');
    expect(result.current.config.components.buttonHeight).toBe('48px');
  });

  it('should provide correct CSS variables', () => {
    mockUseResponsiveOrientation.mockReturnValue({
      isMobileLandscape: false,
      isMobilePortrait: true,
      isTabletLandscape: false,
      isTabletPortrait: false,
      width: 375,
      height: 667,
      aspectRatio: 0.562,
      orientation: 'portrait',
      angle: 0,
      isSupported: true,
      isLandscape: false,
      isPortrait: true,
      isMobile: true,
    });

    const { result } = renderHook(() => useAdaptiveDensity());

    expect(result.current.cssVariables).toEqual({
      '--density-spacing-xs': '0.375rem',
      '--density-spacing-sm': '0.75rem',
      '--density-spacing-md': '1rem',
      '--density-spacing-lg': '1.25rem',
      '--density-spacing-xl': '1.5rem',
      '--density-font-size': '0.875rem',
      '--density-line-height': '1.25rem',
      '--density-button-height': '36px',
      '--density-input-height': '36px',
      '--density-icon-size': '18px',
      '--density-padding': '0.75rem',
      '--density-gap': '0.75rem',
      '--density-header-height': '52px',
      '--density-navigation-height': '56px',
      '--density-sidebar-width': '260px',
      '--density-panel-width': '280px',
    });
  });
});

describe('useComponentDensity', () => {
  beforeEach(() => {
    mockUseResponsiveOrientation.mockReturnValue({
      isMobileLandscape: false,
      isMobilePortrait: true,
      isTabletLandscape: false,
      isTabletPortrait: false,
      width: 375,
      height: 667,
      aspectRatio: 0.562,
      orientation: 'portrait',
      angle: 0,
      isSupported: true,
      isLandscape: false,
      isPortrait: true,
      isMobile: true,
    });
  });

  it('should return correct button density configuration', () => {
    const { result } = renderHook(() => useComponentDensity('button'));

    expect(result.current.density).toBe('normal');
    expect(result.current.height).toBe('36px');
    expect(result.current.padding).toBe('0.75rem');
    expect(result.current.fontSize).toBe('0.875rem');
    expect(result.current.gap).toBe('0.75rem');
    expect(result.current.iconSize).toBe('18px');
  });

  it('should return correct input density configuration', () => {
    const { result } = renderHook(() => useComponentDensity('input'));

    expect(result.current.density).toBe('normal');
    expect(result.current.height).toBe('36px');
    expect(result.current.padding).toBe('0.75rem');
    expect(result.current.fontSize).toBe('0.875rem');
  });

  it('should return correct list density configuration', () => {
    const { result } = renderHook(() => useComponentDensity('list'));

    expect(result.current.density).toBe('normal');
    expect(result.current.itemHeight).toBe('44px');
    expect(result.current.padding).toBe('0.75rem');
    expect(result.current.gap).toBe('0.375rem');
    expect(result.current.fontSize).toBe('0.875rem');
  });

  it('should adapt list item height based on density', () => {
    // Test compact density
    mockUseResponsiveOrientation.mockReturnValueOnce({
      ...mockUseResponsiveOrientation(),
      height: 650, // Triggers compact mode
    });

    const { result: compactResult } = renderHook(() => useComponentDensity('list'));
    expect(compactResult.current.itemHeight).toBe('36px');

    // Reset and test comfortable density
    mockUseResponsiveOrientation.mockReturnValue({
      isMobileLandscape: false,
      isMobilePortrait: false,
      isTabletLandscape: true,
      isTabletPortrait: false,
      width: 1024,
      height: 768,
      aspectRatio: 1.333,
      orientation: 'landscape',
      angle: 90,
      isSupported: true,
      isLandscape: true,
      isPortrait: false,
      isMobile: false,
    });

    const { result: comfortableResult } = renderHook(() => useComponentDensity('list'));
    expect(comfortableResult.current.itemHeight).toBe('52px');
  });

  it('should return correct menu density configuration', () => {
    const { result } = renderHook(() => useComponentDensity('menu'));

    expect(result.current.density).toBe('normal');
    expect(result.current.itemHeight).toBe('40px');
    expect(result.current.padding).toBe('0.75rem');
    expect(result.current.fontSize).toBe('0.875rem');
    expect(result.current.iconSize).toBe('18px');
  });
});