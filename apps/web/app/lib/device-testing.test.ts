import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Device configurations for testing
const deviceConfigs = {
  // iOS Devices
  iPhoneSE: {
    name: 'iPhone SE',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 375, height: 667 },
    pixelRatio: 2,
    platform: 'iPhone',
    maxTouchPoints: 5,
    orientation: 'portrait',
    features: ['touch', 'ios', 'safari', 'webkit']
  },
  iPhone12: {
    name: 'iPhone 12',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    pixelRatio: 3,
    platform: 'iPhone',
    maxTouchPoints: 5,
    orientation: 'portrait',
    features: ['touch', 'ios', 'safari', 'webkit', 'notch']
  },
  iPhone14ProMax: {
    name: 'iPhone 14 Pro Max',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1',
    viewport: { width: 430, height: 932 },
    pixelRatio: 3,
    platform: 'iPhone',
    maxTouchPoints: 5,
    orientation: 'portrait',
    features: ['touch', 'ios', 'safari', 'webkit', 'notch', 'dynamic-island']
  },
  iPadAir: {
    name: 'iPad Air',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 820, height: 1180 },
    pixelRatio: 2,
    platform: 'iPad',
    maxTouchPoints: 5,
    orientation: 'portrait',
    features: ['touch', 'ios', 'safari', 'webkit', 'tablet']
  },

  // Android Devices
  galaxyS21: {
    name: 'Samsung Galaxy S21',
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Mobile Safari/537.36',
    viewport: { width: 360, height: 800 },
    pixelRatio: 3,
    platform: 'Linux armv7l',
    maxTouchPoints: 5,
    orientation: 'portrait',
    features: ['touch', 'android', 'chrome', 'blink']
  },
  galaxyS23Ultra: {
    name: 'Samsung Galaxy S23 Ultra',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 915 },
    pixelRatio: 3.5,
    platform: 'Linux armv8l',
    maxTouchPoints: 5,
    orientation: 'portrait',
    features: ['touch', 'android', 'chrome', 'blink', 'stylus']
  },
  pixelFold: {
    name: 'Google Pixel Fold',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel Fold) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36',
    viewport: { width: 412, height: 892 }, // Folded
    unfoldedViewport: { width: 673, height: 841 }, // Unfolded
    pixelRatio: 2.625,
    platform: 'Linux armv8l',
    maxTouchPoints: 10,
    orientation: 'portrait',
    features: ['touch', 'android', 'chrome', 'blink', 'foldable']
  },
  tabletAndroid: {
    name: 'Android Tablet (Generic)',
    userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    viewport: { width: 768, height: 1024 },
    pixelRatio: 2,
    platform: 'Linux armv8l',
    maxTouchPoints: 10,
    orientation: 'portrait',
    features: ['touch', 'android', 'chrome', 'blink', 'tablet']
  }
};

type DeviceConfig = typeof deviceConfigs[keyof typeof deviceConfigs];

