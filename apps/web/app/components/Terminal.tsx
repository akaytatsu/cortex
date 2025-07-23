import { useEffect, useRef, useState } from "react";
import type {
  TerminalMessage,
  TerminalSession,
  CliStatusMessage,
} from "shared-types";
import { CliStatusIndicator } from "./CliStatusIndicator";
import { ClaudeCodeInstallationInstructions } from "./ClaudeCodeInstallationInstructions";

// Dynamic imports for xterm to avoid SSR issues
let XTerm: typeof import("@xterm/xterm").Terminal | null = null;
let FitAddon: typeof import("@xterm/addon-fit").FitAddon | null = null;
let WebLinksAddon:
  | typeof import("@xterm/addon-web-links").WebLinksAddon
  | null = null;

// StrictMode has been disabled to prevent double connections

interface TerminalProps {
  workspaceName: string;
  workspacePath: string;
  onClose?: () => void;
}

export function Terminal({
  workspaceName,
  workspacePath,
  onClose,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const sessionIdRef = useRef(
    `terminal_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [terminalSession, setTerminalSession] =
    useState<TerminalSession | null>(null);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const isInitializingRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

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
      } catch (error) {
        console.warn(
          "[Terminal] Failed to get dynamic port, using default 8000:",
          error
        );
      }

      const terminal = new XTerm({
        theme: {
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
        fontFamily:
          '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace',
        fontSize: 13,
        lineHeight: 1.2,
        cursorBlink: true,
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);

      if (!terminalRef.current) return;

      terminal.open(terminalRef.current);
      fitAddon.fit();

      xtermRef.current = terminal;
      fitAddonRef.current = fitAddon;

      const wsUrl = `ws://localhost:${terminalPort}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;

        const initMessage: TerminalMessage = {
          type: "input",
          data: JSON.stringify({
            action: "init",
            sessionId: sessionIdRef.current,
            workspaceName,
            workspacePath,
          }),
          sessionId: sessionIdRef.current,
        };

        console.log("[Terminal] Sending init message:", initMessage);
        ws.send(JSON.stringify(initMessage));
      };

      ws.onmessage = event => {
        try {
          const message: TerminalMessage = JSON.parse(event.data);
          if (message.sessionId === sessionIdRef.current) {
            if (message.type === "output" || message.type === "error") {
              terminal.write(message.data);
            } else if (message.type === "exit") {
              terminal.write("\r\n\x1b[31mTerminal session ended\x1b[0m\r\n");
              setIsConnected(false);
            } else if (message.type === "cli-status") {
              // Handle CLI status updates
              try {
                const cliData = JSON.parse(message.data);
                setTerminalSession(prevSession => ({
                  ...prevSession,
                  id: sessionIdRef.current,
                  workspaceName,
                  workspacePath,
                  userId: "current-user", // This should come from session context
                  status: "active" as const,
                  createdAt: new Date(),
                  claudeCodeCliStatus: cliData.status,
                  claudeCodeCliVersion: cliData.version,
                }));

                // Show install instructions if CLI is not available
                setShowInstallInstructions(cliData.status === "not-available");
              } catch (cliError) {
                console.error("Error parsing CLI status data:", cliError);
              }
            }
          }
        } catch (error) {
          console.error("Error parsing terminal message:", error);
        }
      };

      ws.onclose = event => {
        setIsConnected(false);

        // Don't reconnect if:
        // - Normal close (1000)
        // - Session already exists (1002)
        // - Max reconnect attempts reached
        if (
          event.code !== 1000 &&
          event.code !== 1002 &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          const errorMsg = `Connection closed (code: ${event.code}). Reconnecting...`;
          setConnectionError(errorMsg);
          terminal.write(`\r\n\x1b[33m${errorMsg}\x1b[0m\r\n`);

          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(
              `[Terminal] Reconnect attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`
            );
            // Don't trigger re-render, just show message
          }, 2000 * reconnectAttemptsRef.current);
        } else {
          terminal.write("\r\n\x1b[33mConnection closed\x1b[0m\r\n");
          if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            const errorMsg = "Failed to reconnect after multiple attempts";
            setConnectionError(errorMsg);
            terminal.write(`\r\n\x1b[31m${errorMsg}\x1b[0m\r\n`);
          }
        }
      };

      ws.onerror = error => {
        console.error("[Terminal] WebSocket error:", error);
        const errorMsg = "WebSocket connection failed";
        setConnectionError(errorMsg);
        terminal.write(`\r\n\x1b[31m${errorMsg}\x1b[0m\r\n`);
        setIsConnected(false);
      };

      terminal.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          const message: TerminalMessage = {
            type: "input",
            data,
            sessionId: sessionIdRef.current,
          };
          ws.send(JSON.stringify(message));
        }
      });

      const handleResize = () => {
        if (fitAddon) {
          fitAddon.fit();
          if (ws.readyState === WebSocket.OPEN) {
            const message: TerminalMessage = {
              type: "input",
              data: JSON.stringify({
                action: "resize",
                cols: terminal.cols,
                rows: terminal.rows,
              }),
              sessionId: sessionIdRef.current,
            };
            ws.send(JSON.stringify(message));
          }
        }
      };

      window.addEventListener("resize", handleResize);
    };

    initializeTerminal().catch(console.error);

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
          sessionId: sessionIdRef.current,
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
    };
  }, [workspaceName, workspacePath]);

  const handleFitTerminal = () => {
    if (fitAddonRef.current) {
      fitAddonRef.current.fit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-600">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-200">Terminal</h3>
          <div
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}
            title={isConnected ? "Connected" : "Disconnected"}
          />
          <span className="text-xs text-gray-400">
            {workspaceName} ({workspacePath})
          </span>
          <CliStatusIndicator session={terminalSession} />
          {connectionError && (
            <span className="text-xs text-red-400" title={connectionError}>
              ⚠ {connectionError}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleFitTerminal}
            className="text-gray-400 hover:text-gray-200 text-xs px-2 py-1 hover:bg-gray-700 rounded"
            title="Fit terminal"
          >
            ⟷
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 text-sm hover:bg-gray-700 rounded px-1"
              title="Close terminal"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Claude Code CLI Installation Instructions */}
      {showInstallInstructions && (
        <ClaudeCodeInstallationInstructions
          onDismiss={() => setShowInstallInstructions(false)}
          className="mx-2 mt-2"
        />
      )}

      <div className="flex-1 overflow-hidden">
        <div ref={terminalRef} className="w-full h-full p-2" />
      </div>
    </div>
  );
}
