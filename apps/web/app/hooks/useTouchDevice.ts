import { useState, useEffect } from "react";

export function useTouchDevice(): {
  isTouchDevice: boolean;
  touchSupported: boolean;
  preferTouch: boolean;
} {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [touchSupported, setTouchSupported] = useState(false);
  const [preferTouch, setPreferTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      // Check if touch is supported
      const touchSupport = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setTouchSupported(touchSupport);

      // Check if device is primarily touch-based
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      
      // Check viewport size (mobile breakpoint)
      const isMobileViewport = window.innerWidth < 768;
      
      // Device is touch if it supports touch AND is mobile/small viewport
      const touchDevice = touchSupport && (isMobileDevice || isMobileViewport);
      setIsTouchDevice(touchDevice);

      // Prefer touch if touch is supported and viewport is small
      const preferTouchInput = touchSupport && isMobileViewport;
      setPreferTouch(preferTouchInput);
    };

    checkTouch();

    // Listen for viewport changes
    const handleResize = () => {
      checkTouch();
    };

    window.addEventListener("resize", handleResize);
    
    // Listen for orientation changes on mobile
    const handleOrientationChange = () => {
      // Delay to let the viewport settle
      setTimeout(checkTouch, 100);
    };
    
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  return {
    isTouchDevice,
    touchSupported,
    preferTouch,
  };
}

// Utility hook for components that need touch-friendly styling
export function useTouchFriendly(): boolean {
  const { preferTouch } = useTouchDevice();
  return preferTouch;
}

// Hook that provides CSS classes for touch-friendly elements
export function useTouchClasses() {
  const preferTouch = useTouchFriendly();

  return {
    button: (size: "sm" | "md" | "lg" = "md") => {
      if (!preferTouch) return "";
      
      const touchSizes = {
        sm: "min-h-[44px] min-w-[44px] touch-target",
        md: "min-h-[44px] min-w-[44px] touch-target",
        lg: "min-h-[48px] min-w-[48px] touch-target",
      };
      
      return touchSizes[size];
    },
    
    input: (size: "sm" | "md" | "lg" = "md") => {
      if (!preferTouch) return "";
      
      const touchSizes = {
        sm: "min-h-[44px] touch-target",
        md: "min-h-[44px] touch-target", 
        lg: "min-h-[48px] touch-target",
      };
      
      return touchSizes[size];
    },
    
    clickable: "touch-target",
    
    menuItem: "mobile-menu-item touch-target",
  };
}