// Mock device environment
const mockDevice = (config: DeviceConfig) => {
  // Mock navigator properties
  Object.defineProperty(navigator, 'userAgent', {
    value: config.userAgent,
    configurable: true
  });

  Object.defineProperty(navigator, 'platform', {
    value: config.platform,
    configurable: true
  });

  Object.defineProperty(navigator, 'maxTouchPoints', {
    value: config.maxTouchPoints,
    configurable: true
  });

  // Mock window properties
  Object.defineProperty(window, 'innerWidth', {
    value: config.viewport.width,
    configurable: true
  });

  Object.defineProperty(window, 'innerHeight', {
    value: config.viewport.height,
    configurable: true
  });

  Object.defineProperty(window, 'devicePixelRatio', {
    value: config.pixelRatio,
    configurable: true
  });

  Object.defineProperty(screen, 'width', {
    value: config.viewport.width,
    configurable: true
  });

  Object.defineProperty(screen, 'height', {
    value: config.viewport.height,
    configurable: true
  });

  Object.defineProperty(screen, 'orientation', {
    value: {
      type: config.orientation === 'portrait' ? 'portrait-primary' : 'landscape-primary',
      angle: config.orientation === 'portrait' ? 0 : 90
    },
    configurable: true
  });

  // Mock matchMedia for device-specific media queries
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockImplementation((query: string) => {
      const width = config.viewport.width;
      const height = config.viewport.height;
      const pixelRatio = config.pixelRatio;
      
      let matches = false;

      // Viewport size queries
      if (query.includes('min-width')) {
        const minWidth = parseInt(query.match(/min-width:\s*(\d+)px/)?.[1] || '0');
        matches = width >= minWidth;
      } else if (query.includes('max-width')) {
        const maxWidth = parseInt(query.match(/max-width:\s*(\d+)px/)?.[1] || '9999');
        matches = width <= maxWidth;
      }

      // Device pixel ratio queries
      if (query.includes('device-pixel-ratio')) {
        const minRatio = parseFloat(query.match(/min-device-pixel-ratio:\s*([\d.]+)/)?.[1] || '0');
        matches = matches && pixelRatio >= minRatio;
      }

      // Orientation queries
      if (query.includes('orientation')) {
        const isPortrait = height > width;
        if (query.includes('portrait')) {
          matches = matches && isPortrait;
        } else if (query.includes('landscape')) {
          matches = matches && !isPortrait;
        }
      }

      // Touch capability
      if (query.includes('hover: none')) {
        matches = config.features.includes('touch');
      }

      // iOS specific
      if (query.includes('-webkit-')) {
        matches = config.features.includes('webkit');
      }

      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
    configurable: true
  });

  return config;
};

