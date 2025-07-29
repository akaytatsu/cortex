import { render, screen } from '@testing-library/react';
import { VirtualKeyboardHandler } from './VirtualKeyboardHandler';
import { useVirtualKeyboard } from '~/hooks/useVirtualKeyboard';

// Mock do hook useVirtualKeyboard
jest.mock('~/hooks/useVirtualKeyboard');
const mockUseVirtualKeyboard = useVirtualKeyboard as jest.MockedFunction<typeof useVirtualKeyboard>;

describe('VirtualKeyboardHandler', () => {
  const mockKeyboardState = {
    isVisible: false,
    height: 0,
    overlayHeight: 0,
    adjustForKeyboard: jest.fn(),
    scrollToElement: jest.fn()
  };

  beforeEach(() => {
    mockUseVirtualKeyboard.mockReturnValue(mockKeyboardState);
    
    // Mock da meta viewport
    const metaViewport = document.createElement('meta');
    metaViewport.name = 'viewport';
    metaViewport.content = 'width=device-width, initial-scale=1.0';
    document.head.appendChild(metaViewport);
    
    // Reset body classes e styles
    document.body.className = '';
    document.body.style.cssText = '';
  });

  afterEach(() => {
    // Limpa meta tags criadas no teste
    const metaViewports = document.head.querySelectorAll('meta[name="viewport"]');
    metaViewports.forEach(meta => meta.remove());
    
    // Reset body
    document.body.className = '';
    document.body.style.cssText = '';
    
    jest.clearAllMocks();
  });

  it('should render children correctly', () => {
    render(
      <VirtualKeyboardHandler>
        <div data-testid="child">Test content</div>
      </VirtualKeyboardHandler>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should apply keyboard-hidden class when keyboard is not visible', () => {
    const { container } = render(
      <VirtualKeyboardHandler>
        <div>Content</div>
      </VirtualKeyboardHandler>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('keyboard-hidden');
    expect(wrapper).toHaveAttribute('data-keyboard-visible', 'false');
    expect(wrapper).toHaveAttribute('data-keyboard-height', '0');
  });

  it('should apply keyboard-visible class when keyboard is visible', () => {
    mockUseVirtualKeyboard.mockReturnValue({
      ...mockKeyboardState,
      isVisible: true,
      height: 300,
      overlayHeight: 250
    });

    const { container } = render(
      <VirtualKeyboardHandler>
        <div>Content</div>
      </VirtualKeyboardHandler>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('keyboard-visible');
    expect(wrapper).toHaveAttribute('data-keyboard-visible', 'true');
    expect(wrapper).toHaveAttribute('data-keyboard-height', '300');
  });

  it('should add padding bottom when keyboard is visible and addPaddingBottom is true', () => {
    mockUseVirtualKeyboard.mockReturnValue({
      ...mockKeyboardState,
      isVisible: true,
      height: 300,
      overlayHeight: 250
    });

    const { container } = render(
      <VirtualKeyboardHandler addPaddingBottom={true}>
        <div>Content</div>
      </VirtualKeyboardHandler>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.paddingBottom).toBe('250px');
  });

  it('should not add padding bottom when addPaddingBottom is false', () => {
    mockUseVirtualKeyboard.mockReturnValue({
      ...mockKeyboardState,
      isVisible: true,
      height: 300,
      overlayHeight: 250
    });

    const { container } = render(
      <VirtualKeyboardHandler addPaddingBottom={false}>
        <div>Content</div>
      </VirtualKeyboardHandler>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.paddingBottom).toBe('');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <VirtualKeyboardHandler className="custom-class">
        <div>Content</div>
      </VirtualKeyboardHandler>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-class');
    expect(wrapper).toHaveClass('keyboard-hidden');
  });

  describe('viewport adjustment', () => {
    it('should adjust viewport when keyboard is visible and adjustViewport is true', () => {
      mockUseVirtualKeyboard.mockReturnValue({
        ...mockKeyboardState,
        isVisible: true,
        height: 300,
        overlayHeight: 250
      });

      render(
        <VirtualKeyboardHandler adjustViewport={true}>
          <div>Content</div>
        </VirtualKeyboardHandler>
      );

      const metaViewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
      expect(metaViewport.content).toBe('width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      
      expect(document.body).toHaveClass('virtual-keyboard-visible');
      expect(document.body.style.getPropertyValue('--keyboard-height')).toBe('300px');
      expect(document.body.style.getPropertyValue('--keyboard-overlay-height')).toBe('250px');
    });

    it('should not adjust viewport when adjustViewport is false', () => {
      mockUseVirtualKeyboard.mockReturnValue({
        ...mockKeyboardState,
        isVisible: true,
        height: 300,
        overlayHeight: 250
      });

      render(
        <VirtualKeyboardHandler adjustViewport={false}>
          <div>Content</div>
        </VirtualKeyboardHandler>
      );

      const metaViewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
      expect(metaViewport.content).toBe('width=device-width, initial-scale=1.0'); // Original content
      
      expect(document.body).not.toHaveClass('virtual-keyboard-visible');
    });

    it('should restore original viewport when keyboard hides', () => {
      const { rerender } = render(
        <VirtualKeyboardHandler adjustViewport={true}>
          <div>Content</div>
        </VirtualKeyboardHandler>
      );

      // Simula teclado aparecendo
      mockUseVirtualKeyboard.mockReturnValue({
        ...mockKeyboardState,
        isVisible: true,
        height: 300,
        overlayHeight: 250
      });

      rerender(
        <VirtualKeyboardHandler adjustViewport={true}>
          <div>Content</div>
        </VirtualKeyboardHandler>
      );

      // Simula teclado sumindo
      mockUseVirtualKeyboard.mockReturnValue({
        ...mockKeyboardState,
        isVisible: false,
        height: 0,
        overlayHeight: 0
      });

      rerender(
        <VirtualKeyboardHandler adjustViewport={true}>
          <div>Content</div>
        </VirtualKeyboardHandler>
      );

      const metaViewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
      expect(metaViewport.content).toBe('width=device-width, initial-scale=1.0'); // Restored
      
      expect(document.body).not.toHaveClass('virtual-keyboard-visible');
      expect(document.body.style.getPropertyValue('--keyboard-height')).toBe('');
      expect(document.body.style.getPropertyValue('--keyboard-overlay-height')).toBe('');
    });

    it('should handle missing viewport meta tag gracefully', () => {
      // Remove viewport meta tag
      const metaViewports = document.head.querySelectorAll('meta[name="viewport"]');
      metaViewports.forEach(meta => meta.remove());

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockUseVirtualKeyboard.mockReturnValue({
        ...mockKeyboardState,
        isVisible: true,
        height: 300,
        overlayHeight: 250
      });

      render(
        <VirtualKeyboardHandler adjustViewport={true}>
          <div>Content</div>
        </VirtualKeyboardHandler>
      );

      expect(consoleSpy).toHaveBeenCalledWith('VirtualKeyboardHandler: meta viewport não encontrada');
      
      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should cleanup viewport and body styles on unmount', () => {
      mockUseVirtualKeyboard.mockReturnValue({
        ...mockKeyboardState,
        isVisible: true,
        height: 300,
        overlayHeight: 250
      });

      const { unmount } = render(
        <VirtualKeyboardHandler adjustViewport={true}>
          <div>Content</div>
        </VirtualKeyboardHandler>
      );

      // Verifica que estilos foram aplicados
      expect(document.body).toHaveClass('virtual-keyboard-visible');

      unmount();

      // Verifica que estilos foram removidos
      const metaViewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
      expect(metaViewport.content).toBe('width=device-width, initial-scale=1.0'); // Restored
      
      expect(document.body).not.toHaveClass('virtual-keyboard-visible');
      expect(document.body.style.getPropertyValue('--keyboard-height')).toBe('');
      expect(document.body.style.getPropertyValue('--keyboard-overlay-height')).toBe('');
    });
  });
});