import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePWA } from './usePWA';

// Mock service worker registration
const mockRegistration = {
  addEventListener: vi.fn(),
  waiting: null,
  active: {
    postMessage: vi.fn(),
  },
} as any;

const mockServiceWorker = {
  register: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  controller: null,
};

// Mock window methods
const mockMatchMedia = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

describe('usePWA', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock navigator.serviceWorker
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true,
    });

    // Mock PushManager for PWA support check
    Object.defineProperty(global.window, 'PushManager', {
      value: vi.fn(),
      writable: true,
    });

    // Mock window.matchMedia
    Object.defineProperty(global.window, 'matchMedia', {
      value: mockMatchMedia,
      writable: true,
    });

    // Mock window event listeners
    Object.defineProperty(global.window, 'addEventListener', {
      value: mockAddEventListener,
      writable: true,
    });

    Object.defineProperty(global.window, 'removeEventListener', {
      value: mockRemoveEventListener,
      writable: true,
    });

    // Default matchMedia response (not installed)
    mockMatchMedia.mockReturnValue({ matches: false });
    
    // Mock successful service worker registration
    mockServiceWorker.register.mockResolvedValue(mockRegistration);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => usePWA());

    expect(result.current.isInstallable).toBe(false);
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isSupported).toBe(true);
    expect(result.current.swRegistered).toBe(false);
    expect(result.current.swUpdateAvailable).toBe(false);
  });

  it('should detect if PWA is already installed', () => {
    mockMatchMedia.mockReturnValue({ matches: true });

    const { result } = renderHook(() => usePWA());

    expect(result.current.isInstalled).toBe(true);
  });

  it('should detect unsupported browsers', () => {
    // Mock unsupported browser
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
    });

    const { result } = renderHook(() => usePWA());

    expect(result.current.isSupported).toBe(false);
  });

  it('should register service worker successfully', async () => {
    renderHook(() => usePWA());

    // Wait for service worker registration
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', {
      scope: '/',
    });
  });

  it('should handle beforeinstallprompt event', () => {
    const { result } = renderHook(() => usePWA());

    const mockEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };

    // Simulate beforeinstallprompt event
    act(() => {
      mockAddEventListener.mock.calls
        .find(call => call[0] === 'beforeinstallprompt')?.[1](mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.isInstallable).toBe(true);
  });

  it('should install PWA successfully', async () => {
    const { result } = renderHook(() => usePWA());

    const mockEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };

    // Set up install prompt
    act(() => {
      mockAddEventListener.mock.calls
        .find(call => call[0] === 'beforeinstallprompt')?.[1](mockEvent);
    });

    // Install PWA
    let installResult: boolean = false;
    await act(async () => {
      installResult = await result.current.installPWA();
    });

    expect(mockEvent.prompt).toHaveBeenCalled();
    expect(installResult).toBe(true);
  });

  it('should handle install rejection', async () => {
    const { result } = renderHook(() => usePWA());

    const mockEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    };

    // Set up install prompt
    act(() => {
      mockAddEventListener.mock.calls
        .find(call => call[0] === 'beforeinstallprompt')?.[1](mockEvent);
    });

    // Try to install PWA
    let installResult: boolean = true;
    await act(async () => {
      installResult = await result.current.installPWA();
    });

    expect(installResult).toBe(false);
  });

  it('should handle app installed event', () => {
    const { result } = renderHook(() => usePWA());

    // Simulate app installed event
    act(() => {
      mockAddEventListener.mock.calls
        .find(call => call[0] === 'appinstalled')?.[1]({});
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.isInstallable).toBe(false);
  });

  it('should detect service worker updates', () => {
    const { result } = renderHook(() => usePWA());

    // Mock updatefound event
    const mockNewWorker = {
      addEventListener: vi.fn(),
      state: 'installed',
    };

    // Mock service worker controller
    mockServiceWorker.controller = {};

    // Simulate updatefound
    act(() => {
      mockRegistration.addEventListener.mock.calls
        .find(call => call[0] === 'updatefound')?.[1]();
      
      // Mock installing worker
      mockRegistration.installing = mockNewWorker;
      
      // Simulate state change to installed
      mockNewWorker.addEventListener.mock.calls
        .find(call => call[0] === 'statechange')?.[1]();
    });

    expect(result.current.swUpdateAvailable).toBe(true);
  });

  it('should update service worker', async () => {
    const { result } = renderHook(() => usePWA());

    // Mock waiting worker
    const mockWaitingWorker = {
      postMessage: vi.fn(),
    };
    mockRegistration.waiting = mockWaitingWorker;

    // Mock window.location.reload
    Object.defineProperty(global.window, 'location', {
      value: { reload: vi.fn() },
      writable: true,
    });

    // Update service worker
    await act(async () => {
      const updatePromise = result.current.updateSW();
      
      // Simulate controllerchange event
      mockServiceWorker.addEventListener.mock.calls
        .find(call => call[0] === 'controllerchange')?.[1]();
      
      await updatePromise;
    });

    expect(mockWaitingWorker.postMessage).toHaveBeenCalledWith({
      type: 'SKIP_WAITING',
    });
  });

  it('should clear cache successfully', async () => {
    const { result } = renderHook(() => usePWA());

    // Mock MessageChannel
    const mockPort = { onmessage: vi.fn() };
    global.MessageChannel = vi.fn().mockImplementation(() => ({
      port1: mockPort,
      port2: {},
    }));

    // Clear cache
    let clearResult: boolean = false;
    await act(async () => {
      const clearPromise = result.current.clearCache();
      
      // Simulate successful response
      mockPort.onmessage({ data: { success: true } });
      
      clearResult = await clearPromise;
    });

    expect(clearResult).toBe(true);
    expect(mockRegistration.active.postMessage).toHaveBeenCalledWith(
      { type: 'CLEAR_CACHE' },
      [{}]
    );
  });

  it('should handle cache clear failure', async () => {
    const { result } = renderHook(() => usePWA());

    // Mock MessageChannel
    const mockPort = { onmessage: vi.fn() };
    global.MessageChannel = vi.fn().mockImplementation(() => ({
      port1: mockPort,
      port2: {},
    }));

    // Clear cache with failure
    let clearResult: boolean = true;
    await act(async () => {
      const clearPromise = result.current.clearCache();
      
      // Simulate failure response
      mockPort.onmessage({ data: { success: false } });
      
      clearResult = await clearPromise;
    });

    expect(clearResult).toBe(false);
  });
});