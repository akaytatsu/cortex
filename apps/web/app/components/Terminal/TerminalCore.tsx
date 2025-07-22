import { useEffect, useRef, useState, useCallback } from "react";
import { Maximize2, RotateCcw, History } from "lucide-react";
import { Button } from "../ui/Button";
import { CommandHistory } from "./CommandHistory";
import type { TerminalMessage } from "shared-types";

// Dynamic imports for xterm to avoid SSR issues
let XTerm: typeof import("@xterm/xterm").Terminal | null = null;
let FitAddon: typeof import("@xterm/addon-fit").FitAddon | null = null;
let WebLinksAddon:
  | typeof import("@xterm/addon-web-links").WebLinksAddon
  | null = null;

interface TerminalCoreProps {
  sessionId: string;
  workspaceName: string;
  workspacePath: string;
  theme?: 'dark' | 'light' | 'custom';
  customTheme?: Record<string, string>;
  onConnectionChange?: (isConnected: boolean) => void;
  onTitleChange?: (title: string) => void;
}

const themes = {
  dark: {
    background: "#1a1a1a",
    foreground: "#ffffff",
    cursor: "#ffffff",
    cursorAccent: "#1a1a1a",
    selectionBackground: "#3a3a3a",
    black: "#000000",
    red: "#ff5555",
    green: "#50fa7b",
    yellow: "#f1fa8c",
    blue: "#bd93f9",
    magenta: "#ff79c6",
    cyan: "#8be9fd",
    white: "#bfbfbf",
    brightBlack: "#4d4d4d",
    brightRed: "#ff6e67",
    brightGreen: "#5af78e",
    brightYellow: "#f4f99d",
    brightBlue: "#caa9fa",
    brightMagenta: "#ff92d0",
    brightCyan: "#9aedfe",
    brightWhite: "#e6e6e6",
  },
  light: {
    background: "#ffffff",
    foreground: "#333333",
    cursor: "#333333",
    cursorAccent: "#ffffff",
    selectionBackground: "#d4d4d4",
    black: "#000000",
    red: "#cd3131",
    green: "#00bc00",
    yellow: "#949800",
    blue: "#0451a5",
    magenta: "#bc05bc",
    cyan: "#0598bc",
    white: "#555555",
    brightBlack: "#666666",
    brightRed: "#cd3131",
    brightGreen: "#14ce14",
    brightYellow: "#b5ba00",
    brightBlue: "#0451a5",
    brightMagenta: "#bc05bc",
    brightCyan: "#0598bc",
    brightWhite: "#a5a5a5",
  },
};

