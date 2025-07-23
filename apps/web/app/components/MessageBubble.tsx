import type { ClaudeCodeMessage } from "shared-types";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageBubbleProps {
  message: ClaudeCodeMessage;
}

// Custom components for markdown rendering
const MarkdownComponents = {
  code: ({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const isCodeBlock = !inline && match;
    
    if (isCodeBlock) {
      return (
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 my-2 overflow-x-auto text-sm">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    }
    
    return (
      <code className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1 py-0.5 rounded text-sm" {...props}>
        {children}
      </code>
    );
  },
  p: ({ children }: any) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="text-sm">{children}</li>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-2 italic text-gray-700 dark:text-gray-300">
      {children}
    </blockquote>
  ),
  h1: ({ children }: any) => (
    <h1 className="text-lg font-bold mb-2">{children}</h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-base font-bold mb-2">{children}</h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-sm font-bold mb-2">{children}</h3>
  ),
  a: ({ children, href }: any) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {children}
    </a>
  ),
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === "user";
  const isAssistant = message.type === "assistant";

  const getStatusIcon = () => {
    if (!message.status) return null;
    
    switch (message.status) {
      case "sending":
        return <Clock className="w-3 h-3 text-gray-400 animate-pulse" />;
      case "sent":
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case "error":
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  };

  if (isUser) {
    return (
      <div className="flex flex-col items-end space-y-1 mb-4">
        <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
          <div className="text-sm leading-relaxed break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-xs text-gray-400 px-1">
          <span>{formatTime(message.timestamp)}</span>
          {getStatusIcon()}
        </div>
      </div>
    );
  }

  if (isAssistant) {
    return (
      <div className="flex flex-col items-start space-y-1 mb-4">
        <div className="max-w-[85%] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
          <div className="text-sm leading-relaxed text-gray-900 dark:text-gray-100 break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-xs text-gray-400 px-1">
          <span>Claude Code</span>
          <span>•</span>
          <span>{formatTime(message.timestamp)}</span>
        </div>
      </div>
    );
  }

  return null;
}