describe('Real Device Testing Simulation', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('iOS Device Testing', () => {
    it('should work correctly on iPhone SE (small screen)', async () => {
      mockDevice(deviceConfigs.iPhoneSE);

      // Check device detection
      expect(navigator.userAgent).toContain('iPhone');
      expect(window.innerWidth).toBe(375);
      expect(window.innerHeight).toBe(667);
      expect(window.devicePixelRatio).toBe(2);

      // Check responsive behavior
      expect(window.matchMedia('(max-width: 767px)').matches).toBe(true);
      expect(window.matchMedia('(min-width: 768px)').matches).toBe(false);
    });

    it('should work correctly on iPhone 14 Pro Max (large screen with notch)', async () => {
      const device = mockDevice(deviceConfigs.iPhone14ProMax);

      expect(navigator.userAgent).toContain('iPhone');
      expect(window.innerWidth).toBe(430);
      expect(window.innerHeight).toBe(932);
      expect(device.features).toContain('dynamic-island');
    });

    it('should handle iPad landscape mode correctly', async () => {
      mockDevice({
        ...deviceConfigs.iPadAir,
        viewport: { width: 1180, height: 820 }, // Landscape
        orientation: 'landscape'
      });

      expect(window.innerWidth).toBe(1180);
      expect(window.innerHeight).toBe(820);
      expect(window.matchMedia('(min-width: 1024px)').matches).toBe(true);
      expect(window.matchMedia('(orientation: landscape)').matches).toBe(true);
    });
  });

  describe('Android Device Testing', () => {
    it('should work correctly on Samsung Galaxy S21', async () => {
      const device = mockDevice(deviceConfigs.galaxyS21);

      expect(navigator.userAgent).toContain('Android');
      expect(navigator.userAgent).toContain('Chrome');
      expect(window.innerWidth).toBe(360);
      expect(device.features).toContain('android');
    });

    it('should handle Galaxy S23 Ultra with S Pen support', async () => {
      const device = mockDevice(deviceConfigs.galaxyS23Ultra);

      expect(device.features).toContain('stylus');
      expect(window.innerWidth).toBe(412);
      expect(window.devicePixelRatio).toBe(3.5);
    });

    it('should handle foldable device (Pixel Fold)', async () => {
      // Test folded state
      let device = mockDevice(deviceConfigs.pixelFold);

      expect(window.innerWidth).toBe(412);
      expect(device.features).toContain('foldable');

      // Test unfolded state
      device = mockDevice({
        ...deviceConfigs.pixelFold,
        viewport: deviceConfigs.pixelFold.unfoldedViewport!,
        orientation: 'landscape'
      });

      expect(window.innerWidth).toBe(673);
      expect(window.innerHeight).toBe(841);
    });
  });

  describe('Cross-Platform Feature Testing', () => {
    it('should detect touch capabilities correctly across devices', () => {
      const touchDevices = [
        deviceConfigs.iPhoneSE,
        deviceConfigs.galaxyS21,
        deviceConfigs.iPadAir,
        deviceConfigs.tabletAndroid
      ];

      touchDevices.forEach(deviceConfig => {
        mockDevice(deviceConfig);

        expect(navigator.maxTouchPoints).toBeGreaterThan(0);
        expect(window.matchMedia('(hover: none)').matches).toBe(true);
        expect(window.matchMedia('(pointer: coarse)').matches).toBe(true);
      });
    });

    it('should handle different pixel ratios correctly', () => {
      const pixelRatioTests = [
        { device: deviceConfigs.iPhoneSE, expectedRatio: 2 },
        { device: deviceConfigs.iPhone12, expectedRatio: 3 },
        { device: deviceConfigs.galaxyS23Ultra, expectedRatio: 3.5 },
      ];

      pixelRatioTests.forEach(({ device, expectedRatio }) => {
        mockDevice(device);

        expect(window.devicePixelRatio).toBe(expectedRatio);
        expect(
          window.matchMedia(`(-webkit-min-device-pixel-ratio: ${expectedRatio})`).matches
        ).toBe(true);
      });
    });

    it('should adapt layout for different screen sizes', async () => {
      const screenSizeTests = [
        { device: deviceConfigs.iPhoneSE, isSmall: true, isTablet: false },
        { device: deviceConfigs.iPhone14ProMax, isSmall: false, isTablet: false },
        { device: deviceConfigs.iPadAir, isSmall: false, isTablet: true },
        { device: deviceConfigs.tabletAndroid, isSmall: false, isTablet: true },
      ];

      for (const { device, isTablet } of screenSizeTests) {
        mockDevice(device);

        const TestComponent = () => React.createElement('div', {
          className: `grid gap-4 p-4 ${isTablet ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`
        }, [
          React.createElement('div', { key: 1 }, 'Item 1'),
          React.createElement('div', { key: 2 }, 'Item 2'),
          React.createElement('div', { key: 3 }, 'Item 3')
        ]);

        const { container } = render(React.createElement(TestComponent));
        const gridElement = container.querySelector('.grid');

        expect(gridElement).toBeInTheDocument();

        if (isTablet) {
          expect(gridElement).toHaveClass('md:grid-cols-2');
        } else {
          expect(gridElement).toHaveClass('grid-cols-1');
        }
      }
    });
  });

  describe('Performance Testing on Mobile Devices', () => {
    it('should perform well on low-end devices', async () => {
      const lowEndDevice = {
        ...deviceConfigs.iPhoneSE,
        name: 'Low-end Device',
      };

      mockDevice(lowEndDevice);

      const startTime = performance.now();

      const TestComponent = () => React.createElement('div', {
        className: 'complex-layout'
      }, Array.from({ length: 100 }, (_, i) => 
        React.createElement('div', {
          key: i,
          className: 'item p-2 border-b'
        }, `Item ${i + 1}`)
      ));

      render(React.createElement(TestComponent));

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render in reasonable time even on low-end devices
      expect(renderTime).toBeLessThan(1000); // 1 second threshold
    });

    it('should handle memory constraints on mobile', () => {
      const memoryConstrainedDevice = {
        ...deviceConfigs.galaxyS21,
      };

      mockDevice(memoryConstrainedDevice);

      // Test component cleanup
      const TestComponent = ({ items }: { items: number[] }) => React.createElement('div', null,
        items.map(item => React.createElement('div', {
          key: item,
          className: 'memory-item'
        }, item.toString()))
      );

      const { rerender, unmount } = render(React.createElement(TestComponent, { items: [1, 2, 3] }));

      // Simulate large dataset
      const largeItems = Array.from({ length: 1000 }, (_, i) => i);
      rerender(React.createElement(TestComponent, { items: largeItems }));

      // Should handle large datasets without crashes
      expect(document.querySelectorAll('.memory-item').length).toBeGreaterThan(0);

      // Test cleanup
      unmount();
      expect(document.querySelectorAll('.memory-item')).toHaveLength(0);
    });
  });

  describe('Network Conditions Testing', () => {
    it('should handle slow network conditions', async () => {
      mockDevice(deviceConfigs.galaxyS21);

      // Mock slow network
      const mockNetworkInformation = {
        effectiveType: '2g',
        downlink: 0.1,
        rtt: 2000,
        saveData: true
      };

      Object.defineProperty(navigator, 'connection', {
        value: mockNetworkInformation,
        configurable: true
      });

      const TestComponent = () => {
        const connection = (navigator as any).connection;
        return React.createElement('div', {
          className: 'network-aware'
        }, connection?.saveData 
          ? React.createElement('div', {
              className: 'data-saver-mode'
            }, [
              React.createElement('h2', { key: 'title' }, 'Data Saver Mode'),
              React.createElement('p', { key: 'desc' }, 'Reduced functionality to save data')
            ])
          : React.createElement('div', {
              className: 'full-experience'
            }, [
              React.createElement('h2', { key: 'title' }, 'Full Experience'),
              React.createElement('div', { 
                key: 'content',
                className: 'heavy-content'
              })
            ])
        );
      };

      const { container } = render(React.createElement(TestComponent));

      expect(container.textContent).toContain('Data Saver Mode');
      expect((navigator as any).connection.saveData).toBe(true);
    });
  });

  describe('Device-Specific Features', () => {
    it('should detect iOS Safari specific features', () => {
      mockDevice(deviceConfigs.iPhone12);

      expect(navigator.userAgent).toContain('Safari');
      expect(navigator.userAgent).toContain('WebKit');
      expect(window.matchMedia('(-webkit-min-device-pixel-ratio: 1)').matches).toBe(true);
    });

    it('should detect Android Chrome specific features', () => {
      mockDevice(deviceConfigs.galaxyS21);

      expect(navigator.userAgent).toContain('Chrome');
      expect(navigator.userAgent).toContain('Android');
      expect(navigator.platform).toContain('Linux');
    });

    it('should handle device orientation changes', () => {
      // Start in portrait
      let device = mockDevice(deviceConfigs.iPhone12);
      expect(screen.orientation.type).toBe('portrait-primary');
      expect(screen.orientation.angle).toBe(0);

      // Rotate to landscape
      device = mockDevice({
        ...deviceConfigs.iPhone12,
        viewport: { width: 844, height: 390 },
        orientation: 'landscape'
      });

      expect(window.innerWidth).toBe(844);
      expect(window.innerHeight).toBe(390);
      expect(screen.orientation.type).toBe('landscape-primary');
      expect(screen.orientation.angle).toBe(90);
    });

    it('should simulate device capabilities correctly', () => {
      const capabilities = [
        { device: deviceConfigs.iPhoneSE, hasNotch: false, hasStylus: false },
        { device: deviceConfigs.iPhone14ProMax, hasNotch: true, hasStylus: false },
        { device: deviceConfigs.galaxyS23Ultra, hasNotch: false, hasStylus: true },
        { device: deviceConfigs.pixelFold, hasNotch: false, hasStylus: false, foldable: true }
      ];

      capabilities.forEach(({ device, hasNotch, hasStylus, foldable }) => {
        mockDevice(device);

        if (hasNotch) {
          expect(device.features).toContain('notch');
        }
        if (hasStylus) {
          expect(device.features).toContain('stylus');
        }
        if (foldable) {
          expect(device.features).toContain('foldable');
        }
      });
    });
  });
});