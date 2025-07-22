import { Wifi, WifiOff, RotateCcw, AlertCircle } from "lucide-react";

interface ConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'reconnecting';
  error?: string | null;
  onReconnect?: () => void;
  className?: string;
}

export function ConnectionStatus({ status, error, onReconnect, className = "" }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Conectado',
          className: 'text-green-600 dark:text-green-400',
          bgClass: 'bg-green-50 dark:bg-green-900/20',
          borderClass: 'border-green-200 dark:border-green-800',
        };
      case 'reconnecting':
        return {
          icon: RotateCcw,
          text: 'Reconectando...',
          className: 'text-yellow-600 dark:text-yellow-400',
          bgClass: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderClass: 'border-yellow-200 dark:border-yellow-800',
          animate: true,
        };
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          text: 'Desconectado',
          className: 'text-red-600 dark:text-red-400',
          bgClass: 'bg-red-50 dark:bg-red-900/20',
          borderClass: 'border-red-200 dark:border-red-800',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (status === 'connected' && !error) {
    // Show minimal indicator when connected and no errors
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <Icon className={`w-3 h-3 ${config.className}`} />
        <span className={`text-xs ${config.className}`}>Online</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 px-2 py-1 rounded-md border ${config.bgClass} ${config.borderClass} ${className}`}>
      <Icon 
        className={`w-4 h-4 ${config.className} ${config.animate ? 'animate-spin' : ''}`} 
      />
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${config.className}`}>
          {config.text}
        </span>
        {error && (
          <div className="flex items-center space-x-1 mt-1">
            <AlertCircle className="w-3 h-3 text-red-500" />
            <span className="text-xs text-red-600 dark:text-red-400 truncate">
              {error}
            </span>
          </div>
        )}
      </div>
      {(status === 'disconnected' || error) && onReconnect && (
        <button
          onClick={onReconnect}
          className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 rounded transition-colors"
        >
          Reconectar
        </button>
      )}
    </div>
  );
}