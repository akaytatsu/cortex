import { useEffect, useState } from 'react';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isSupported: boolean;
  swRegistered: boolean;
  swUpdateAvailable: boolean;
}

interface PWAActions {
  installPWA: () => Promise<boolean>;
  updateSW: () => Promise<void>;
  clearCache: () => Promise<boolean>;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isSupported: false,
    swRegistered: false,
    swUpdateAvailable: false,
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [swRegistration, setSWRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check PWA support
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    
    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       window.matchMedia('(display-mode: fullscreen)').matches ||
                       (window.navigator as any).standalone === true;

    setState(prev => ({
      ...prev,
      isSupported,
      isInstalled,
    }));

    if (!isSupported) return;

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setSWRegistration(registration);
        
        setState(prev => ({
          ...prev,
          swRegistered: true,
        }));

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  setState(prev => ({
                    ...prev,
                    swUpdateAvailable: true,
                  }));
                }
              }
            });
          }
        });

        console.log('[PWA] Service Worker registered');
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    };

    registerSW();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState(prev => ({
        ...prev,
        isInstallable: true,
      }));
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      console.log('[PWA] App installed');
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
      }));
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('[PWA] No install prompt available');
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      
      if (result.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        setDeferredPrompt(null);
        setState(prev => ({
          ...prev,
          isInstallable: false,
        }));
        return true;
      } else {
        console.log('[PWA] User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('[PWA] Install failed:', error);
      return false;
    }
  };

  const updateSW = async (): Promise<void> => {
    if (!swRegistration) {
      throw new Error('Service Worker not registered');
    }

    const waitingWorker = swRegistration.waiting;
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait for the new service worker to take control
      await new Promise<void>((resolve) => {
        const handleControllerChange = () => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          resolve();
        };
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      });

      setState(prev => ({
        ...prev,
        swUpdateAvailable: false,
      }));

      // Reload the page to use the new service worker
      window.location.reload();
    }
  };

  const clearCache = async (): Promise<boolean> => {
    if (!swRegistration) {
      console.warn('[PWA] Service Worker not available for cache clearing');
      return false;
    }

    try {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success);
        };

        swRegistration.active?.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('[PWA] Cache clearing failed:', error);
      return false;
    }
  };

  return {
    ...state,
    installPWA,
    updateSW,
    clearCache,
  };
}