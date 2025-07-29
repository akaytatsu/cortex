import { useCallback, useRef, useEffect, useState } from "react";

interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  startY: number;
  currentY: number;
  isRefreshing: boolean;
  canPull: boolean;
}

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  triggerDistance?: number;
  maxPullDistance?: number;
  enabled?: boolean;
  threshold?: number;
  resistance?: number;
}

export function usePullToRefresh({
  onRefresh,
  triggerDistance = 80,
  maxPullDistance = 120,
  enabled = true,
  threshold = 10,
  resistance = 2.5,
}: UsePullToRefreshOptions) {
  const pullStateRef = useRef<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    startY: 0,
    currentY: 0,
    isRefreshing: false,
    canPull: false,
  });

  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if element can be pulled (at top of scroll)
  const canPullToRefresh = useCallback((element: HTMLElement): boolean => {
    if (!enabled) return false;
    
    // Check if element is scrolled to top
    const isAtTop = element.scrollTop <= 0;
    
    // For body/window, check if at top
    if (element === document.body || element === document.documentElement) {
      return window.scrollY <= 0;
    }
    
    return isAtTop;
  }, [enabled]);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent, element: HTMLElement) => {
    if (!enabled || pullStateRef.current.isRefreshing) return;

    const touch = e.touches[0];
    const state = pullStateRef.current;
    
    state.startY = touch.clientY;
    state.currentY = touch.clientY;
    state.canPull = canPullToRefresh(element);
    state.pullDistance = 0;
    
    if (state.canPull) {
      setPullProgress(0);
    }
  }, [enabled, canPullToRefresh]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent, element: HTMLElement) => {
    if (!enabled || pullStateRef.current.isRefreshing) return;

    const touch = e.touches[0];
    const state = pullStateRef.current;
    
    state.currentY = touch.clientY;
    const deltaY = state.currentY - state.startY;
    
    // Only handle downward pull when at top and can pull
    if (deltaY > threshold && state.canPull && canPullToRefresh(element)) {
      if (!state.isPulling) {
        state.isPulling = true;
      }
      
      // Apply resistance to pull distance
      const rawDistance = deltaY - threshold;
      state.pullDistance = Math.min(
        maxPullDistance,
        rawDistance / resistance
      );
      
      const progress = Math.min(1, state.pullDistance / triggerDistance);
      setPullProgress(progress);
      
      // Prevent default scrolling when pulling
      e.preventDefault();
    } else if (state.isPulling && deltaY <= threshold) {
      // Stop pulling if swipe goes back up
      state.isPulling = false;
      state.pullDistance = 0;
      setPullProgress(0);
    }
  }, [enabled, threshold, maxPullDistance, resistance, triggerDistance, canPullToRefresh]);

  // Handle touch end
  const handleTouchEnd = useCallback(async (e: TouchEvent) => {
    if (!enabled || pullStateRef.current.isRefreshing) return;

    const state = pullStateRef.current;
    
    if (state.isPulling && state.pullDistance >= triggerDistance) {
      // Trigger refresh
      state.isRefreshing = true;
      setIsRefreshing(true);
      setPullProgress(1);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error("Pull to refresh error:", error);
      } finally {
        state.isRefreshing = false;
        setIsRefreshing(false);
        setPullProgress(0);
      }
    } else {
      // Reset pull state
      setPullProgress(0);
    }
    
    state.isPulling = false;
    state.pullDistance = 0;
    state.canPull = false;
  }, [enabled, triggerDistance, onRefresh]);

  // Attach event listeners to element
  const attachPullToRefreshListeners = useCallback((element: HTMLElement) => {
    if (!enabled) return () => {};

    const handleTouchStartBound = (e: TouchEvent) => handleTouchStart(e, element);
    const handleTouchMoveBound = (e: TouchEvent) => handleTouchMove(e, element);
    const handleTouchEndBound = (e: TouchEvent) => handleTouchEnd(e);

    element.addEventListener("touchstart", handleTouchStartBound, { passive: false });
    element.addEventListener("touchmove", handleTouchMoveBound, { passive: false });
    element.addEventListener("touchend", handleTouchEndBound, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStartBound);
      element.removeEventListener("touchmove", handleTouchMoveBound);
      element.removeEventListener("touchend", handleTouchEndBound);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Get current pull state
  const getPullState = useCallback(() => {
    const state = pullStateRef.current;
    return {
      isPulling: state.isPulling,
      pullDistance: state.pullDistance,
      isRefreshing: state.isRefreshing,
      progress: pullProgress,
      canTrigger: state.pullDistance >= triggerDistance,
    };
  }, [pullProgress, triggerDistance]);

  // Manual refresh trigger
  const triggerRefresh = useCallback(async () => {
    if (pullStateRef.current.isRefreshing) return;
    
    pullStateRef.current.isRefreshing = true;
    setIsRefreshing(true);
    
    try {
      await onRefresh();
    } catch (error) {
      console.error("Manual refresh error:", error);
    } finally {
      pullStateRef.current.isRefreshing = false;
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  return {
    attachPullToRefreshListeners,
    getPullState,
    triggerRefresh,
    isRefreshing,
    pullProgress,
    isPulling: pullStateRef.current.isPulling,
  };
}