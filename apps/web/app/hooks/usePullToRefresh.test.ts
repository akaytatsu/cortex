import { renderHook, act } from "@testing-library/react";
import { usePullToRefresh } from "./usePullToRefresh";

// Mock timers
jest.useFakeTimers();

describe("usePullToRefresh", () => {
  let mockElement: HTMLElement;
  let mockOnRefresh: jest.Mock;

  beforeEach(() => {
    mockElement = document.createElement("div");
    mockOnRefresh = jest.fn().mockResolvedValue(undefined);
    
    // Mock element scroll properties
    Object.defineProperty(mockElement, "scrollTop", {
      writable: true,
      value: 0,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
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
    const { result } = renderHook(() => 
      usePullToRefresh({ onRefresh: mockOnRefresh })
    );
    
    expect(result.current.attachPullToRefreshListeners).toBeDefined();
    expect(result.current.getPullState).toBeDefined();
    expect(result.current.triggerRefresh).toBeDefined();
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.pullProgress).toBe(0);
  });

  it("should attach and detach event listeners", () => {
    const addEventListenerSpy = jest.spyOn(mockElement, "addEventListener");
    const removeEventListenerSpy = jest.spyOn(mockElement, "removeEventListener");

    const { result } = renderHook(() => 
      usePullToRefresh({ onRefresh: mockOnRefresh })
    );
    
    const cleanup = result.current.attachPullToRefreshListeners(mockElement);
    
    expect(addEventListenerSpy).toHaveBeenCalledWith("touchstart", expect.any(Function), { passive: false });
    expect(addEventListenerSpy).toHaveBeenCalledWith("touchmove", expect.any(Function), { passive: false });
    expect(addEventListenerSpy).toHaveBeenCalledWith("touchend", expect.any(Function), { passive: true });

    cleanup();

    expect(removeEventListenerSpy).toHaveBeenCalledTimes(3);
  });

  it("should detect pull gesture and trigger refresh", async () => {
    const { result } = renderHook(() => 
      usePullToRefresh({ 
        onRefresh: mockOnRefresh,
        triggerDistance: 80,
      })
    );
    
    result.current.attachPullToRefreshListeners(mockElement);

    // Start touch at top
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 50 }]));
    });

    // Move down beyond threshold and trigger distance
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 100, clientY: 150 }]));
    });

    expect(result.current.pullProgress).toBeGreaterThan(0);

    // End touch to trigger refresh
    await act(async () => {
      mockElement.dispatchEvent(createTouchEvent("touchend", []));
      // Wait for refresh to complete
      await jest.runAllTimersAsync();
    });

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it("should not trigger refresh if pull distance is insufficient", () => {
    const { result } = renderHook(() => 
      usePullToRefresh({ 
        onRefresh: mockOnRefresh,
        triggerDistance: 80,
      })
    );
    
    result.current.attachPullToRefreshListeners(mockElement);

    // Start touch at top
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 50 }]));
    });

    // Move down but not enough to trigger
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 100, clientY: 100 }]));
    });

    // End touch
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchend", []));
    });

    expect(mockOnRefresh).not.toHaveBeenCalled();
    expect(result.current.pullProgress).toBe(0);
  });

  it("should not trigger when element is not at top", () => {
    // Set element as scrolled down
    Object.defineProperty(mockElement, "scrollTop", {
      writable: true,
      value: 100,
    });

    const { result } = renderHook(() => 
      usePullToRefresh({ onRefresh: mockOnRefresh })
    );
    
    result.current.attachPullToRefreshListeners(mockElement);

    // Try to pull
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 50 }]));
      mockElement.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 100, clientY: 150 }]));
      mockElement.dispatchEvent(createTouchEvent("touchend", []));
    });

    expect(mockOnRefresh).not.toHaveBeenCalled();
  });

  it("should respect enabled option", () => {
    const addEventListenerSpy = jest.spyOn(mockElement, "addEventListener");

    const { result } = renderHook(() => 
      usePullToRefresh({ 
        onRefresh: mockOnRefresh,
        enabled: false,
      })
    );
    
    result.current.attachPullToRefreshListeners(mockElement);
    
    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it("should allow manual refresh trigger", async () => {
    const { result } = renderHook(() => 
      usePullToRefresh({ onRefresh: mockOnRefresh })
    );

    await act(async () => {
      await result.current.triggerRefresh();
    });

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it("should return correct pull state", () => {
    const { result } = renderHook(() => 
      usePullToRefresh({ 
        onRefresh: mockOnRefresh,
        triggerDistance: 80,
      })
    );
    
    result.current.attachPullToRefreshListeners(mockElement);

    // Initial state
    expect(result.current.getPullState()).toEqual({
      isPulling: false,
      pullDistance: 0,
      isRefreshing: false,
      progress: 0,
      canTrigger: false,
    });

    // Start pulling
    act(() => {
      mockElement.dispatchEvent(createTouchEvent("touchstart", [{ clientX: 100, clientY: 50 }]));
      mockElement.dispatchEvent(createTouchEvent("touchmove", [{ clientX: 100, clientY: 150 }]));
    });

    const state = result.current.getPullState();
    expect(state.isPulling).toBe(true);
    expect(state.pullDistance).toBeGreaterThan(0);
    expect(state.progress).toBeGreaterThan(0);
  });
});