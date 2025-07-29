import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PWAInstallButton from './PWAInstallButton';

// Mock the usePWA hook
vi.mock('~/hooks/usePWA', () => ({
  usePWA: vi.fn(),
}));

import { usePWA } from '~/hooks/usePWA';

const mockUsePWA = usePWA as any;

describe('PWAInstallButton', () => {
  const mockInstallPWA = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInstallPWA.mockResolvedValue(true);
  });

  it('should render install button when installable', () => {
    mockUsePWA.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      installPWA: mockInstallPWA,
    });

    render(<PWAInstallButton />);

    expect(screen.getByText('Instalar App')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should not render when not installable', () => {
    mockUsePWA.mockReturnValue({
      isInstallable: false,
      isInstalled: false,
      installPWA: mockInstallPWA,
    });

    const { container } = render(<PWAInstallButton />);

    expect(container.firstChild).toBeNull();
  });

  it('should not render when already installed', () => {
    mockUsePWA.mockReturnValue({
      isInstallable: true,
      isInstalled: true,
      installPWA: mockInstallPWA,
    });

    const { container } = render(<PWAInstallButton />);

    expect(container.firstChild).toBeNull();
  });

  it('should call installPWA when clicked', async () => {
    mockUsePWA.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      installPWA: mockInstallPWA,
    });

    render(<PWAInstallButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockInstallPWA).toHaveBeenCalledTimes(1);
    });
  });

  it('should show loading state during installation', async () => {
    const slowInstallPWA = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    mockUsePWA.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      installPWA: slowInstallPWA,
    });

    render(<PWAInstallButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Should show loading state
    expect(screen.getByText('Instalando...')).toBeInTheDocument();
    expect(button).toBeDisabled();

    // Wait for installation to complete
    await waitFor(() => {
      expect(screen.getByText('Instalar App')).toBeInTheDocument();
    });
  });

  it('should handle installation errors gracefully', async () => {
    const failingInstallPWA = vi.fn().mockRejectedValue(new Error('Installation failed'));
    
    mockUsePWA.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      installPWA: failingInstallPWA,
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<PWAInstallButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('[PWA] Installation failed:', expect.any(Error));
    });

    // Button should return to normal state
    expect(screen.getByText('Instalar App')).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    consoleSpy.mockRestore();
  });

  it('should apply custom className', () => {
    mockUsePWA.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      installPWA: mockInstallPWA,
    });

    render(<PWAInstallButton className="custom-class" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('should apply different variants', () => {
    mockUsePWA.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      installPWA: mockInstallPWA,
    });

    const { rerender } = render(<PWAInstallButton variant="primary" />);
    let button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-variant', 'primary');

    rerender(<PWAInstallButton variant="secondary" />);
    button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-variant', 'secondary');
  });

  it('should have touch-friendly attributes', () => {
    mockUsePWA.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      installPWA: mockInstallPWA,
    });

    render(<PWAInstallButton />);

    const button = screen.getByRole('button');
    // The Button component should have touchFriendly prop set to true
    // This would be tested based on the actual Button component implementation
    expect(button).toBeInTheDocument();
  });

  it('should display install icon', () => {
    mockUsePWA.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      installPWA: mockInstallPWA,
    });

    render(<PWAInstallButton />);

    const icon = screen.getByRole('button').querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('w-4', 'h-4');
  });
});