export const breakpoints = {
  xs: 375,
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1440,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export const useViewportSize = () => {
  if (typeof window === "undefined") {
    return {
      width: 0,
      height: 0,
      isMobile: false,
      isTablet: false,
      isDesktop: false,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    width,
    height,
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg,
  };
};

export const getResponsiveClass = (
  baseClass: string,
  responsiveClasses: Partial<Record<Breakpoint, string>>
): string => {
  const classes = [baseClass];
  
  Object.entries(responsiveClasses).forEach(([breakpoint, className]) => {
    if (className) {
      classes.push(`${breakpoint}:${className}`);
    }
  });
  
  return classes.join(" ");
};

export const getContainerClass = (): string => {
  return "mobile-container tablet-container desktop-container";
};

export const getGridClass = (): string => {
  return "grid-mobile grid-tablet grid-desktop";
};

export const getSidebarClass = (isOpen: boolean): string => {
  return `sidebar-mobile ${isOpen ? "open" : ""}`;
};

export const getMainClass = (): string => {
  return "main-mobile main-desktop";
};

export const isTouchDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
};

export const getTouchTargetClass = (className: string = ""): string => {
  return `touch-target ${className}`.trim();
};

export const getButtonClass = (variant: "primary" | "secondary" | "touch" = "primary"): string => {
  const baseClass = variant === "touch" ? "btn-touch" : "btn-base";
  return baseClass;
};

export const getInputClass = (touch: boolean = false): string => {
  return touch ? "input-touch" : "input-base";
};

export const isPortrait = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.innerHeight > window.innerWidth;
};

export const isLandscape = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.innerWidth > window.innerHeight;
};

export const getOrientationClass = (): string => {
  if (typeof window === "undefined") return "";
  return isPortrait() ? "portrait" : "landscape";
};