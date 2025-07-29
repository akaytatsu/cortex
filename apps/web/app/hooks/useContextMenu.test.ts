import { renderHook, act } from "@testing-library/react";
import { useContextMenu } from "./useContextMenu";

// Mock useSwipeGestures
jest.mock("./useSwipeGestures", () => ({
  useSwipeGestures: jest.fn(() => ({
    attachSwipeListeners: jest.fn(() => jest.fn()),
  })),
}));

describe("useContextMenu", () => {
  let mockElement: HTMLElement;
  let mockItems: any[];

  beforeEach(() => {
    mockElement = document.createElement("div");
    mockItems = [
      {
        id: "copy",
        label: "Copy",
        onClick: jest.fn(),
      },
      {
        id: "delete",
        label: "Delete",
        onClick: jest.fn(),
        destructive: true,
      },
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with hidden context menu", () => {
    const { result } = renderHook(() => useContextMenu());
    
    expect(result.current.contextMenu.visible).toBe(false);
    expect(result.current.contextMenu.position).toEqual({ x: 0, y: 0 });
  });

  it("should show context menu at specified position", () => {
    const { result } = renderHook(() => useContextMenu());
    
    act(() => {
      result.current.showContextMenu(100, 200, mockItems);
    });

    expect(result.current.contextMenu.visible).toBe(true);
    expect(result.current.contextMenu.position).toEqual({ x: 100, y: 200 });
  });

  it("should hide context menu", () => {
    const { result } = renderHook(() => useContextMenu());
    
    // Show first
    act(() => {
      result.current.showContextMenu(100, 200, mockItems);
    });

    expect(result.current.contextMenu.visible).toBe(true);

    // Then hide
    act(() => {
      result.current.hideContextMenu();
    });

    expect(result.current.contextMenu.visible).toBe(false);
  });

  it("should not show context menu when disabled", () => {
    const { result } = renderHook(() => useContextMenu({ enabled: false }));
    
    act(() => {
      result.current.showContextMenu(100, 200, mockItems);
    });

    expect(result.current.contextMenu.visible).toBe(false);
  });

  it("should not show context menu with empty items", () => {
    const { result } = renderHook(() => useContextMenu());
    
    act(() => {
      result.current.showContextMenu(100, 200, []);
    });

    expect(result.current.contextMenu.visible).toBe(false);
  });

  it("should attach context menu listeners", () => {
    const addEventListenerSpy = jest.spyOn(mockElement, "addEventListener");
    const { result } = renderHook(() => useContextMenu());
    
    const cleanup = result.current.attachContextMenuListeners(mockElement, mockItems);
    
    expect(addEventListenerSpy).toHaveBeenCalledWith("contextmenu", expect.any(Function));
    
    cleanup();
  });

  it("should handle right-click context menu", () => {
    const { result } = renderHook(() => useContextMenu());
    
    result.current.attachContextMenuListeners(mockElement, mockItems);

    const rightClickEvent = new MouseEvent("contextmenu", {
      clientX: 150,
      clientY: 250,
      bubbles: true,
      cancelable: true,
    });

    // Prevent default should be called
    const preventDefaultSpy = jest.spyOn(rightClickEvent, "preventDefault");

    act(() => {
      mockElement.dispatchEvent(rightClickEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(result.current.contextMenu.visible).toBe(true);
    expect(result.current.contextMenu.position).toEqual({ x: 150, y: 250 });
  });

  it("should handle escape key to close context menu", () => {
    const { result } = renderHook(() => useContextMenu());
    
    // Show context menu first
    act(() => {
      result.current.showContextMenu(100, 200, mockItems);
    });

    expect(result.current.contextMenu.visible).toBe(true);

    // Press escape
    act(() => {
      const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
      document.dispatchEvent(escapeEvent);
    });

    expect(result.current.contextMenu.visible).toBe(false);
  });

  it("should handle popstate event to close context menu", () => {
    const { result } = renderHook(() => useContextMenu());
    
    // Show context menu first
    act(() => {
      result.current.showContextMenu(100, 200, mockItems);
    });

    expect(result.current.contextMenu.visible).toBe(true);

    // Trigger popstate (route change)
    act(() => {
      const popStateEvent = new PopStateEvent("popstate");
      window.dispatchEvent(popStateEvent);
    });

    expect(result.current.contextMenu.visible).toBe(false);
  });

  it("should return correct context menu items", () => {
    const { result } = renderHook(() => useContextMenu());
    
    act(() => {
      result.current.showContextMenu(100, 200, mockItems);
    });

    expect(result.current.contextMenuItems).toEqual(mockItems);
  });

  it("should not attach listeners when disabled", () => {
    const addEventListenerSpy = jest.spyOn(mockElement, "addEventListener");
    const { result } = renderHook(() => useContextMenu({ enabled: false }));
    
    result.current.attachContextMenuListeners(mockElement, mockItems);
    
    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });
});