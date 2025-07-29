import { useState, useCallback, useRef, useEffect } from "react";
import { useSwipeGestures } from "./useSwipeGestures";

interface ContextMenuState {
  visible: boolean;
  position: { x: number; y: number };
}

interface UseContextMenuOptions {
  enabled?: boolean;
  longPressTime?: number;
}

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export function useContextMenu({
  enabled = true,
  longPressTime = 500,
}: UseContextMenuOptions = {}) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    position: { x: 0, y: 0 },
  });

  const contextMenuItemsRef = useRef<ContextMenuItem[]>([]);

  // Show context menu at position
  const showContextMenu = useCallback((x: number, y: number, items: ContextMenuItem[]) => {
    if (!enabled || items.length === 0) return;
    
    contextMenuItemsRef.current = items;
    setContextMenu({
      visible: true,
      position: { x, y },
    });
  }, [enabled]);

  // Hide context menu
  const hideContextMenu = useCallback(() => {
    setContextMenu({
      visible: false,
      position: { x: 0, y: 0 },
    });
    contextMenuItemsRef.current = [];
  }, []);

  // Long press handler
  const handleLongPress = useCallback((position: { x: number; y: number }, items: ContextMenuItem[]) => {
    if (enabled && items.length > 0) {
      // Add haptic feedback on supported devices
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      showContextMenu(position.x, position.y, items);
    }
  }, [enabled, showContextMenu]);

  // Use swipe gestures hook for long press detection
  const { attachSwipeListeners } = useSwipeGestures({
    onLongPress: (position) => {
      handleLongPress(position, contextMenuItemsRef.current);
    },
    longPressTime,
    enabled,
  });

  // Attach context menu listeners with items
  const attachContextMenuListeners = useCallback((
    element: HTMLElement,
    items: ContextMenuItem[]
  ) => {
    if (!enabled) return () => {};

    // Store items for long press callback
    contextMenuItemsRef.current = items;

    // Right-click context menu for desktop
    const handleRightClick = (e: MouseEvent) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, items);
    };

    element.addEventListener("contextmenu", handleRightClick);
    
    // Attach swipe listeners for touch devices (long press)
    const cleanupSwipe = attachSwipeListeners(element);

    return () => {
      element.removeEventListener("contextmenu", handleRightClick);
      cleanupSwipe();
    };
  }, [enabled, showContextMenu, attachSwipeListeners]);

  // Close context menu on route change or escape
  useEffect(() => {
    const handleRouteChange = () => {
      hideContextMenu();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        hideContextMenu();
      }
    };

    window.addEventListener("popstate", handleRouteChange);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [hideContextMenu]);

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
    attachContextMenuListeners,
    contextMenuItems: contextMenuItemsRef.current,
  };
}