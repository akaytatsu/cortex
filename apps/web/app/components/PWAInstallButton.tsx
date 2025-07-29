import { useState } from 'react';
import { usePWA } from '~/hooks/usePWA';
import { Button } from '~/components/ui/Button';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export default function PWAInstallButton({ 
  className = '', 
  variant = 'outline' 
}: PWAInstallButtonProps) {
  const [isInstalling, setIsInstalling] = useState(false);
  const { isInstallable, isInstalled, installPWA } = usePWA();

  // Don't show if not installable or already installed
  if (!isInstallable || isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await installPWA();
    } catch (error) {
      console.error('[PWA] Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleInstall}
      disabled={isInstalling}
      className={`${className} flex items-center space-x-2`}
      touchFriendly
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
          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
        />
      </svg>
      <span>
        {isInstalling ? 'Instalando...' : 'Instalar App'}
      </span>
    </Button>
  );
}