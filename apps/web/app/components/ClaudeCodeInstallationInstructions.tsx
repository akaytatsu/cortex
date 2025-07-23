import React, { useState } from "react";

interface ClaudeCodeInstallationInstructionsProps {
  onDismiss?: () => void;
  className?: string;
  show?: boolean;
}

export function ClaudeCodeInstallationInstructions({
  onDismiss,
  className = "",
  show = true,
}: ClaudeCodeInstallationInstructionsProps) {
  const [isDismissed, setIsDismissed] = useState(!show);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div
      className={`bg-yellow-50 border-l-4 border-yellow-400 p-4 ${className}`}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-yellow-400 text-lg">⚠️</span>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-800 font-medium">
            Claude Code CLI not found
          </p>
          <div className="mt-2 text-sm text-yellow-700">
            <p className="mb-2">
              To enable AI-powered coding assistance, please install the Claude
              Code CLI:
            </p>
            <ol className="list-decimal list-inside space-y-1 mb-3">
              <li>
                Visit the{" "}
                <a
                  href="https://docs.anthropic.com/en/docs/claude-code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-600 underline hover:text-yellow-800"
                >
                  official Claude Code documentation
                </a>
              </li>
              <li>
                Follow the installation instructions for your operating system
              </li>
              <li>
                Ensure the{" "}
                <code className="bg-yellow-100 px-1 rounded">claude</code>{" "}
                command is available in your PATH
              </li>
              <li>Restart the terminal to detect the CLI</li>
            </ol>
            <p className="text-xs text-yellow-600">
              The Claude Code CLI requires proper authentication and may not be
              available in all environments.
            </p>
          </div>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="bg-yellow-100 rounded-md p-1.5 inline-flex items-center justify-center text-yellow-400 hover:bg-yellow-200 hover:text-yellow-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-yellow-500"
            title="Dismiss this message"
          >
            <span className="sr-only">Dismiss</span>
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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

export default ClaudeCodeInstallationInstructions;
