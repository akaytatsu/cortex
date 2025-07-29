import { RotateCcw } from "lucide-react";

interface PullToRefreshIndicatorProps {
  progress: number;
  isRefreshing: boolean;
  canTrigger: boolean;
  className?: string;
}

export function PullToRefreshIndicator({
  progress,
  isRefreshing,
  canTrigger,
  className = "",
}: PullToRefreshIndicatorProps) {
  const opacity = Math.min(1, progress * 2); // Fade in faster
  const scale = Math.min(1, progress * 1.2);
  const rotation = isRefreshing ? 360 : progress * 180;

  if (progress === 0 && !isRefreshing) {
    return null;
  }

  return (
    <div
      className={`
        flex items-center justify-center py-4 transition-all duration-200
        ${className}
      `}
      style={{
        opacity,
      }}
    >
      <div
        className={`
          flex items-center justify-center w-8 h-8 rounded-full
          transition-all duration-200 transform
          ${canTrigger || isRefreshing 
            ? "bg-primary-500 text-white" 
            : "bg-surface-secondary text-text-secondary"
          }
          ${isRefreshing ? "animate-spin" : ""}
        `}
        style={{
          transform: `scale(${scale}) rotate(${rotation}deg)`,
        }}
      >
        <RotateCcw 
          size={16} 
          className={`
            transition-all duration-200
            ${isRefreshing ? "animate-spin" : ""}
          `}
        />
      </div>
      
      {/* Progress Text */}
      <div className="ml-3 text-sm font-medium">
        {isRefreshing ? (
          <span className="text-primary-600">Atualizando...</span>
        ) : canTrigger ? (
          <span className="text-primary-600">Solte para atualizar</span>
        ) : (
          <span className="text-text-secondary">Puxe para atualizar</span>
        )}
      </div>
    </div>
  );
}