export function TerminalCore({
  sessionId,
  workspaceName,
  workspacePath,
  theme = 'dark',
  customTheme,
  onConnectionChange,
  onTitleChange,
}: TerminalCoreProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentCommand, setCurrentCommand] = useState("");
  const isInitializingRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  useEffect(() => {
    const newConnectionState = isConnected;
    onConnectionChange?.(newConnectionState);
  }, [isConnected, onConnectionChange]);

  // Track current command being typed
  const trackCommandInput = useCallback((data: string) => {
    if (data === '\r') {
      // Command was executed, add to history
      if (currentCommand.trim()) {
        const historyItem = {
          command: currentCommand.trim(),
          timestamp: new Date(),
          workspaceName,
        };
        const existingHistory = localStorage.getItem(`terminal-history-${workspaceName}`);
        const history = existingHistory ? JSON.parse(existingHistory) : [];
        const updatedHistory = [historyItem, ...history.filter((item: unknown) => {
          const histItem = item as { command: string };
          return histItem.command !== historyItem.command;
        })].slice(0, 100);
        localStorage.setItem(`terminal-history-${workspaceName}`, JSON.stringify(updatedHistory));
      }
      setCurrentCommand("");
    } else if (data === '\x7f' || data === '\b') {
      // Backspace
      setCurrentCommand(prev => prev.slice(0, -1));
    } else if (data.charCodeAt(0) >= 32) {
      // Printable character
      setCurrentCommand(prev => prev + data);
    }
  }, [currentCommand, workspaceName]);

  const handleSelectCommand = useCallback((command: string) => {
    if (xtermRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      // Clear current line and type the selected command
      xtermRef.current.write('\r\x1b[K');
      xtermRef.current.write(command);
      setCurrentCommand(command);
    }
  }, []);

  const toggleHistory = useCallback(() => {
    setShowHistory(prev => !prev);
  }, []);

  useEffect(() => {
    if (
      !terminalRef.current ||
      typeof window === "undefined" ||
      isInitialized ||
      wsRef.current ||
      isInitializingRef.current
    )
      return;

    const initializeTerminal = async () => {
      isInitializingRef.current = true;
      setIsInitialized(true);

      // Dynamic imports to avoid SSR issues
      if (!XTerm) {
        const xtermModule = await import("@xterm/xterm");
        XTerm = xtermModule.Terminal;
      }
      if (!FitAddon) {
        const fitModule = await import("@xterm/addon-fit");
        FitAddon = fitModule.FitAddon;
      }
      if (!WebLinksAddon) {
        const webLinksModule = await import("@xterm/addon-web-links");
        WebLinksAddon = webLinksModule.WebLinksAddon;
      }

      // Get the terminal WebSocket port dynamically
      let terminalPort = 8000;
      try {
        const portResponse = await fetch("/api/terminal-port");
        const portData = await portResponse.json();
        terminalPort = portData.port;
        console.log(`[Terminal] Got WebSocket port: ${terminalPort}`);
      } catch (error) {
        console.warn(
          "[Terminal] Failed to get dynamic port, using default 8000:",
          error
        );
      }

      const selectedTheme = customTheme || themes[theme];

      const terminal = new XTerm({
        theme: selectedTheme,
        cursorBlink: true,
        fontSize: 13,
        fontFamily: '"JetBrains Mono", "Fira Code", Consolas, "Liberation Mono", Menlo, Courier, monospace',
        lineHeight: 1.2,
        allowTransparency: theme === 'dark',
        scrollback: 10000,
      });

      if (FitAddon) {
        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        fitAddonRef.current = fitAddon;
      }

      if (WebLinksAddon) {
        const webLinksAddon = new WebLinksAddon();
        terminal.loadAddon(webLinksAddon);
      }

      terminal.open(terminalRef.current!);
      xtermRef.current = terminal;

      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }

      // Listen for title changes
      terminal.onTitleChange((title) => {
        onTitleChange?.(title || `Terminal ${sessionId.slice(-4)}`);
      });

      // WebSocket connection
      const connectWebSocket = () => {
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const wsUrl = `${protocol}://${window.location.hostname}:${terminalPort}/terminal`;

        console.log(`[Terminal] Connecting to WebSocket: ${wsUrl}`);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log(`[Terminal] Connected to terminal WebSocket for session ${sessionId}`);
          setIsConnected(true);
          setConnectionError(null);
          reconnectAttemptsRef.current = 0;

          // Send workspace setup
          const initMessage: TerminalMessage = {
            type: "input",
            data: JSON.stringify({
              action: "setup",
              workspaceName,
              workspacePath,
            }),
            sessionId,
          };
          ws.send(JSON.stringify(initMessage));

          // Send initial resize
          if (fitAddonRef.current) {
            setTimeout(() => {
              if (fitAddonRef.current && ws.readyState === WebSocket.OPEN) {
                fitAddonRef.current.fit();
                const resizeMessage: TerminalMessage = {
                  type: "input",
                  data: JSON.stringify({
                    action: "resize",
                    cols: terminal.cols,
                    rows: terminal.rows,
                  }),
                  sessionId,
                };
                ws.send(JSON.stringify(resizeMessage));
              }
            }, 100);
          }
        };

        ws.onmessage = event => {
          try {
            const message = JSON.parse(event.data) as TerminalMessage;
            if (message.sessionId === sessionId && message.type === "output") {
              terminal.write(message.data);
            }
          } catch (error) {
            console.error("[Terminal] Error parsing message:", error);
          }
        };

        ws.onclose = () => {
          console.log(`[Terminal] WebSocket closed for session ${sessionId}`);
          setIsConnected(false);

          // Attempt to reconnect
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            console.log(
              `[Terminal] Reconnecting... Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`
            );
            reconnectTimeoutRef.current = setTimeout(() => {
              connectWebSocket();
            }, 2000);
          } else {
            const errorMsg = "Failed to reconnect after multiple attempts";
            setConnectionError(errorMsg);
            terminal.write(`\r\n\x1b[31m${errorMsg}\x1b[0m\r\n`);
          }
        };

        ws.onerror = error => {
          console.error("[Terminal] WebSocket error:", error);
          const errorMsg = "WebSocket connection failed";
          setConnectionError(errorMsg);
          terminal.write(`\r\n\x1b[31m${errorMsg}\x1b[0m\r\n`);
          setIsConnected(false);
        };
      };

      connectWebSocket();

      terminal.onData((data: string) => {
        // Track command input for history
        trackCommandInput(data);
        
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const message: TerminalMessage = {
            type: "input",
            data,
            sessionId,
          };
          wsRef.current.send(JSON.stringify(message));
        }
      });

      const handleResize = () => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit();
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const message: TerminalMessage = {
              type: "input",
              data: JSON.stringify({
                action: "resize",
                cols: terminal.cols,
                rows: terminal.rows,
              }),
              sessionId,
            };
            wsRef.current.send(JSON.stringify(message));
          }
        }
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    };

    const cleanup = initializeTerminal().catch(console.error);

    return () => {
      // Clear any pending reconnection timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const message: TerminalMessage = {
          type: "input",
          data: JSON.stringify({ action: "close" }),
          sessionId,
        };
        wsRef.current.send(JSON.stringify(message));
        wsRef.current.close();
      }

      // Reset refs and state
      wsRef.current = null;
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
      fitAddonRef.current = null;
      isInitializingRef.current = false;
      setIsInitialized(false);
      setIsConnected(false);
      setConnectionError(null);

      if (cleanup instanceof Promise) {
        cleanup.then(cleanupFn => cleanupFn?.());
      } else if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [sessionId, workspaceName, workspacePath, theme, customTheme, onConnectionChange, onTitleChange, trackCommandInput, isInitialized]);

  const handleFitTerminal = () => {
    if (fitAddonRef.current) {
      fitAddonRef.current.fit();
    }
  };

  const handleReconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    reconnectAttemptsRef.current = 0;
    setConnectionError(null);
  };

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Terminal Controls */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-800 border-b border-gray-600">
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <span>{workspaceName}</span>
          <span className="text-gray-600">•</span>
          <span className="truncate max-w-32" title={workspacePath}>
            {workspacePath}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {connectionError && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReconnect}
              className="h-6 px-2 text-xs text-red-400 hover:text-red-300"
              title="Reconnect"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleHistory}
            className={`h-6 px-2 text-xs transition-colors ${
              showHistory
                ? "text-blue-400 hover:text-blue-300"
                : "text-gray-400 hover:text-gray-200"
            }`}
            title="Command history"
          >
            <History className="w-3 h-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-6 px-2 text-xs text-gray-400 hover:text-gray-200"
            title="Clear terminal"
          >
            Clear
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFitTerminal}
            className="h-6 px-2 text-xs text-gray-400 hover:text-gray-200"
            title="Fit terminal"
          >
            <Maximize2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden relative">
        <div ref={terminalRef} className="w-full h-full p-2" />
        
        {/* Command History */}
        <CommandHistory
          isVisible={showHistory}
          onClose={() => setShowHistory(false)}
          onSelectCommand={handleSelectCommand}
          workspaceName={workspaceName}
        />
        
        {/* Connection Status Overlay */}
        {!isConnected && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 mb-2">
                {connectionError ? "Connection Error" : "Connecting..."}
              </div>
              {connectionError && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReconnect}
                  className="text-xs"
                >
                  Retry Connection
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}