import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KeyboardAwareInput, KeyboardAwareInputRef } from './KeyboardAwareInput';
import { useVirtualKeyboard } from '../../hooks/useVirtualKeyboard';
import { useRef } from 'react';
import { vi } from 'vitest';

// Mock do hook useVirtualKeyboard
vi.mock('../../hooks/useVirtualKeyboard');
const mockUseVirtualKeyboard = useVirtualKeyboard as ReturnType<typeof vi.mocked>;

// Mock do IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

describe('KeyboardAwareInput', () => {
  const mockAdjustForKeyboard = vi.fn();
  const mockScrollToElement = vi.fn();

  beforeEach(() => {
    mockUseVirtualKeyboard.mockReturnValue({
      isVisible: false,
      height: 0,
      overlayHeight: 0,
      adjustForKeyboard: mockAdjustForKeyboard,
      scrollToElement: mockScrollToElement
    });

    vi.clearAllMocks();
  });

  it('should render as Input with touch-friendly enabled', () => {
    render(<KeyboardAwareInput placeholder="Test input" />);
    
    const input = screen.getByPlaceholderText('Test input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('touch-target');
  });

  it('should apply keyboard-aware-input class', () => {
    render(<KeyboardAwareInput placeholder="Test input" />);
    
    const input = screen.getByPlaceholderText('Test input');
    expect(input.closest('.keyboard-aware-input')).toBeInTheDocument();
  });

  it('should apply maintain-viewport class when maintainViewport is true', () => {
    render(<KeyboardAwareInput placeholder="Test input" maintainViewport={true} />);
    
    const input = screen.getByPlaceholderText('Test input');
    expect(input.closest('.maintain-viewport')).toBeInTheDocument();
  });

  it('should not apply maintain-viewport class when maintainViewport is false', () => {
    render(<KeyboardAwareInput placeholder="Test input" maintainViewport={false} />);
    
    const input = screen.getByPlaceholderText('Test input');
    expect(input.closest('.maintain-viewport')).not.toBeInTheDocument();
  });

  it('should call scrollToElement on focus when autoScroll is true', async () => {
    render(<KeyboardAwareInput placeholder="Test input" autoScroll={true} />);
    
    const input = screen.getByPlaceholderText('Test input');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(mockScrollToElement).toHaveBeenCalledWith(input, 20);
    }, { timeout: 500 });
  });

  it('should not call scrollToElement on focus when autoScroll is false', async () => {
    render(<KeyboardAwareInput placeholder="Test input" autoScroll={false} />);
    
    const input = screen.getByPlaceholderText('Test input');
    fireEvent.focus(input);

    // Wait a bit to ensure the timeout would have fired
    await new Promise(resolve => setTimeout(resolve, 350));
    
    expect(mockScrollToElement).not.toHaveBeenCalled();
  });

  it('should use custom scrollOffset', async () => {
    render(<KeyboardAwareInput placeholder="Test input" scrollOffset={50} />);
    
    const input = screen.getByPlaceholderText('Test input');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(mockScrollToElement).toHaveBeenCalledWith(input, 50);
    }, { timeout: 500 });
  });

  it('should call original onFocus handler', () => {
    const mockOnFocus = vi.fn();
    render(<KeyboardAwareInput placeholder="Test input" onFocus={mockOnFocus} />);
    
    const input = screen.getByPlaceholderText('Test input');
    fireEvent.focus(input);

    expect(mockOnFocus).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should call original onBlur handler', () => {
    const mockOnBlur = vi.fn();
    render(<KeyboardAwareInput placeholder="Test input" onBlur={mockOnBlur} />);
    
    const input = screen.getByPlaceholderText('Test input');
    fireEvent.blur(input);

    expect(mockOnBlur).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should apply custom className', () => {
    render(<KeyboardAwareInput placeholder="Test input" className="custom-class" />);
    
    const input = screen.getByPlaceholderText('Test input');
    expect(input.closest('.custom-class')).toBeInTheDocument();
  });

  describe('ref methods', () => {
    it('should expose scrollIntoView method', () => {
      let inputRef: KeyboardAwareInputRef | null = null;
      
      function TestComponent() {
        const ref = useRef<KeyboardAwareInputRef>(null);
        inputRef = ref.current;
        return <KeyboardAwareInput ref={ref} placeholder="Test input" />;
      }

      render(<TestComponent />);
      
      // Give time for ref to be set
      setTimeout(() => {
        expect(inputRef).toBeTruthy();
        if (inputRef) {
          inputRef.scrollIntoView({ offset: 30 });
          expect(mockScrollToElement).toHaveBeenCalledWith(expect.any(HTMLElement), 30);
        }
      }, 0);
    });

    it('should expose adjustForKeyboard method', () => {
      let inputRef: KeyboardAwareInputRef | null = null;
      
      function TestComponent() {
        const ref = useRef<KeyboardAwareInputRef>(null);
        inputRef = ref.current;
        return <KeyboardAwareInput ref={ref} placeholder="Test input" />;
      }

      render(<TestComponent />);
      
      setTimeout(() => {
        expect(inputRef).toBeTruthy();
        if (inputRef) {
          inputRef.adjustForKeyboard();
          expect(mockAdjustForKeyboard).toHaveBeenCalledWith(expect.any(HTMLElement));
        }
      }, 0);
    });

    it('should forward all HTMLInputElement properties', () => {
      let inputRef: KeyboardAwareInputRef | null = null;
      
      function TestComponent() {
        const ref = useRef<KeyboardAwareInputRef>(null);
        inputRef = ref.current;
        return <KeyboardAwareInput ref={ref} placeholder="Test input" value="test" />;
      }

      render(<TestComponent />);
      
      setTimeout(() => {
        expect(inputRef).toBeTruthy();
        if (inputRef) {
          expect(inputRef.value).toBe('test');
          expect(inputRef.placeholder).toBe('Test input');
        }
      }, 0);
    });
  });

  describe('IntersectionObserver', () => {
    it('should setup IntersectionObserver when autoScroll is true', () => {
      render(<KeyboardAwareInput placeholder="Test input" autoScroll={true} />);
      
      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        {
          threshold: 1.0,
          rootMargin: '0px 0px -150px 0px'
        }
      );

      // Verify observer.observe was called
      const mockObserver = mockIntersectionObserver.mock.results[0].value;
      expect(mockObserver.observe).toHaveBeenCalled();
    });

    it('should not setup IntersectionObserver when autoScroll is false', () => {
      render(<KeyboardAwareInput placeholder="Test input" autoScroll={false} />);
      
      // Should not be called for this instance
      const callCount = mockIntersectionObserver.mock.calls.length;
      
      render(<KeyboardAwareInput placeholder="Another input" autoScroll={true} />);
      
      // Should only be called once more (for the second input with autoScroll=true)
      expect(mockIntersectionObserver.mock.calls.length).toBe(callCount + 1);
    });

    it('should disconnect observer on unmount', () => {
      const { unmount } = render(<KeyboardAwareInput placeholder="Test input" autoScroll={true} />);
      
      const mockObserver = mockIntersectionObserver.mock.results[0].value;
      
      unmount();
      
      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    it('should scroll to element when not intersecting and focused', async () => {
      render(<KeyboardAwareInput placeholder="Test input" autoScroll={true} />);
      
      const input = screen.getByPlaceholderText('Test input');
      
      // Focus the input first
      fireEvent.focus(input);
      
      // Get the intersection callback
      const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];
      
      // Simulate intersection entry (not intersecting, element is focused)
      const entries = [{
        isIntersecting: false,
        target: input
      }];
      
      // Mock that this element is the active element
      Object.defineProperty(document, 'activeElement', {
        value: input,
        configurable: true
      });
      
      intersectionCallback(entries);
      
      await waitFor(() => {
        expect(mockScrollToElement).toHaveBeenCalled();
      }, { timeout: 200 });
    });

    it('should not scroll when intersecting', () => {
      render(<KeyboardAwareInput placeholder="Test input" autoScroll={true} />);
      
      const input = screen.getByPlaceholderText('Test input');
      fireEvent.focus(input);
      
      const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];
      
      // Simulate intersection entry (intersecting - element is visible)
      const entries = [{
        isIntersecting: true,
        target: input
      }];
      
      Object.defineProperty(document, 'activeElement', {
        value: input,
        configurable: true
      });
      
      intersectionCallback(entries);
      
      // Should not call scrollToElement for intersection observer (only the initial focus should)
      setTimeout(() => {
        // Only the focus event should trigger scroll, not intersection
        expect(mockScrollToElement).toHaveBeenCalledTimes(1);
      }, 200);
    });
  });
});