import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useSwipeGestures } from './useSwipeGestures';
import { usePullToRefresh } from './usePullToRefresh';
import { useContextMenu } from './useContextMenu';
import { useEditorGestures } from './useEditorGestures';

// Mock vibration API
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn(),
});

// Mock touch events
const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number; identifier: number }>) => {
  const touchList = {
    length: touches.length,
    item: (index: number) => touches[index] || null,
    ...touches.reduce((acc, touch, index) => ({ ...acc, [index]: touch }), {}),
  };

  return new TouchEvent(type, {
    touches: touchList as any,
    targetTouches: touchList as any,
    changedTouches: touchList as any,
    bubbles: true,
    cancelable: true,
  });
};

describe('Touch Gestures Testing', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.removeChild(mockElement);
  });

  describe('useSwipeGestures Hook', () => {
    it('should detect horizontal swipe left', async () => {
      const onSwipeLeft = vi.fn();
      const onSwipeRight = vi.fn();
      
      const { result } = renderHook(() => useSwipeGestures(mockElement, {
        onSwipeLeft,
        onSwipeRight,
        threshold: 50,
      }));

      // Simulate swipe left gesture
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100, identifier: 0 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 40, clientY: 100, identifier: 0 }]);

      act(() => {
        fireEvent(mockElement, touchStart);
      });

      act(() => {
        fireEvent(mockElement, touchEnd);
      });

      expect(onSwipeLeft).toHaveBeenCalledWith({ deltaX: -60, deltaY: 0, duration: expect.any(Number) });
      expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it('should detect horizontal swipe right', async () => {
      const onSwipeLeft = vi.fn();
      const onSwipeRight = vi.fn();
      
      renderHook(() => useSwipeGestures(mockElement, {
        onSwipeLeft,
        onSwipeRight,
        threshold: 50,
      }));

      // Simulate swipe right gesture
      const touchStart = createTouchEvent('touchstart', [{ clientX: 40, clientY: 100, identifier: 0 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 100, identifier: 0 }]);

      act(() => {
        fireEvent(mockElement, touchStart);
      });

      act(() => {
        fireEvent(mockElement, touchEnd);
      });

      expect(onSwipeRight).toHaveBeenCalledWith({ deltaX: 60, deltaY: 0, duration: expect.any(Number) });
      expect(onSwipeLeft).not.toHaveBeenCalled();
    });

    it('should detect vertical swipe up', async () => {
      const onSwipeUp = vi.fn();
      const onSwipeDown = vi.fn();
      
      renderHook(() => useSwipeGestures(mockElement, {
        onSwipeUp,
        onSwipeDown,
        threshold: 50,
      }));

      // Simulate swipe up gesture
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100, identifier: 0 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 40, identifier: 0 }]);

      act(() => {
        fireEvent(mockElement, touchStart);
      });

      act(() => {
        fireEvent(mockElement, touchEnd);
      });

      expect(onSwipeUp).toHaveBeenCalledWith({ deltaX: 0, deltaY: -60, duration: expect.any(Number) });
      expect(onSwipeDown).not.toHaveBeenCalled();
    });

    it('should detect vertical swipe down', async () => {
      const onSwipeUp = vi.fn();
      const onSwipeDown = vi.fn();
      
      renderHook(() => useSwipeGestures(mockElement, {
        onSwipeUp,
        onSwipeDown,
        threshold: 50,
      }));

      // Simulate swipe down gesture
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 40, identifier: 0 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 100, identifier: 0 }]);

      act(() => {
        fireEvent(mockElement, touchStart);
      });

      act(() => {
        fireEvent(mockElement, touchEnd);
      });

      expect(onSwipeDown).toHaveBeenCalledWith({ deltaX: 0, deltaY: 60, duration: expect.any(Number) });
      expect(onSwipeUp).not.toHaveBeenCalled();
    });

    it('should detect long press gesture', async () => {
      const onLongPress = vi.fn();
      
      renderHook(() => useSwipeGestures(mockElement, {
        onLongPress,
        longPressThreshold: 500,
      }));

      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100, identifier: 0 }]);

      act(() => {
        fireEvent(mockElement, touchStart);
      });

      // Wait for long press threshold
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      expect(onLongPress).toHaveBeenCalledWith({ x: 100, y: 100 });
    });

    it('should not trigger swipe when below threshold', async () => {
      const onSwipeLeft = vi.fn();
      
      renderHook(() => useSwipeGestures(mockElement, {
        onSwipeLeft,
        threshold: 50,
      }));

      // Simulate small movement (below threshold)
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100, identifier: 0 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 80, clientY: 100, identifier: 0 }]);

      act(() => {
        fireEvent(mockElement, touchStart);
      });

      act(() => {
        fireEvent(mockElement, touchEnd);
      });

      expect(onSwipeLeft).not.toHaveBeenCalled();
    });

    it('should trigger haptic feedback when available', async () => {
      const onSwipeLeft = vi.fn();
      
      renderHook(() => useSwipeGestures(mockElement, {
        onSwipeLeft,
        hapticFeedback: true,
        threshold: 50,
      }));

      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100, identifier: 0 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 40, clientY: 100, identifier: 0 }]);

      act(() => {
        fireEvent(mockElement, touchStart);
      });

      act(() => {
        fireEvent(mockElement, touchEnd);
      });

      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });
  });

  describe('usePullToRefresh Hook', () => {
    it('should trigger refresh when pull threshold is exceeded', async () => {
      const onRefresh = vi.fn(() => Promise.resolve());
      
      const { result } = renderHook(() => usePullToRefresh(mockElement, {
        onRefresh,
        threshold: 80,
      }));

      // Simulate pull to refresh gesture
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 50, identifier: 0 }]);
      const touchMove = createTouchEvent('touchmove', [{ clientX: 100, clientY: 150, identifier: 0 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 150, identifier: 0 }]);

      act(() => {
        fireEvent(mockElement, touchStart);
      });

      act(() => {
        fireEvent(mockElement, touchMove);
      });

      expect(result.current.pullDistance).toBe(100);
      expect(result.current.isTriggered).toBe(true);

      act(() => {
        fireEvent(mockElement, touchEnd);
      });

      expect(onRefresh).toHaveBeenCalled();
      expect(result.current.isRefreshing).toBe(true);
    });

    it('should not trigger refresh when pull is below threshold', async () => {
      const onRefresh = vi.fn(() => Promise.resolve());
      
      const { result } = renderHook(() => usePullToRefresh(mockElement, {
        onRefresh,
        threshold: 80,
      }));

      // Simulate small pull (below threshold)
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 50, identifier: 0 }]);
      const touchMove = createTouchEvent('touchmove', [{ clientX: 100, clientY: 100, identifier: 0 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 100, identifier: 0 }]);

      act(() => {
        fireEvent(mockElement, touchStart);
      });

      act(() => {
        fireEvent(mockElement, touchMove);
      });

      expect(result.current.pullDistance).toBe(50);
      expect(result.current.isTriggered).toBe(false);

      act(() => {
        fireEvent(mockElement, touchEnd);
      });

      expect(onRefresh).not.toHaveBeenCalled();
    });

    it('should reset state after refresh completes', async () => {
      const onRefresh = vi.fn(() => Promise.resolve());
      
      const { result } = renderHook(() => usePullToRefresh(mockElement, {
        onRefresh,
        threshold: 80,
      }));

      // Trigger refresh
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 50, identifier: 0 }]);
      const touchMove = createTouchEvent('touchmove', [{ clientX: 100, clientY: 150, identifier: 0 }]);
      const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 150, identifier: 0 }]);

      act(() => {
        fireEvent(mockElement, touchStart);
        fireEvent(mockElement, touchMove);
        fireEvent(mockElement, touchEnd);
      });

      expect(result.current.isRefreshing).toBe(true);

      // Wait for refresh to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.pullDistance).toBe(0);
      expect(result.current.isTriggered).toBe(false);
    });
  });

  describe('useContextMenu Hook', () => {
    it('should show context menu on long press', async () => {
      const menuItems = [
        { label: 'Copy', action: vi.fn() },
        { label: 'Paste', action: vi.fn() },
      ];
      
      const { result } = renderHook(() => useContextMenu(mockElement, menuItems));

      // Simulate long press
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100, identifier: 0 }]);

      act(() => {
        fireEvent(mockElement, touchStart);
      });

      // Wait for long press threshold
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      expect(result.current.isVisible).toBe(true);
      expect(result.current.position).toEqual({ x: 100, y: 100 });
    });

    it('should hide context menu when clicking outside', async () => {
      const menuItems = [{ label: 'Copy', action: vi.fn() }];
      
      const { result } = renderHook(() => useContextMenu(mockElement, menuItems));

      // Show context menu first
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100, identifier: 0 }]);
      
      act(() => {
        fireEvent(mockElement, touchStart);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      expect(result.current.isVisible).toBe(true);

      // Click outside
      act(() => {
        fireEvent(document, new MouseEvent('click', { bubbles: true }));
      });

      expect(result.current.isVisible).toBe(false);
    });

    it('should execute menu item action when clicked', async () => {
      const copyAction = vi.fn();
      const menuItems = [{ label: 'Copy', action: copyAction }];
      
      const { result } = renderHook(() => useContextMenu(mockElement, menuItems));

      // Show context menu
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100, identifier: 0 }]);
      
      act(() => {
        fireEvent(mockElement, touchStart);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      // Execute action
      act(() => {
        result.current.executeAction(0);
      });

      expect(copyAction).toHaveBeenCalled();
      expect(result.current.isVisible).toBe(false);
    });
  });

  describe('useEditorGestures Hook', () => {
    it('should handle pinch-to-zoom gesture', async () => {
      const onZoom = vi.fn();
      
      renderHook(() => useEditorGestures(mockElement, {
        onZoom,
        enableZoom: true,
      }));

      // Simulate pinch gesture (two fingers)
      const touchStart = createTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 0 },
        { clientX: 120, clientY: 100, identifier: 1 },
      ]);

      const touchMove = createTouchEvent('touchmove', [
        { clientX: 90, clientY: 100, identifier: 0 },
        { clientX: 130, clientY: 100, identifier: 1 },
      ]);

      act(() => {
        fireEvent(mockElement, touchStart);
      });

      act(() => {
        fireEvent(mockElement, touchMove);
      });

      expect(onZoom).toHaveBeenCalledWith(expect.objectContaining({
        scale: expect.any(Number),
        centerX: expect.any(Number),
        centerY: expect.any(Number),
      }));
    });

    it('should handle pan gesture', async () => {
      const onPan = vi.fn();
      
      renderHook(() => useEditorGestures(mockElement, {
        onPan,
        enablePan: true,
      }));

      // Simulate pan gesture
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100, identifier: 0 }]);
      const touchMove = createTouchEvent('touchmove', [{ clientX: 150, clientY: 120, identifier: 0 }]);

      act(() => {
        fireEvent(mockElement, touchStart);
      });

      act(() => {
        fireEvent(mockElement, touchMove);
      });

      expect(onPan).toHaveBeenCalledWith(expect.objectContaining({
        deltaX: 50,
        deltaY: 20,
      }));
    });

    it('should prevent zooming when disabled', async () => {
      const onZoom = vi.fn();
      
      renderHook(() => useEditorGestures(mockElement, {
        onZoom,
        enableZoom: false,
      }));

      // Simulate pinch gesture
      const touchStart = createTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 0 },
        { clientX: 120, clientY: 100, identifier: 1 },
      ]);

      const touchMove = createTouchEvent('touchmove', [
        { clientX: 90, clientY: 100, identifier: 0 },
        { clientX: 130, clientY: 100, identifier: 1 },
      ]);

      act(() => {
        fireEvent(mockElement, touchStart);
        fireEvent(mockElement, touchMove);
      });

      expect(onZoom).not.toHaveBeenCalled();
    });

    it('should handle double tap gesture', async () => {
      const onDoubleTap = vi.fn();
      
      renderHook(() => useEditorGestures(mockElement, {
        onDoubleTap,
      }));

      const touch = { clientX: 100, clientY: 100, identifier: 0 };

      // First tap
      act(() => {
        fireEvent(mockElement, createTouchEvent('touchstart', [touch]));
        fireEvent(mockElement, createTouchEvent('touchend', [touch]));
      });

      // Second tap (within double tap threshold)
      act(() => {
        fireEvent(mockElement, createTouchEvent('touchstart', [touch]));
        fireEvent(mockElement, createTouchEvent('touchend', [touch]));
      });

      expect(onDoubleTap).toHaveBeenCalledWith({ x: 100, y: 100 });
    });
  });

  describe('Multi-touch Gesture Combinations', () => {
    it('should handle simultaneous gestures correctly', async () => {
      const onSwipe = vi.fn();
      const onLongPress = vi.fn();
      
      renderHook(() => useSwipeGestures(mockElement, {
        onSwipeLeft: onSwipe,
        onLongPress,
        threshold: 50,
        longPressThreshold: 500,
      }));

      // Start touch
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100, identifier: 0 }]);
      
      act(() => {
        fireEvent(mockElement, touchStart);
      });

      // Move quickly (should trigger swipe, not long press)
      const touchEnd = createTouchEvent('touchend', [{ clientX: 40, clientY: 100, identifier: 0 }]);
      
      act(() => {
        fireEvent(mockElement, touchEnd);
      });

      expect(onSwipe).toHaveBeenCalled();
      
      // Wait to ensure long press doesn't fire
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });
      
      expect(onLongPress).not.toHaveBeenCalled();
    });

    it('should cancel gestures when interrupted', async () => {
      const onSwipe = vi.fn();
      const onLongPress = vi.fn();
      
      renderHook(() => useSwipeGestures(mockElement, {
        onSwipeLeft: onSwipe,
        onLongPress,
        threshold: 50,
        longPressThreshold: 500,
      }));

      // Start touch
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100, identifier: 0 }]);
      
      act(() => {
        fireEvent(mockElement, touchStart);
      });

      // Cancel with touchcancel
      const touchCancel = new TouchEvent('touchcancel', {
        bubbles: true,
        cancelable: true,
      });
      
      act(() => {
        fireEvent(mockElement, touchCancel);
      });

      // Wait to ensure no gestures fire
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      expect(onSwipe).not.toHaveBeenCalled();
      expect(onLongPress).not.toHaveBeenCalled();
    });
  });
});