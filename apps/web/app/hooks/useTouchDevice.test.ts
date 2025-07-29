import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTouchDevice, useTouchFriendly, useTouchClasses } from "./useTouchDevice";

// Mock window properties
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  ontouchstart: undefined,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockNavigator = {
  maxTouchPoints: 0,
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

Object.defineProperty(global, "window", {
  value: mockWindow,
  writable: true,
});

Object.defineProperty(global, "navigator", {
  value: mockNavigator,
  writable: true,
});

describe("useTouchDevice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWindow.innerWidth = 1024;
    mockWindow.innerHeight = 768;
    mockWindow.ontouchstart = undefined;
    mockNavigator.maxTouchPoints = 0;
    mockNavigator.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should detect non-touch desktop device", () => {
    const { result } = renderHook(() => useTouchDevice());
    
    expect(result.current.isTouchDevice).toBe(false);
    expect(result.current.touchSupported).toBe(false);
    expect(result.current.preferTouch).toBe(false);
  });

  it("should detect touch support via ontouchstart", () => {
    mockWindow.ontouchstart = null;
    
    const { result } = renderHook(() => useTouchDevice());
    
    expect(result.current.touchSupported).toBe(true);
  });

  it("should detect touch support via maxTouchPoints", () => {
    mockNavigator.maxTouchPoints = 1;
    
    const { result } = renderHook(() => useTouchDevice());
    
    expect(result.current.touchSupported).toBe(true);
  });

  it("should detect mobile device from user agent", () => {
    mockWindow.ontouchstart = null;
    mockNavigator.userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)";
    
    const { result } = renderHook(() => useTouchDevice());
    
    expect(result.current.isTouchDevice).toBe(true);
    expect(result.current.touchSupported).toBe(true);
  });

  it("should detect mobile viewport with touch support", () => {
    mockWindow.ontouchstart = null;
    mockWindow.innerWidth = 375; // Mobile viewport
    
    const { result } = renderHook(() => useTouchDevice());
    
    expect(result.current.isTouchDevice).toBe(true);
    expect(result.current.preferTouch).toBe(true);
  });

  it("should not detect touch device for large viewport without mobile UA", () => {
    mockWindow.ontouchstart = null;
    mockWindow.innerWidth = 1024; // Desktop viewport
    
    const { result } = renderHook(() => useTouchDevice());
    
    expect(result.current.isTouchDevice).toBe(false);
    expect(result.current.preferTouch).toBe(false);
  });

  it("should add event listeners for resize and orientation change", () => {
    renderHook(() => useTouchDevice());
    
    expect(mockWindow.addEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(mockWindow.addEventListener).toHaveBeenCalledWith("orientationchange", expect.any(Function));
  });

  it("should remove event listeners on unmount", () => {
    const { unmount } = renderHook(() => useTouchDevice());
    
    unmount();
    
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith("orientationchange", expect.any(Function));
  });
});

describe("useTouchFriendly", () => {
  beforeEach(() => {
    mockWindow.innerWidth = 1024;
    mockWindow.ontouchstart = undefined;
    mockNavigator.maxTouchPoints = 0;
  });

  it("should return false for desktop", () => {
    const { result } = renderHook(() => useTouchFriendly());
    
    expect(result.current).toBe(false);
  });

  it("should return true for mobile with touch", () => {
    mockWindow.ontouchstart = null;
    mockWindow.innerWidth = 375;
    
    const { result } = renderHook(() => useTouchFriendly());
    
    expect(result.current).toBe(true);
  });
});

describe("useTouchClasses", () => {
  beforeEach(() => {
    mockWindow.innerWidth = 1024;
    mockWindow.ontouchstart = undefined;
    mockNavigator.maxTouchPoints = 0;
  });

  it("should return empty strings for non-touch device", () => {
    const { result } = renderHook(() => useTouchClasses());
    
    expect(result.current.button()).toBe("");
    expect(result.current.input()).toBe("");
    expect(result.current.clickable).toBe("touch-target");
  });

  it("should return touch classes for touch device", () => {
    mockWindow.ontouchstart = null;
    mockWindow.innerWidth = 375;
    
    const { result } = renderHook(() => useTouchClasses());
    
    expect(result.current.button("sm")).toBe("min-h-[44px] min-w-[44px] touch-target");
    expect(result.current.button("md")).toBe("min-h-[44px] min-w-[44px] touch-target");
    expect(result.current.button("lg")).toBe("min-h-[48px] min-w-[48px] touch-target");
    
    expect(result.current.input("sm")).toBe("min-h-[44px] touch-target");
    expect(result.current.input("md")).toBe("min-h-[44px] touch-target");
    expect(result.current.input("lg")).toBe("min-h-[48px] touch-target");
    
    expect(result.current.clickable).toBe("touch-target");
    expect(result.current.menuItem).toBe("mobile-menu-item touch-target");
  });
});