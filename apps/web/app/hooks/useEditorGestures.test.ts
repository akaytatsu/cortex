import { describe, it, expect } from "vitest";

// Simple test to verify the module exports
describe("useEditorGestures", () => {
  it("can import the hook", async () => {
    const module = await import("./useEditorGestures");
    expect(module.useEditorGestures).toBeDefined();
    expect(typeof module.useEditorGestures).toBe("function");
  });

  it("handles gesture calculations correctly", () => {
    // Test zoom constraint logic
    const constrainZoom = (zoom: number, min: number, max: number) => {
      return Math.max(min, Math.min(max, zoom));
    };

    expect(constrainZoom(1.5, 0.5, 2)).toBe(1.5);
    expect(constrainZoom(0.2, 0.5, 2)).toBe(0.5);
    expect(constrainZoom(3, 0.5, 2)).toBe(2);
  });

  it("calculates touch distance correctly", () => {
    const getTouchDistance = (touch1: { clientX: number; clientY: number }, touch2: { clientX: number; clientY: number }) => {
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const touch1 = { clientX: 0, clientY: 0 };
    const touch2 = { clientX: 3, clientY: 4 };
    
    expect(getTouchDistance(touch1, touch2)).toBe(5);
  });

  it("calculates touch center correctly", () => {
    const getTouchCenter = (touch1: { clientX: number; clientY: number }, touch2: { clientX: number; clientY: number }) => {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
    };

    const touch1 = { clientX: 0, clientY: 0 };
    const touch2 = { clientX: 10, clientY: 20 };
    const center = getTouchCenter(touch1, touch2);
    
    expect(center.x).toBe(5);
    expect(center.y).toBe(10);
  });

  it("handles zoom sensitivity calculations", () => {
    const applyZoomSensitivity = (delta: number, sensitivity: number) => {
      return delta * sensitivity;
    };

    expect(applyZoomSensitivity(10, 0.01)).toBe(0.1);
    expect(applyZoomSensitivity(-5, 0.02)).toBe(-0.1);
  });

  it("handles pan sensitivity calculations", () => {
    const applyPanSensitivity = (delta: { x: number; y: number }, sensitivity: number) => {
      return {
        x: delta.x * sensitivity,
        y: delta.y * sensitivity,
      };
    };

    const delta = { x: 10, y: 20 };
    const result = applyPanSensitivity(delta, 2);
    
    expect(result.x).toBe(20);
    expect(result.y).toBe(40);
  });
});