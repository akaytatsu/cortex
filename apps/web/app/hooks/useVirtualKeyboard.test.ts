import { renderHook, act } from '@testing-library/react';
import { useVirtualKeyboard } from './useVirtualKeyboard';
import { vi } from 'vitest';

// Mock do Visual Viewport API
const mockVisualViewport = {
  height: 800,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

describe('useVirtualKeyboard', () => {
  beforeEach(() => {
    // Reset window dimensions
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800
    });
    
    Object.defineProperty(window.screen, 'height', {
      writable: true,
      configurable: true,
      value: 800
    });

    // Reset window.scrollTo and scrollBy
    window.scrollTo = vi.fn();
    window.scrollBy = vi.fn();
    
    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Remove visualViewport mock
    delete (window as any).visualViewport;
  });

  describe('Visual Viewport API detection', () => {
    beforeEach(() => {
      (window as any).visualViewport = mockVisualViewport;
    });

    it('should detect keyboard when viewport height decreases', () => {
      const { result } = renderHook(() => useVirtualKeyboard());
      
      expect(result.current.isVisible).toBe(false);
      
      // Simula teclado aparecendo (viewport height diminui)
      mockVisualViewport.height = 400;
      const resizeCallback = mockVisualViewport.addEventListener.mock.calls[0][1];
      
      act(() => {
        resizeCallback();
      });
      
      expect(result.current.isVisible).toBe(true);
      expect(result.current.height).toBe(400); // 800 - 400
      expect(result.current.overlayHeight).toBe(350); // height - 50
    });

    it('should detect keyboard hiding when viewport height increases', () => {
      const { result } = renderHook(() => useVirtualKeyboard());
      
      // Simula teclado aparecendo
      mockVisualViewport.height = 400;
      const resizeCallback = mockVisualViewport.addEventListener.mock.calls[0][1];
      
      act(() => {
        resizeCallback();
      });
      
      expect(result.current.isVisible).toBe(true);
      
      // Simula teclado sumindo
      mockVisualViewport.height = 800;
      
      act(() => {
        resizeCallback();
      });
      
      expect(result.current.isVisible).toBe(false);
      expect(result.current.height).toBe(0);
      expect(result.current.overlayHeight).toBe(0);
    });

    it('should not detect keyboard for small height differences', () => {
      const { result } = renderHook(() => useVirtualKeyboard());
      
      // Simula mudança pequena de altura (menos que 150px)
      mockVisualViewport.height = 700;
      const resizeCallback = mockVisualViewport.addEventListener.mock.calls[0][1];
      
      act(() => {
        resizeCallback();
      });
      
      expect(result.current.isVisible).toBe(false);
      expect(result.current.height).toBe(0);
    });
  });

  describe('Fallback detection (without Visual Viewport API)', () => {
    it('should detect keyboard using window resize', () => {
      const { result } = renderHook(() => useVirtualKeyboard());
      
      expect(result.current.isVisible).toBe(false);
      
      // Simula resize do window (teclado aparecendo)
      Object.defineProperty(window, 'innerHeight', {
        value: 500 // 800 - 300, mais que 25% de 800
      });
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      
      expect(result.current.isVisible).toBe(true);
      expect(result.current.height).toBe(300); // 800 - 500
    });

    it('should not detect keyboard for small height changes', () => {
      const { result } = renderHook(() => useVirtualKeyboard());
      
      // Simula mudança pequena (menos que 25% de 800px = 200px)
      Object.defineProperty(window, 'innerHeight', {
        value: 650 // 800 - 150, menos que threshold
      });
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      
      expect(result.current.isVisible).toBe(false);
    });
  });

  describe('adjustForKeyboard', () => {
    it('should scroll when element is covered by keyboard', () => {
      (window as any).visualViewport = mockVisualViewport;
      
      const { result } = renderHook(() => useVirtualKeyboard());
      
      // Simula teclado visível
      mockVisualViewport.height = 400;
      const resizeCallback = mockVisualViewport.addEventListener.mock.calls[0][1];
      
      act(() => {
        resizeCallback();
      });
      
      // Mock element que está sendo coberto pelo teclado
      const mockElement = {
        getBoundingClientRect: () => ({
          bottom: 600 // Elemento está em posição que seria coberta
        })
      } as HTMLElement;
      
      act(() => {
        result.current.adjustForKeyboard(mockElement);
      });
      
      expect(window.scrollBy).toHaveBeenCalledWith(0, 220); // 600 - (800 - 400) + 20
    });

    it('should not scroll when keyboard is not visible', () => {
      const { result } = renderHook(() => useVirtualKeyboard());
      
      const mockElement = {
        getBoundingClientRect: () => ({
          bottom: 600
        })
      } as HTMLElement;
      
      act(() => {
        result.current.adjustForKeyboard(mockElement);
      });
      
      expect(window.scrollBy).not.toHaveBeenCalled();
    });
  });

  describe('scrollToElement', () => {
    it('should scroll element to center of available viewport', () => {
      (window as any).visualViewport = mockVisualViewport;
      
      const { result } = renderHook(() => useVirtualKeyboard());
      
      // Simula teclado visível
      mockVisualViewport.height = 400;
      const resizeCallback = mockVisualViewport.addEventListener.mock.calls[0][1];
      
      act(() => {
        resizeCallback();
      });
      
      // Mock element position
      const mockElement = {
        getBoundingClientRect: () => ({
          top: 300
        })
      } as HTMLElement;
      
      Object.defineProperty(window, 'pageYOffset', {
        value: 0
      });
      
      act(() => {
        result.current.scrollToElement(mockElement);
      });
      
      // availableHeight = 800 - 400 = 400
      // targetPosition = 0 + 300 - (400/2) + 20 = 120
      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 120,
        behavior: 'smooth'
      });
    });

    it('should not scroll to negative positions', () => {
      const { result } = renderHook(() => useVirtualKeyboard());
      
      const mockElement = {
        getBoundingClientRect: () => ({
          top: 50
        })
      } as HTMLElement;
      
      Object.defineProperty(window, 'pageYOffset', {
        value: 0
      });
      
      act(() => {
        result.current.scrollToElement(mockElement);
      });
      
      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 0, // Math.max(0, negative_value)
        behavior: 'smooth'
      });
    });
  });

  describe('automatic input focus handling', () => {
    it('should handle focusin events on input elements', () => {
      const { result } = renderHook(() => useVirtualKeyboard());
      
      // Simula teclado visível
      (window as any).visualViewport = mockVisualViewport;
      mockVisualViewport.height = 400;
      
      const mockInput = {
        tagName: 'INPUT',
        getBoundingClientRect: () => ({
          bottom: 600
        })
      } as HTMLElement;
      
      // Spy on adjustForKeyboard
      const adjustSpy = vi.spyOn(result.current, 'adjustForKeyboard');
      
      act(() => {
        const focusEvent = new FocusEvent('focusin', { bubbles: true });
        Object.defineProperty(focusEvent, 'target', { value: mockInput });
        document.dispatchEvent(focusEvent);
      });
      
      // Aguarda o timeout de 300ms
      setTimeout(() => {
        expect(adjustSpy).toHaveBeenCalledWith(mockInput);
      }, 300);
    });

    it('should handle focusin events on textarea elements', () => {
      const { result } = renderHook(() => useVirtualKeyboard());
      
      const mockTextarea = {
        tagName: 'TEXTAREA',
        getBoundingClientRect: () => ({
          bottom: 500
        })
      } as HTMLElement;
      
      const adjustSpy = vi.spyOn(result.current, 'adjustForKeyboard');
      
      act(() => {
        const focusEvent = new FocusEvent('focusin', { bubbles: true });
        Object.defineProperty(focusEvent, 'target', { value: mockTextarea });
        document.dispatchEvent(focusEvent);
      });
      
      setTimeout(() => {
        expect(adjustSpy).toHaveBeenCalledWith(mockTextarea);
      }, 300);
    });

    it('should handle focusin events on contentEditable elements', () => {
      const { result } = renderHook(() => useVirtualKeyboard());
      
      const mockContentEditable = {
        tagName: 'DIV',
        contentEditable: 'true',
        getBoundingClientRect: () => ({
          bottom: 400
        })
      } as HTMLElement;
      
      const adjustSpy = vi.spyOn(result.current, 'adjustForKeyboard');
      
      act(() => {
        const focusEvent = new FocusEvent('focusin', { bubbles: true });
        Object.defineProperty(focusEvent, 'target', { value: mockContentEditable });
        document.dispatchEvent(focusEvent);
      });
      
      setTimeout(() => {
        expect(adjustSpy).toHaveBeenCalledWith(mockContentEditable);
      }, 300);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      (window as any).visualViewport = mockVisualViewport;
      
      const { unmount } = renderHook(() => useVirtualKeyboard());
      
      expect(mockVisualViewport.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      
      unmount();
      
      expect(mockVisualViewport.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should remove window resize listener when Visual Viewport API is not available', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() => useVirtualKeyboard());
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });
});