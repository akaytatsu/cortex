import { useState } from 'react';
import { usePWA } from '~/hooks/usePWA';
import { Button } from '~/components/ui/Button';

export default function PWAUpdateNotification() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { swUpdateAvailable, updateSW } = usePWA();

  // Don't show if no update available or dismissed
  if (!swUpdateAvailable || isDismissed) {
    return null;
  }

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await updateSW();
    } catch (error) {
      console.error('[PWA] Update failed:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
        <div className="flex items-start space-x-3">
          {/* Update icon */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Nova versão disponível
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Uma atualização do Cortex IDE está pronta para ser instalada.
            </p>

            {/* Actions */}
            <div className="flex items-center space-x-2 mt-3">
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdate}
                disabled={isUpdating}
                touchFriendly
              >
                {isUpdating ? 'Atualizando...' : 'Atualizar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                disabled={isUpdating}
                touchFriendly
              >
                Mais tarde
              </Button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            disabled={isUpdating}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}