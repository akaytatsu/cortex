import React from 'react';
import type { TerminalSession } from 'shared-types';

interface CliStatusIndicatorProps {
  session: TerminalSession | null;
  className?: string;
}

interface CliStatus {
  icon: string;
  color: string;
  text: string;
  title: string;
}

const getCliStatusConfig = (
  status?: TerminalSession['claudeCodeCliStatus'],
  version?: string
): CliStatus => {
  switch (status) {
    case 'available':
      return {
        icon: '🤖',
        color: 'text-green-400',
        text: version ? `Claude CLI v${version}` : 'Claude CLI Available',
        title: `Claude Code CLI is available${version ? ` (version ${version})` : ''}`
      };
    case 'not-available':
      return {
        icon: '⚠️',
        color: 'text-yellow-400',
        text: 'Claude CLI Not Found',
        title: 'Claude Code CLI is not available in PATH'
      };
    case 'error':
      return {
        icon: '❌',
        color: 'text-red-400',
        text: 'CLI Detection Error',
        title: 'Failed to detect Claude Code CLI status'
      };
    case 'checking':
      return {
        icon: '🔍',
        color: 'text-blue-400',
        text: 'Checking CLI...',
        title: 'Checking Claude Code CLI availability'
      };
    default:
      return {
        icon: '❓',
        color: 'text-gray-400',
        text: 'CLI Status Unknown',
        title: 'Claude Code CLI status unknown'
      };
  }
};

export function CliStatusIndicator({ session, className = '' }: CliStatusIndicatorProps) {
  const statusConfig = getCliStatusConfig(
    session?.claudeCodeCliStatus,
    session?.claudeCodeCliVersion
  );

  return (
    <div 
      className={`flex items-center space-x-1 ${className}`}
      title={statusConfig.title}
    >
      <span className="text-xs">{statusConfig.icon}</span>
      <span className={`text-xs ${statusConfig.color}`}>
        {statusConfig.text}
      </span>
    </div>
  );
}

export default CliStatusIndicator;