import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useOrientation, useViewportDimensions, useResponsiveOrientation } from './useOrientation';

describe('useOrientation', () => {
  beforeEach(() => {
    // Reset window properties
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
  });

  it('should return portrait orientation for taller than wide screens', () => {
    window.innerWidth = 375;
    window.innerHeight = 667;

    const { result } = renderHook(() => useOrientation());

    expect(result.current.orientation).toBe('portrait');
    expect(result.current.angle).toBe(0);
  });

  it('should return landscape orientation for wider than tall screens', () => {
    window.innerWidth = 667;
    window.innerHeight = 375;

    const { result } = renderHook(() => useOrientation());

    expect(result.current.orientation).toBe('landscape');
    expect(result.current.angle).toBe(90);
  });
});

describe('useViewportDimensions', () => {
  beforeEach(() => {
    window.innerWidth = 375;
    window.innerHeight = 667;
  });

  it('should return correct viewport dimensions for mobile portrait', () => {
    const { result } = renderHook(() => useViewportDimensions());

    expect(result.current.width).toBe(375);
    expect(result.current.height).toBe(667);
    expect(result.current.isLandscape).toBe(false);
    expect(result.current.isPortrait).toBe(true);
    expect(result.current.isMobile).toBe(true);
    expect(result.current.aspectRatio).toBeCloseTo(0.562);
  });

  it('should return correct dimensions for mobile landscape', () => {
    window.innerWidth = 667;
    window.innerHeight = 375;

    const { result } = renderHook(() => useViewportDimensions());

    expect(result.current.width).toBe(667);
    expect(result.current.height).toBe(375);
    expect(result.current.isLandscape).toBe(true);
    expect(result.current.isPortrait).toBe(false);
    expect(result.current.isMobile).toBe(true);
    expect(result.current.aspectRatio).toBeCloseTo(1.779);
  });

  it('should return correct dimensions for tablet', () => {
    window.innerWidth = 768;
    window.innerHeight = 1024;

    const { result } = renderHook(() => useViewportDimensions());

    expect(result.current.width).toBe(768);
    expect(result.current.height).toBe(1024);
    expect(result.current.isLandscape).toBe(false);
    expect(result.current.isPortrait).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.aspectRatio).toBe(0.75);
  });
});

describe('useResponsiveOrientation', () => {
  beforeEach(() => {
    window.innerWidth = 375;
    window.innerHeight = 667;
  });

  it('should return combined orientation and viewport data for mobile portrait', () => {
    const { result } = renderHook(() => useResponsiveOrientation());

    expect(result.current.orientation).toBe('portrait');
    expect(result.current.width).toBe(375);
    expect(result.current.height).toBe(667);
    expect(result.current.isMobilePortrait).toBe(true);
    expect(result.current.isMobileLandscape).toBe(false);
    expect(result.current.isTabletLandscape).toBe(false);
    expect(result.current.isTabletPortrait).toBe(false);
  });

  it('should detect mobile landscape correctly', () => {
    window.innerWidth = 667;
    window.innerHeight = 375;

    const { result } = renderHook(() => useResponsiveOrientation());

    expect(result.current.orientation).toBe('landscape');
    expect(result.current.isMobileLandscape).toBe(true);
    expect(result.current.isMobilePortrait).toBe(false);
  });

  it('should detect tablet landscape correctly', () => {
    window.innerWidth = 800;
    window.innerHeight = 600;

    const { result } = renderHook(() => useResponsiveOrientation());

    expect(result.current.orientation).toBe('landscape');
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTabletLandscape).toBe(true);
    expect(result.current.isTabletPortrait).toBe(false);
  });

  it('should detect tablet portrait correctly', () => {
    window.innerWidth = 768;
    window.innerHeight = 1024;

    const { result } = renderHook(() => useResponsiveOrientation());

    expect(result.current.orientation).toBe('portrait');
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTabletPortrait).toBe(true);
    expect(result.current.isTabletLandscape).toBe(false);
  });
});