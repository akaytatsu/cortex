import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PWASplashScreen from './PWASplashScreen';

// Mock window.matchMedia
const mockMatchMedia = vi.fn();

describe('PWASplashScreen', () => {
  const mockOnHide = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock window.matchMedia
    Object.defineProperty(global.window, 'matchMedia', {
      value: mockMatchMedia,
      writable: true,
    });

    // Mock navigator.standalone for iOS
    Object.defineProperty(global.window, 'navigator', {
      value: {
        ...global.navigator,
        standalone: false,
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should render splash screen for PWA launch', () => {
    // Mock PWA display mode
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
    }));

    render(<PWASplashScreen onHide={mockOnHide} />);

    expect(screen.getByText('Cortex IDE')).toBeInTheDocument();
    expect(screen.getByText('Intelligent Development Environment')).toBeInTheDocument();
    expect(screen.getByText('Powered by AI • Self-hosted • Secure')).toBeInTheDocument();
  });

  it('should not render for non-PWA launch', () => {
    // Mock non-PWA display mode
    mockMatchMedia.mockReturnValue({ matches: false });

    const { container } = render(<PWASplashScreen onHide={mockOnHide} />);

    expect(container.firstChild).toBeNull();
    expect(mockOnHide).toHaveBeenCalledTimes(1);
  });

  it('should detect iOS standalone mode', () => {
    mockMatchMedia.mockReturnValue({ matches: false });
    (global.window.navigator as any).standalone = true;

    render(<PWASplashScreen onHide={mockOnHide} />);

    expect(screen.getByText('Cortex IDE')).toBeInTheDocument();
  });

  it('should hide after default duration', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
    }));

    render(<PWASplashScreen onHide={mockOnHide} />);

    expect(screen.getByText('Cortex IDE')).toBeInTheDocument();

    // Fast-forward past default duration (2000ms)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockOnHide).toHaveBeenCalledTimes(1);
  });

  it('should hide after custom duration', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
    }));

    render(<PWASplashScreen onHide={mockOnHide} duration={1000} />);

    expect(screen.getByText('Cortex IDE')).toBeInTheDocument();

    // Fast-forward past custom duration (1000ms)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockOnHide).toHaveBeenCalledTimes(1);
  });

  it('should show loading animation with correct timing', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
    }));

    render(<PWASplashScreen onHide={mockOnHide} />);

    // Initially elements should have opacity-0 (not loaded)
    const logo = screen.getByText('Cortex IDE').closest('div');
    expect(logo).toHaveClass('opacity-0');

    // After load timer (500ms), elements should have opacity-100
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(logo).toHaveClass('opacity-100');
  });

  it('should have proper CSS classes for animations', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
    }));

    render(<PWASplashScreen onHide={mockOnHide} />);

    // Check main container
    const container = screen.getByText('Cortex IDE').closest('[class*="fixed"]');
    expect(container).toHaveClass('fixed', 'inset-0', 'z-50');

    // Check logo container
    const logoContainer = screen.getByRole('img', { hidden: true })?.parentElement;
    expect(logoContainer).toHaveClass('w-24', 'h-24', 'rounded-2xl');

    // Check loading dots
    const loadingDots = screen.getByText('Cortex IDE')
      .closest('[class*="relative"]')
      ?.querySelector('[class*="animate-bounce"]');
    expect(loadingDots).toBeInTheDocument();
  });

  it('should cleanup timers on unmount', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
    }));

    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount } = render(<PWASplashScreen onHide={mockOnHide} />);

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2); // loadTimer and hideTimer
  });

  it('should handle missing onHide callback', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
    }));

    // Should not throw error without onHide
    expect(() => {
      render(<PWASplashScreen />);
    }).not.toThrow();

    // Fast-forward past duration
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Should not throw error when calling undefined onHide
  });

  it('should have correct gradient background', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
    }));

    render(<PWASplashScreen onHide={mockOnHide} />);

    const background = screen.getByText('Cortex IDE')
      .closest('[class*="fixed"]')
      ?.querySelector('[class*="bg-gradient-to-br"]');
    
    expect(background).toHaveClass(
      'bg-gradient-to-br', 
      'from-blue-50', 
      'to-indigo-100', 
      'dark:from-gray-900', 
      'dark:to-gray-800'
    );
  });

  it('should display SVG icon with correct attributes', () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
    }));

    render(<PWASplashScreen onHide={mockOnHide} />);

    const svg = screen.getByRole('img', { hidden: true });
    expect(svg).toHaveClass('w-12', 'h-12', 'text-white');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });
});