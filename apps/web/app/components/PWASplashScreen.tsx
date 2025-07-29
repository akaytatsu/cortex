import { useEffect, useState } from 'react';

interface PWASplashScreenProps {
  onHide?: () => void;
  duration?: number;
}

export default function PWASplashScreen({ onHide, duration = 2000 }: PWASplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if this is a PWA launch
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.matchMedia('(display-mode: fullscreen)').matches ||
                  (window.navigator as any).standalone === true;

    if (!isPWA) {
      setIsVisible(false);
      onHide?.();
      return;
    }

    // Mark as loaded after a brief delay
    const loadTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 500);

    // Hide splash screen after duration
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      onHide?.();
    }, duration);

    return () => {
      clearTimeout(loadTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onHide]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800" />
      
      {/* Content */}
      <div className="relative flex flex-col items-center justify-center space-y-8 p-8">
        {/* Logo */}
        <div className={`transition-all duration-1000 ${isLoaded ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className={`text-center transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Cortex IDE
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Intelligent Development Environment
          </p>
        </div>

        {/* Loading indicator */}
        <div className={`transition-all duration-1000 delay-500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>

        {/* Version info */}
        <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 transition-all duration-1000 delay-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Powered by AI • Self-hosted • Secure
          </p>
        </div>
      </div>
    </div>
  );
}