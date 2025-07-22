import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import type { TerminalMessage } from "shared-types";

interface TerminalProps {
  workspaceName: string;
  workspacePath: string;
  onClose?: () => void;
}

export function Terminal({ workspaceName, workspacePath, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId] = useState(() => `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new XTerm({
      theme: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        cursor: '#ffffff',
        cursorAccent: '#1a1a1a',
        selection: '#3a3a3a',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#bfbfbf',
        brightBlack: '#4d4d4d',
        brightRed: '#ff6e67',
        brightGreen: '#5af78e',
        brightYellow: '#f4f99d',
        brightBlue: '#caa9fa',
        brightMagenta: '#ff92d0',
        brightCyan: '#9aedfe',
        brightWhite: '#e6e6e6',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    
    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const ws = new WebSocket(`ws://${window.location.host}/ws/terminal`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      const initMessage: TerminalMessage = {
        type: 'input',
        data: JSON.stringify({ 
          action: 'init', 
          sessionId, 
          workspaceName, 
          workspacePath 
        }),
        sessionId
      };
      ws.send(JSON.stringify(initMessage));
    };

    ws.onmessage = (event) => {
      try {
        const message: TerminalMessage = JSON.parse(event.data);
        if (message.sessionId === sessionId) {
          if (message.type === 'output' || message.type === 'error') {
            terminal.write(message.data);
          } else if (message.type === 'exit') {
            terminal.write('\r\n\x1b[31mTerminal session ended\x1b[0m\r\n');
            setIsConnected(false);
          }
        }
      } catch (error) {
        console.error('Error parsing terminal message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      terminal.write('\r\n\x1b[33mConnection closed\x1b[0m\r\n');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      terminal.write('\r\n\x1b[31mConnection error\x1b[0m\r\n');
      setIsConnected(false);
    };

    terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        const message: TerminalMessage = {
          type: 'input',
          data,
          sessionId
        };
        ws.send(JSON.stringify(message));
      }
    });

    const handleResize = () => {
      if (fitAddon) {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          const message: TerminalMessage = {
            type: 'input',
            data: JSON.stringify({
              action: 'resize',
              cols: terminal.cols,
              rows: terminal.rows
            }),
            sessionId
          };
          ws.send(JSON.stringify(message));
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ws.readyState === WebSocket.OPEN) {
        const message: TerminalMessage = {
          type: 'input',
          data: JSON.stringify({ action: 'close' }),
          sessionId
        };
        ws.send(JSON.stringify(message));
        ws.close();
      }
      terminal.dispose();
    };
  }, [workspaceName, workspacePath, sessionId]);

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
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} 
               title={isConnected ? 'Connected' : 'Disconnected'} />
          <span className="text-xs text-gray-400">
            {workspaceName} ({workspacePath})
          </span>
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
      <div className="flex-1 overflow-hidden">
        <div ref={terminalRef} className="w-full h-full p-2" />
      </div>
    </div>
  );
}