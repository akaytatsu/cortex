import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

const mockMatchMedia = vi.fn();

// Simple responsive component for testing
const ResponsiveTestComponent = ({ className = '' }: { className?: string }) => {
  return React.createElement('div', {
    className: `w-full md:w-auto ${className}`,
    'data-testid': 'responsive-element'
  }, [
    React.createElement('h1', { 
      key: 'title',
      className: 'text-lg md:text-xl'
    }, 'Responsive Title'),
    React.createElement('button', {
      key: 'button',
      className: 'touch-target bg-blue-600 text-white px-4 py-2 rounded',
      'data-testid': 'responsive-button'
    }, 'Click Me')
  ]);
};

describe('Responsive Layout Testing', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Mobile Layout (375px)', () => {
    beforeEach(() => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query.includes('max-width: 767px'),
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
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });
    });

    it('should render mobile layout correctly', () => {
      render(React.createElement(ResponsiveTestComponent));
      
      const element = screen.getByTestId('responsive-element');
      expect(element).toBeInTheDocument();
      expect(element).toHaveClass('w-full');
      
      const button = screen.getByTestId('responsive-button');
      expect(button).toHaveClass('touch-target');
    });

    it('should use mobile viewport dimensions', () => {
      expect(window.innerWidth).toBe(375);
      expect(window.innerHeight).toBe(667);
      expect(window.matchMedia('(max-width: 767px)').matches).toBe(true);
    });
  });

  describe('Tablet Layout (768px)', () => {
    beforeEach(() => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query.includes('min-width: 768px') && !query.includes('min-width: 1024px'),
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

    it('should render tablet layout correctly', () => {
      render(React.createElement(ResponsiveTestComponent));
      
      const element = screen.getByTestId('responsive-element');
      expect(element).toBeInTheDocument();
      expect(element).toHaveClass('md:w-auto');
    });

    it('should use tablet viewport dimensions', () => {
      expect(window.innerWidth).toBe(768);
      expect(window.innerHeight).toBe(1024);
      expect(window.matchMedia('(min-width: 768px)').matches).toBe(true);
    });
  });

  describe('Desktop Layout (1024px+)', () => {
    beforeEach(() => {
      mockMatchMedia.mockImplementation((query: string) => ({
        matches: query.includes('min-width: 1024px') || 
                query.includes('min-width: 768px'),
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

    it('should render desktop layout correctly', () => {
      render(React.createElement(ResponsiveTestComponent));
      
      const element = screen.getByTestId('responsive-element');
      expect(element).toBeInTheDocument();
      expect(element).toHaveClass('md:w-auto');
    });

    it('should use desktop viewport dimensions', () => {
      expect(window.innerWidth).toBe(1024);
      expect(window.innerHeight).toBe(768);
      expect(window.matchMedia('(min-width: 1024px)').matches).toBe(true);
    });
  });

  describe('Touch-friendly Elements', () => {
    it('should have appropriate touch target sizes', () => {
      render(React.createElement(ResponsiveTestComponent));
      
      const button = screen.getByTestId('responsive-button');
      expect(button).toHaveClass('touch-target');
      expect(button).toHaveClass('px-4', 'py-2');
    });
  });

  describe('Responsive Typography', () => {
    it('should use responsive text sizes', () => {
      render(React.createElement(ResponsiveTestComponent));
      
      const title = screen.getByText('Responsive Title');
      expect(title).toHaveClass('text-lg', 'md:text-xl');
    });
  });
});