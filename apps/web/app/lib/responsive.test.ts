import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  breakpoints,
  useViewportSize,
  getResponsiveClass,
  getContainerClass,
  getGridClass,
  getSidebarClass,
  getMainClass,
  isTouchDevice,
  getTouchTargetClass,
  getButtonClass,
  getInputClass,
  isPortrait,
  isLandscape,
  getOrientationClass,
} from "./responsive";

// Mock window object
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  ontouchstart: undefined,
};

Object.defineProperty(global, "window", {
  value: mockWindow,
  writable: true,
});

Object.defineProperty(global, "navigator", {
  value: {
    maxTouchPoints: 0,
  },
  writable: true,
});

describe("responsive utilities", () => {
  beforeEach(() => {
    mockWindow.innerWidth = 1024;
    mockWindow.innerHeight = 768;
    mockWindow.ontouchstart = undefined;
    (global.navigator as any).maxTouchPoints = 0;
  });

  describe("breakpoints", () => {
    it("should have correct breakpoint values", () => {
      expect(breakpoints.xs).toBe(375);
      expect(breakpoints.sm).toBe(375);
      expect(breakpoints.md).toBe(768);
      expect(breakpoints.lg).toBe(1024);
      expect(breakpoints.xl).toBe(1280);
      expect(breakpoints["2xl"]).toBe(1440);
    });
  });

  describe("useViewportSize", () => {
    it("should return desktop viewport for 1024px width", () => {
      mockWindow.innerWidth = 1024;
      mockWindow.innerHeight = 768;

      const result = useViewportSize();
      
      expect(result.width).toBe(1024);
      expect(result.height).toBe(768);
      expect(result.isMobile).toBe(false);
      expect(result.isTablet).toBe(false);
      expect(result.isDesktop).toBe(true);
    });

    it("should return mobile viewport for 375px width", () => {
      mockWindow.innerWidth = 375;
      mockWindow.innerHeight = 667;

      const result = useViewportSize();
      
      expect(result.width).toBe(375);
      expect(result.height).toBe(667);
      expect(result.isMobile).toBe(true);
      expect(result.isTablet).toBe(false);
      expect(result.isDesktop).toBe(false);
    });

    it("should return tablet viewport for 768px width", () => {
      mockWindow.innerWidth = 768;
      mockWindow.innerHeight = 1024;

      const result = useViewportSize();
      
      expect(result.width).toBe(768);
      expect(result.height).toBe(1024);
      expect(result.isMobile).toBe(false);
      expect(result.isTablet).toBe(true);
      expect(result.isDesktop).toBe(false);
    });

    it("should handle server-side rendering", () => {
      const originalWindow = global.window;
      (global as any).window = undefined;

      const result = useViewportSize();
      
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
      expect(result.isMobile).toBe(false);
      expect(result.isTablet).toBe(false);
      expect(result.isDesktop).toBe(false);

      global.window = originalWindow;
    });
  });

  describe("getResponsiveClass", () => {
    it("should combine base class with responsive classes", () => {
      const result = getResponsiveClass("text-base", {
        md: "text-lg",
        lg: "text-xl",
      });

      expect(result).toBe("text-base md:text-lg lg:text-xl");
    });

    it("should ignore undefined responsive classes", () => {
      const result = getResponsiveClass("text-base", {
        md: "text-lg",
        lg: undefined,
        xl: "text-2xl",
      });

      expect(result).toBe("text-base md:text-lg xl:text-2xl");
    });
  });

  describe("container and layout classes", () => {
    it("should return correct container class", () => {
      expect(getContainerClass()).toBe("mobile-container tablet-container desktop-container");
    });

    it("should return correct grid class", () => {
      expect(getGridClass()).toBe("grid-mobile grid-tablet grid-desktop");
    });

    it("should return correct main class", () => {
      expect(getMainClass()).toBe("main-mobile main-desktop");
    });
  });

  describe("getSidebarClass", () => {
    it("should return sidebar class with open state", () => {
      expect(getSidebarClass(true)).toBe("sidebar-mobile open");
    });

    it("should return sidebar class without open state", () => {
      expect(getSidebarClass(false)).toBe("sidebar-mobile ");
    });
  });

  describe("touch detection", () => {
    it("should detect touch device via ontouchstart", () => {
      mockWindow.ontouchstart = null;
      expect(isTouchDevice()).toBe(true);
    });

    it("should detect touch device via maxTouchPoints", () => {
      mockWindow.ontouchstart = undefined;
      (global.navigator as any).maxTouchPoints = 1;
      expect(isTouchDevice()).toBe(true);
    });

    it("should detect non-touch device", () => {
      // Remove the property completely to simulate non-touch device
      if ('ontouchstart' in mockWindow) {
        delete (mockWindow as any).ontouchstart;
      }
      (global.navigator as any).maxTouchPoints = 0;
      expect(isTouchDevice()).toBe(false);
    });

    it("should handle server-side rendering for touch detection", () => {
      const originalWindow = global.window;
      (global as any).window = undefined;
      
      expect(isTouchDevice()).toBe(false);
      
      global.window = originalWindow;
    });
  });

  describe("component classes", () => {
    it("should return correct touch target class", () => {
      expect(getTouchTargetClass()).toBe("touch-target");
      expect(getTouchTargetClass("custom-class")).toBe("touch-target custom-class");
    });

    it("should return correct button classes", () => {
      expect(getButtonClass()).toBe("btn-base");
      expect(getButtonClass("primary")).toBe("btn-base");
      expect(getButtonClass("secondary")).toBe("btn-base");
      expect(getButtonClass("touch")).toBe("btn-touch");
    });

    it("should return correct input classes", () => {
      expect(getInputClass()).toBe("input-base");
      expect(getInputClass(false)).toBe("input-base");
      expect(getInputClass(true)).toBe("input-touch");
    });
  });

  describe("orientation detection", () => {
    it("should detect portrait orientation", () => {
      mockWindow.innerWidth = 375;
      mockWindow.innerHeight = 667;
      
      expect(isPortrait()).toBe(true);
      expect(isLandscape()).toBe(false);
      expect(getOrientationClass()).toBe("portrait");
    });

    it("should detect landscape orientation", () => {
      mockWindow.innerWidth = 667;
      mockWindow.innerHeight = 375;
      
      expect(isPortrait()).toBe(false);
      expect(isLandscape()).toBe(true);
      expect(getOrientationClass()).toBe("landscape");
    });

    it("should handle server-side rendering for orientation", () => {
      const originalWindow = global.window;
      (global as any).window = undefined;
      
      expect(isPortrait()).toBe(false);
      expect(isLandscape()).toBe(false);
      expect(getOrientationClass()).toBe("");
      
      global.window = originalWindow;
    });
  });
});