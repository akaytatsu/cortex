import { renderHook, act } from "@testing-library/react";
import { useSwipeGestures } from "./useSwipeGestures";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock timers
vi.useFakeTimers();

describe("useSwipeGestures", () => {
  let mockElement: HTMLElement;
  let mockOnSwipeLeft: ReturnType<typeof vi.fn>;
  let mockOnSwipeRight: ReturnType<typeof vi.fn>;
  let mockOnSwipeUp: ReturnType<typeof vi.fn>;
  let mockOnSwipeDown: ReturnType<typeof vi.fn>;
  let mockOnLongPress: ReturnType<typeof vi.fn>;
  let mockOnSwipeStart: ReturnType<typeof vi.fn>;
  let mockOnSwipeEnd: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockElement = document.createElement("div");
    mockOnSwipeLeft = vi.fn();
    mockOnSwipeRight = vi.fn();
    mockOnSwipeUp = vi.fn();
    mockOnSwipeDown = vi.fn();
    mockOnLongPress = vi.fn();
    mockOnSwipeStart = vi.fn();
    mockOnSwipeEnd = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
    const event = new TouchEvent(type, {
      touches: touches.map(touch => ({
        clientX: touch.clientX,
        clientY: touch.clientY,
        identifier: 0,
        target: mockElement,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
        pageX: touch.clientX,
        pageY: touch.clientY,
        screenX: touch.clientX,
        screenY: touch.clientY,
      })) as any,
      bubbles: true,
      cancelable: true,
    });
    return event;
  };

  it("should initialize with default options", () => {
    const { result } = renderHook(() => useSwipeGestures());
    
    expect(result.current.attachSwipeListeners).toBeDefined();
    expect(result.current.getSwipeState).toBeDefined();
    expect(result.current.isSwipeActive).toBeDefined();
  });

  it("should attach and detach event listeners", () => {
    const addEventListenerSpy = vi.spyOn(mockElement, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(mockElement, "removeEventListener");

    const { result } = renderHook(() => useSwipeGestures());
    
    const cleanup = result.current.attachSwipeListeners(mockElement);
    
    expect(addEventListenerSpy).toHaveBeenCalledWith("touchstart", expect.any(Function), { passive: false });
    expect(addEventListenerSpy).toHaveBeenCalledWith("touchmove", expect.any(Function), { passive: false });
    expect(addEventListenerSpy).toHaveBeenCalledWith("touchend", expect.any(Function), { passive: true });
    expect(addEventListenerSpy).toHaveBeenCalledWith("mousedown", expect.any(Function), { passive: true });

    cleanup();

    expect(removeEventListenerSpy).toHaveBeenCalledTimes(4);
  });

  it("should detect left swipe", () => {
    const { result } = renderHook(() => 
      useSwipeGestures({
        onSwipeLeft: mockOnSwipeLeft,
        onSwipeStart: mockOnSwipeStart,
        onSwipeEnd: mockOnSwipeEnd,
      })
    );
    
    result.current.attachSwipeListeners(mockElement);

    // Start touch
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
    });

    // Move left beyond threshold and minimum distance
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 40, clientY: 100 }]));
    });

    expect(mockOnSwipeStart).toHaveBeenCalledWith("horizontal");

    // End touch with sufficient distance
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchend", []));
    });

    expect(mockOnSwipeLeft).toHaveBeenCalledWith(60, expect.any(Number));
    expect(mockOnSwipeEnd).toHaveBeenCalled();
  });

  it("should detect right swipe", () => {
    const { result } = renderHook(() => 
      useSwipeGestures({
        onSwipeRight: mockOnSwipeRight,
        onSwipeStart: mockOnSwipeStart,
        onSwipeEnd: mockOnSwipeEnd,
      })
    );
    
    result.current.attachSwipeListeners(mockElement);

    // Start touch
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
    });

    // Move right beyond threshold and minimum distance
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 160, clientY: 100 }]));
    });

    expect(mockOnSwipeStart).toHaveBeenCalledWith("horizontal");

    // End touch
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchend", []));
    });

    expect(mockOnSwipeRight).toHaveBeenCalledWith(60, expect.any(Number));
    expect(mockOnSwipeEnd).toHaveBeenCalled();
  });

  it("should detect up swipe", () => {
    const { result } = renderHook(() => 
      useSwipeGestures({
        onSwipeUp: mockOnSwipeUp,
        onSwipeStart: mockOnSwipeStart,
        onSwipeEnd: mockOnSwipeEnd,
      })
    );
    
    result.current.attachSwipeListeners(mockElement);

    // Start touch
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
    });

    // Move up beyond threshold and minimum distance
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 100, clientY: 40 }]));
    });

    expect(mockOnSwipeStart).toHaveBeenCalledWith("vertical");

    // End touch
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchend", []));
    });

    expect(mockOnSwipeUp).toHaveBeenCalledWith(60, expect.any(Number));
    expect(mockOnSwipeEnd).toHaveBeenCalled();
  });

  it("should detect down swipe", () => {
    const { result } = renderHook(() => 
      useSwipeGestures({
        onSwipeDown: mockOnSwipeDown,
        onSwipeStart: mockOnSwipeStart,
        onSwipeEnd: mockOnSwipeEnd,
      })
    );
    
    result.current.attachSwipeListeners(mockElement);

    // Start touch
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
    });

    // Move down beyond threshold and minimum distance
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 100, clientY: 160 }]));
    });

    expect(mockOnSwipeStart).toHaveBeenCalledWith("vertical");

    // End touch
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchend", []));
    });

    expect(mockOnSwipeDown).toHaveBeenCalledWith(60, expect.any(Number));
    expect(mockOnSwipeEnd).toHaveBeenCalled();
  });

  it("should detect long press", () => {
    const { result } = renderHook(() => 
      useSwipeGestures({
        onLongPress: mockOnLongPress,
        longPressTime: 300,
      })
    );
    
    result.current.attachSwipeListeners(mockElement);

    // Start touch
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
    });

    // Fast forward time for long press
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockOnLongPress).toHaveBeenCalledWith({ x: 100, y: 100 });
  });

  it("should not trigger long press if swiping starts", () => {
    const { result } = renderHook(() => 
      useSwipeGestures({
        onLongPress: mockOnLongPress,
        onSwipeStart: mockOnSwipeStart,
        longPressTime: 300,
      })
    );
    
    result.current.attachSwipeListeners(mockElement);

    // Start touch
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
    });

    // Start swiping before long press time
    act(() => {
      vi.advanceTimersByTime(100);
      mockElement.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 140, clientY: 100 }]));
    });

    expect(mockOnSwipeStart).toHaveBeenCalledWith("horizontal");

    // Complete long press time
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(mockOnLongPress).not.toHaveBeenCalled();
  });

  it("should not trigger swipe if distance is below minimum", () => {
    const { result } = renderHook(() => 
      useSwipeGestures({
        onSwipeLeft: mockOnSwipeLeft,
        minSwipeDistance: 50,
      })
    );
    
    result.current.attachSwipeListeners(mockElement);

    // Start touch
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
    });

    // Move less than minimum distance
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 70, clientY: 100 }]));
      mockElement.dispatchEvent(createTouchEvent("touchend", []));
    });

    expect(mockOnSwipeLeft).not.toHaveBeenCalled();
  });

  it("should not attach listeners when disabled", () => {
    const addEventListenerSpy = vi.spyOn(mockElement, "addEventListener");

    const { result } = renderHook(() => 
      useSwipeGestures({ enabled: false })
    );
    
    result.current.attachSwipeListeners(mockElement);
    
    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it("should return current swipe state", () => {
    const { result } = renderHook(() => useSwipeGestures());
    
    result.current.attachSwipeListeners(mockElement);

    // Initial state
    expect(result.current.getSwipeState()).toEqual({
      isSwipingHorizontal: false,
      isSwipingVertical: false,
      direction: null,
      isLongPress: false,
      deltaX: 0,
      deltaY: 0,
    });

    // Start swiping
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
      mockElement.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 140, clientY: 100 }]));
    });

    const state = result.current.getSwipeState();
    expect(state.isSwipingHorizontal).toBe(true);
    expect(state.direction).toBe("right");
    expect(state.deltaX).toBe(40);
    expect(state.deltaY).toBe(0);
  });

  it("should correctly report if swipe is active", () => {
    const { result } = renderHook(() => useSwipeGestures());
    
    result.current.attachSwipeListeners(mockElement);

    // Initially not active
    expect(result.current.isSwipeActive()).toBe(false);

    // Start swiping
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 100 }]));
      mockElement.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 140, clientY: 100 }]));
    });

    expect(result.current.isSwipeActive()).toBe(true);

    // End swiping
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchend", []));
    });

    expect(result.current.isSwipeActive()).toBe(false);
  });
});