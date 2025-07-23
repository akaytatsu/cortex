import { Loader2, AlertCircle, CheckCircle, MessageSquare } from "lucide-react";

interface StatusIndicatorProps {
  status: "idle" | "thinking" | "error" | "active";
  message?: string;
}

export function StatusIndicator({ status, message }: StatusIndicatorProps) {
  const getStatusContent = () => {
    switch (status) {
      case "thinking":
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          text: message || "Claude está pensando...",
          className: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-3 h-3" />,
          text: message || "Erro na comunicação",
          className: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
        };
      case "active":
        return {
          icon: <MessageSquare className="w-3 h-3" />,
          text: message || "Conversando com Claude",
          className: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
        };
      case "idle":
      default:
        return {
          icon: <CheckCircle className="w-3 h-3" />,
          text: message || "Pronto para conversar",
          className: "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800",
        };
    }
  };

  const { icon, text, className } = getStatusContent();

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${className}`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}