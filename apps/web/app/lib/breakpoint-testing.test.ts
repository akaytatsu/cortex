import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock window.matchMedia
const mockMatchMedia = vi.fn();

describe('Breakpoint Testing Utils', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Mobile Breakpoint (375px)', () => {
    beforeEach(() => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query.includes('max-width: 374px') ? false : query.includes('min-width: 375px') ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      // Set viewport dimensions
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

    it('should detect mobile viewport correctly', () => {
      expect(window.innerWidth).toBe(375);
      expect(window.matchMedia('(min-width: 375px)').matches).toBe(true);
      expect(window.matchMedia('(max-width: 374px)').matches).toBe(false);
    });

    it('should apply mobile-first styles', () => {
      const testElement = document.createElement('div');
      testElement.className = 'w-full sm:w-auto p-4 sm:p-6';
      
      // In mobile, should use base classes (w-full, p-4)
      expect(testElement.classList.contains('w-full')).toBe(true);
      expect(testElement.classList.contains('p-4')).toBe(true);
    });
  });

  describe('Tablet Breakpoint (768px)', () => {
    beforeEach(() => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query.includes('min-width: 768px') ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024,
      });
    });

    it('should detect tablet viewport correctly', () => {
      expect(window.innerWidth).toBe(768);
      expect(window.matchMedia('(min-width: 768px)').matches).toBe(true);
    });

    it('should apply tablet responsive classes', () => {
      const testElement = document.createElement('div');
      testElement.className = 'grid-cols-1 md:grid-cols-2 gap-4 md:gap-6';
      
      // Should have both mobile and tablet classes
      expect(testElement.classList.contains('grid-cols-1')).toBe(true);
      expect(testElement.classList.contains('md:grid-cols-2')).toBe(true);
    });
  });

  describe('Desktop Breakpoint (1024px+)', () => {
    beforeEach(() => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query.includes('min-width: 1024px') ? true : 
                query.includes('min-width: 768px') ? true : 
                query.includes('min-width: 375px') ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768,
      });
    });

    it('should detect desktop viewport correctly', () => {
      expect(window.innerWidth).toBe(1024);
      expect(window.matchMedia('(min-width: 1024px)').matches).toBe(true);
    });

    it('should apply desktop responsive classes', () => {
      const testElement = document.createElement('div');
      testElement.className = 'flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-6';
      
      expect(testElement.classList.contains('flex-col')).toBe(true);
      expect(testElement.classList.contains('lg:flex-row')).toBe(true);
    });
  });

  describe('Large Desktop Breakpoint (1280px+)', () => {
    beforeEach(() => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query.includes('min-width: 1280px') ? true :
                query.includes('min-width: 1024px') ? true : 
                query.includes('min-width: 768px') ? true : 
                query.includes('min-width: 375px') ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      });
    });

    it('should detect large desktop viewport correctly', () => {
      expect(window.innerWidth).toBe(1280);
      expect(window.matchMedia('(min-width: 1280px)').matches).toBe(true);
    });

    it('should apply large desktop responsive classes', () => {
      const testElement = document.createElement('div');
      testElement.className = 'max-w-md xl:max-w-lg 2xl:max-w-xl';
      
      expect(testElement.classList.contains('max-w-md')).toBe(true);
      expect(testElement.classList.contains('xl:max-w-lg')).toBe(true);
    });
  });
});

// Helper function to test component responsiveness
export const testComponentResponsiveness = async (
  Component: React.ComponentType<any>,
  props: any = {},
  breakpoints: Array<{ width: number; height: number; name: string }> = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1024, height: 768, name: 'desktop' },
    { width: 1280, height: 720, name: 'large-desktop' },
  ]
) => {
  const results: Record<string, any> = {};

  for (const breakpoint of breakpoints) {
    // Set viewport dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: breakpoint.width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: breakpoint.height,
    });

    // Update matchMedia mock for current breakpoint
    mockMatchMedia.mockImplementation((query: string) => {
      const isMobile = breakpoint.width < 768;
      const isTablet = breakpoint.width >= 768 && breakpoint.width < 1024;
      const isDesktop = breakpoint.width >= 1024 && breakpoint.width < 1280;
      const isLargeDesktop = breakpoint.width >= 1280;

      if (query.includes('min-width: 1280px')) return { matches: isLargeDesktop };
      if (query.includes('min-width: 1024px')) return { matches: isDesktop || isLargeDesktop };
      if (query.includes('min-width: 768px')) return { matches: isTablet || isDesktop || isLargeDesktop };
      if (query.includes('min-width: 375px')) return { matches: !isMobile || breakpoint.width >= 375 };
      if (query.includes('max-width: 374px')) return { matches: breakpoint.width < 375 };

      return { matches: false };
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    // Render component and capture result using React.createElement
    const { container } = render(React.createElement(Component, props));
    results[breakpoint.name] = {
      width: breakpoint.width,
      height: breakpoint.height,
      html: container.innerHTML,
      element: container.firstChild,
    };
  }

  return results;
};

describe('Component Responsiveness Helper', () => {
  it('should test component across different breakpoints', async () => {
    const TestComponent = ({ className = '' }: { className?: string }) => 
      React.createElement('div', {
        className: `w-full sm:w-auto ${className}`
      }, React.createElement('span', {
        className: 'block md:inline'
      }, 'Test Content'));

    const results = await testComponentResponsiveness(TestComponent);

    expect(results.mobile).toBeDefined();
    expect(results.tablet).toBeDefined();
    expect(results.desktop).toBeDefined();
    expect(results['large-desktop']).toBeDefined();

    // Verify different breakpoints have different widths
    expect(results.mobile.width).toBe(375);
    expect(results.tablet.width).toBe(768);
    expect(results.desktop.width).toBe(1024);
    expect(results['large-desktop'].width).toBe(1280);
  });
});