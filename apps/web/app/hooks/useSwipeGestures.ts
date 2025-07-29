import { useCallback, useRef, useEffect } from "react";

interface SwipeState {
  isSwipingHorizontal: boolean;
  isSwipingVertical: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  isLongPress: boolean;
}

interface UseSwipeGesturesOptions {
  onSwipeLeft?: (distance: number, velocity: number) => void;
  onSwipeRight?: (distance: number, velocity: number) => void;
  onSwipeUp?: (distance: number, velocity: number) => void;
  onSwipeDown?: (distance: number, velocity: number) => void;
  onLongPress?: (position: { x: number; y: number }) => void;
  onSwipeStart?: (direction: 'horizontal' | 'vertical') => void;
  onSwipeEnd?: () => void;
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  longPressTime?: number;
  swipeThreshold?: number;
  enabled?: boolean;
  preventDefault?: boolean;
}

export function useSwipeGestures({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onLongPress,
  onSwipeStart,
  onSwipeEnd,
  minSwipeDistance = 50,
  maxSwipeTime = 1000,
  longPressTime = 500,
  swipeThreshold = 30,
  enabled = true,
  preventDefault = true,
}: UseSwipeGesturesOptions = {}) {
  const swipeStateRef = useRef<SwipeState>({
    isSwipingHorizontal: false,
    isSwipingVertical: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    direction: null,
    isLongPress: false,
  });

  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    const state = swipeStateRef.current;
    
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.currentX = touch.clientX;
    state.currentY = touch.clientY;
    state.startTime = Date.now();
    state.direction = null;
    state.isSwipingHorizontal = false;
    state.isSwipingVertical = false;
    state.isLongPress = false;

    // Start long press timer
    longPressTimeoutRef.current = setTimeout(() => {
      if (!state.isSwipingHorizontal && !state.isSwipingVertical) {
        state.isLongPress = true;
        onLongPress?.({ x: state.startX, y: state.startY });
      }
    }, longPressTime);

  }, [enabled, onLongPress, longPressTime]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    const state = swipeStateRef.current;
    
    state.currentX = touch.clientX;
    state.currentY = touch.clientY;
    
    const deltaX = state.currentX - state.startX;
    const deltaY = state.currentY - state.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine swipe direction and threshold
    if (!state.isSwipingHorizontal && !state.isSwipingVertical) {
      if (absDeltaX > swipeThreshold || absDeltaY > swipeThreshold) {
        // Clear long press timeout once we start swiping
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
        }

        if (absDeltaX > absDeltaY) {
          // Horizontal swipe
          state.isSwipingHorizontal = true;
          state.direction = deltaX > 0 ? 'right' : 'left';
          onSwipeStart?.('horizontal');
        } else {
          // Vertical swipe
          state.isSwipingVertical = true;
          state.direction = deltaY > 0 ? 'down' : 'up';
          onSwipeStart?.('vertical');
        }

        if (preventDefault) {
          e.preventDefault();
        }
      }
    } else if (preventDefault && (state.isSwipingHorizontal || state.isSwipingVertical)) {
      e.preventDefault();
    }

  }, [enabled, swipeThreshold, onSwipeStart, preventDefault]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    const state = swipeStateRef.current;
    
    // Clear long press timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    // If it was a long press, don't process as swipe
    if (state.isLongPress) {
      state.isSwipingHorizontal = false;
      state.isSwipingVertical = false;
      return;
    }

    const deltaX = state.currentX - state.startX;
    const deltaY = state.currentY - state.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const swipeTime = Date.now() - state.startTime;
    const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / swipeTime;

    // Check if it's a valid swipe
    const isValidSwipe = swipeTime <= maxSwipeTime && 
                        (absDeltaX >= minSwipeDistance || absDeltaY >= minSwipeDistance);

    if (isValidSwipe) {
      if (state.isSwipingHorizontal) {
        if (state.direction === 'left' && onSwipeLeft) {
          onSwipeLeft(absDeltaX, velocity);
        } else if (state.direction === 'right' && onSwipeRight) {
          onSwipeRight(absDeltaX, velocity);
        }
      } else if (state.isSwipingVertical) {
        if (state.direction === 'up' && onSwipeUp) {
          onSwipeUp(absDeltaY, velocity);
        } else if (state.direction === 'down' && onSwipeDown) {
          onSwipeDown(absDeltaY, velocity);
        }
      }
    }

    // Notify swipe end
    if (state.isSwipingHorizontal || state.isSwipingVertical) {
      onSwipeEnd?.();
    }

    // Reset state
    state.isSwipingHorizontal = false;
    state.isSwipingVertical = false;
    state.direction = null;
    state.isLongPress = false;

  }, [
    enabled,
    maxSwipeTime,
    minSwipeDistance,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeEnd,
  ]);

  // Handle mouse events for desktop testing
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!enabled) return;

    const state = swipeStateRef.current;
    
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.currentX = e.clientX;
    state.currentY = e.clientY;
    state.startTime = Date.now();
    state.direction = null;
    state.isSwipingHorizontal = false;
    state.isSwipingVertical = false;
    state.isLongPress = false;

    // Start long press timer
    longPressTimeoutRef.current = setTimeout(() => {
      if (!state.isSwipingHorizontal && !state.isSwipingVertical) {
        state.isLongPress = true;
        onLongPress?.({ x: state.startX, y: state.startY });
      }
    }, longPressTime);

  }, [enabled, onLongPress, longPressTime]);

  // Attach event listeners to element
  const attachSwipeListeners = useCallback((element: HTMLElement) => {
    if (!enabled) return () => {};

    element.addEventListener("touchstart", handleTouchStart, { passive: !preventDefault });
    element.addEventListener("touchmove", handleTouchMove, { passive: !preventDefault });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });
    
    // Mouse events for desktop testing
    element.addEventListener("mousedown", handleMouseDown, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("mousedown", handleMouseDown);
      
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, preventDefault]);

  // Get current swipe state
  const getSwipeState = useCallback(() => {
    const state = swipeStateRef.current;
    return {
      isSwipingHorizontal: state.isSwipingHorizontal,
      isSwipingVertical: state.isSwipingVertical,
      direction: state.direction,
      isLongPress: state.isLongPress,
      deltaX: state.currentX - state.startX,
      deltaY: state.currentY - state.startY,
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  return {
    attachSwipeListeners,
    getSwipeState,
    isSwipeActive: () => swipeStateRef.current.isSwipingHorizontal || swipeStateRef.current.isSwipingVertical,
  };
}