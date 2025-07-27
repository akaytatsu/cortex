import { useEffect, useState } from "react";
import { Wifi, WifiOff, RotateCcw, AlertCircle } from "lucide-react";
import type { ConnectionState } from "./useWebSocketConnection";

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  onRetry?: () => void;
  className?: string;
  showMessage?: boolean;
  compact?: boolean;
}

export function ConnectionStatus({
  connectionState,
  onRetry,
  className = "",
  showMessage = true,
  compact = false,
}: ConnectionStatusProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Auto-hide success state after a delay, but keep error states visible
  useEffect(() => {
    if (connectionState.status === "connected") {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [connectionState.status]);

  const getStatusConfig = () => {
    switch (connectionState.status) {
      case "connected":
        return {
          icon: Wifi,
          text: "Conectado",
          className: "text-green-600 dark:text-green-400",
          bgClass: "bg-green-50 dark:bg-green-900/20",
          borderClass: "border-green-200 dark:border-green-800",
        };
      case "connecting":
        return {
          icon: RotateCcw,
          text: "Conectando...",
          className: "text-blue-600 dark:text-blue-400",
          bgClass: "bg-blue-50 dark:bg-blue-900/20",
          borderClass: "border-blue-200 dark:border-blue-800",
          animate: true,
        };
      case "reconnecting":
        return {
          icon: RotateCcw,
          text: `Reconectando... (${connectionState.reconnectAttempt}/${connectionState.maxReconnectAttempts})`,
          className: "text-yellow-600 dark:text-yellow-400",
          bgClass: "bg-yellow-50 dark:bg-yellow-900/20",
          borderClass: "border-yellow-200 dark:border-yellow-800",
          animate: true,
        };
      case "failed":
        return {
          icon: WifiOff,
          text: "Falha na conexão",
          className: "text-red-600 dark:text-red-400",
          bgClass: "bg-red-50 dark:bg-red-900/20",
          borderClass: "border-red-200 dark:border-red-800",
        };
      case "disconnected":
      default:
        return {
          icon: WifiOff,
          text: "Desconectado",
          className: "text-gray-600 dark:text-gray-400",
          bgClass: "bg-gray-50 dark:bg-gray-900/20",
          borderClass: "border-gray-200 dark:border-gray-800",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  
  const shouldShowRetryButton = 
    connectionState.status === "failed" || 
    (connectionState.status === "disconnected" && connectionState.error);

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Icon className={`w-3 h-3 ${config.className} ${config.animate ? "animate-spin" : ""}`} />
        {connectionState.status !== "connected" && showMessage && (
          <span className={`text-xs ${config.className}`}>
            {config.text}
          </span>
        )}
      </div>
    );
  }

  // For non-compact mode, only show when there's something important to display
  const shouldShow = 
    isVisible && 
    (connectionState.status !== "connected" || 
     connectionState.lastConnected || 
     connectionState.error);

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${config.bgClass} ${config.borderClass} ${className}`}
    >
      <Icon
        className={`w-4 h-4 ${config.className} ${config.animate ? "animate-spin" : ""}`}
      />
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${config.className}`}>
          {config.text}
        </span>
        {showMessage && connectionState.error && (
          <div className="flex items-center space-x-1 mt-1">
            <AlertCircle className="w-3 h-3 text-red-500" />
            <span className="text-xs text-red-600 dark:text-red-400 truncate">
              {connectionState.error}
            </span>
          </div>
        )}
        {connectionState.lastConnected && connectionState.status === "connected" && (
          <span className="text-xs text-gray-500 dark:text-gray-500 block">
            Última conexão: {connectionState.lastConnected.toLocaleTimeString()}
          </span>
        )}
      </div>
      
      {shouldShowRetryButton && onRetry && (
        <button
          onClick={onRetry}
          className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 rounded transition-colors disabled:opacity-50"
          disabled={connectionState.status === "connecting" || connectionState.status === "reconnecting"}
        >
          {connectionState.status === "connecting" || connectionState.status === "reconnecting" 
            ? "Conectando..." 
            : "Tentar novamente"
          }
        </button>
      )}
      
      {connectionState.status === "reconnecting" && (
        <div className="w-full mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div 
              className="bg-yellow-500 h-1 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${(connectionState.reconnectAttempt / connectionState.maxReconnectAttempts) * 100}%`
              }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Tentativa {connectionState.reconnectAttempt} de {connectionState.maxReconnectAttempts}
          </p>
        </div>
      )}
    </div>
  );
}

// Hook adicional para exibir notificações toast de status de conexão
export function useConnectionNotifications(connectionState: ConnectionState) {
  const [lastStatus, setLastStatus] = useState(connectionState.status);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
    duration?: number;
  }>>([]);

  useEffect(() => {
    if (lastStatus !== connectionState.status) {
      let notification = null;

      switch (connectionState.status) {
        case "connected":
          if (lastStatus === "reconnecting" || lastStatus === "connecting") {
            notification = {
              id: `connection-${Date.now()}`,
              message: lastStatus === "reconnecting" ? "Reconectado com sucesso!" : "Conectado com sucesso!",
              type: "success" as const,
              duration: 3000,
            };
          }
          break;
        
        case "failed":
          notification = {
            id: `connection-${Date.now()}`,
            message: `Falha na conexão após ${connectionState.maxReconnectAttempts} tentativas`,
            type: "error" as const,
            duration: 0, // Persist until manually dismissed
          };
          break;
          
        case "reconnecting":
          if (connectionState.reconnectAttempt === 1) {
            notification = {
              id: `connection-${Date.now()}`,
              message: "Conexão perdida, tentando reconectar...",
              type: "warning" as const,
              duration: 5000,
            };
          }
          break;
      }

      if (notification) {
        setNotifications(prev => [...prev, notification]);
        
        if (notification.duration && notification.duration > 0) {
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
          }, notification.duration);
        }
      }

      setLastStatus(connectionState.status);
    }
  }, [connectionState.status, connectionState.reconnectAttempt, connectionState.maxReconnectAttempts, lastStatus]);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return { notifications, dismissNotification };
}
