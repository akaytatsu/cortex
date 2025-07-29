import { useCallback, useRef, useEffect } from "react";

interface GestureState {
  isZooming: boolean;
  isPanning: boolean;
  startDistance: number;
  startZoom: number;
  lastCenter: { x: number; y: number };
  panOffset: { x: number; y: number };
}

interface UseEditorGesturesOptions {
  onZoomChange: (zoom: number) => void;
  onPanChange?: (offset: { x: number; y: number }) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
  minZoom?: number;
  maxZoom?: number;
  enablePan?: boolean;
  enableZoom?: boolean;
  zoomSensitivity?: number;
  panSensitivity?: number;
}

export function useEditorGestures({
  onZoomChange,
  onPanChange,
  onGestureStart,
  onGestureEnd,
  minZoom = 0.5,
  maxZoom = 3,
  enablePan = true,
  enableZoom = true,
  zoomSensitivity = 0.01,
  panSensitivity = 1,
}: UseEditorGesturesOptions) {
  const gestureStateRef = useRef<GestureState>({
    isZooming: false,
    isPanning: false,
    startDistance: 0,
    startZoom: 1,
    lastCenter: { x: 0, y: 0 },
    panOffset: { x: 0, y: 0 },
  });

  const currentZoomRef = useRef(1);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate distance between two touches
  const getTouchDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate center point between two touches
  const getTouchCenter = useCallback((touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touches = e.touches;
    const state = gestureStateRef.current;

    if (touches.length === 1) {
      // Single touch - potential pan start
      if (enablePan) {
        state.lastCenter = { x: touches[0].clientX, y: touches[0].clientY };
        
        // Delay to distinguish between tap and pan
        touchTimeoutRef.current = setTimeout(() => {
          state.isPanning = true;
          onGestureStart?.();
        }, 100);
      }
    } else if (touches.length === 2) {
      // Two touches - zoom start
      if (enableZoom) {
        e.preventDefault();
        
        // Clear any pending pan
        if (touchTimeoutRef.current) {
          clearTimeout(touchTimeoutRef.current);
          touchTimeoutRef.current = null;
        }
        
        state.isPanning = false;
        state.isZooming = true;
        state.startDistance = getTouchDistance(touches[0], touches[1]);
        state.startZoom = currentZoomRef.current;
        state.lastCenter = getTouchCenter(touches[0], touches[1]);
        
        onGestureStart?.();
      }
    }
  }, [enablePan, enableZoom, getTouchDistance, getTouchCenter, onGestureStart]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touches = e.touches;
    const state = gestureStateRef.current;

    if (touches.length === 1 && state.isPanning && enablePan) {
      // Single touch pan
      e.preventDefault();
      
      const current = { x: touches[0].clientX, y: touches[0].clientY };
      const deltaX = (current.x - state.lastCenter.x) * panSensitivity;
      const deltaY = (current.y - state.lastCenter.y) * panSensitivity;
      
      state.panOffset.x += deltaX;
      state.panOffset.y += deltaY;
      state.lastCenter = current;
      
      onPanChange?.(state.panOffset);
    } else if (touches.length === 2 && state.isZooming && enableZoom) {
      // Two touch zoom
      e.preventDefault();
      
      const currentDistance = getTouchDistance(touches[0], touches[1]);
      const scale = currentDistance / state.startDistance;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, state.startZoom * scale));
      
      if (newZoom !== currentZoomRef.current) {
        currentZoomRef.current = newZoom;
        onZoomChange(newZoom);
      }
      
      // Update center for potential pan during zoom
      state.lastCenter = getTouchCenter(touches[0], touches[1]);
    }
  }, [
    enablePan,
    enableZoom,
    getTouchDistance,
    getTouchCenter,
    onZoomChange,
    onPanChange,
    minZoom,
    maxZoom,
    panSensitivity,
  ]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const state = gestureStateRef.current;
    
    // Clear any pending pan
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
    
    if (state.isZooming || state.isPanning) {
      onGestureEnd?.();
    }
    
    if (e.touches.length === 0) {
      // All touches ended
      state.isZooming = false;
      state.isPanning = false;
    } else if (e.touches.length === 1 && state.isZooming) {
      // Transition from zoom to potential pan
      state.isZooming = false;
      if (enablePan) {
        state.lastCenter = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        state.isPanning = true;
      }
    }
  }, [enablePan, onGestureEnd]);

  // Handle wheel zoom (for devices with wheel)
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!enableZoom) return;
    
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      
      const delta = -e.deltaY * zoomSensitivity;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoomRef.current + delta));
      
      if (newZoom !== currentZoomRef.current) {
        currentZoomRef.current = newZoom;
        onZoomChange(newZoom);
      }
    }
  }, [enableZoom, onZoomChange, minZoom, maxZoom, zoomSensitivity]);

  // Attach event listeners to element
  const attachGestureListeners = useCallback((element: HTMLElement) => {
    element.addEventListener("touchstart", handleTouchStart, { passive: false });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd, { passive: false });
    element.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("wheel", handleWheel);
      
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel]);

  // Reset gestures
  const resetGestures = useCallback(() => {
    const state = gestureStateRef.current;
    state.isZooming = false;
    state.isPanning = false;
    state.panOffset = { x: 0, y: 0 };
    currentZoomRef.current = 1;
    
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
  }, []);

  // Get current zoom level
  const getCurrentZoom = useCallback(() => {
    return currentZoomRef.current;
  }, []);

  // Set zoom programmatically
  const setZoom = useCallback((zoom: number) => {
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
    currentZoomRef.current = newZoom;
    onZoomChange(newZoom);
  }, [onZoomChange, minZoom, maxZoom]);

  // Get current gesture state
  const getGestureState = useCallback(() => {
    return {
      isZooming: gestureStateRef.current.isZooming,
      isPanning: gestureStateRef.current.isPanning,
      zoom: currentZoomRef.current,
      panOffset: { ...gestureStateRef.current.panOffset },
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, []);

  return {
    attachGestureListeners,
    resetGestures,
    getCurrentZoom,
    setZoom,
    getGestureState,
    isGestureActive: () => gestureStateRef.current.isZooming || gestureStateRef.current.isPanning,
  };
}