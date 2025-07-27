import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConnectionStatus, useConnectionNotifications } from "../../app/components/ConnectionStatus";
import type { ConnectionState } from "../../app/components/useWebSocketConnection";

const mockConnectionState: ConnectionState = {
  status: "disconnected",
  reconnectAttempt: 0,
  maxReconnectAttempts: 5,
};

describe("ConnectionStatus", () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render connected state correctly", () => {
    const connectionState: ConnectionState = {
      ...mockConnectionState,
      status: "connected",
      lastConnected: new Date(),
    };

    render(
      <ConnectionStatus
        connectionState={connectionState}
        compact={true}
      />
    );

    // In compact mode when connected, only icon should be visible
    const wifiIcon = screen.getByTitle("Conectado");
    expect(wifiIcon).toBeInTheDocument();
  });

  it("should render connecting state correctly", () => {
    const connectionState: ConnectionState = {
      ...mockConnectionState,
      status: "connecting",
    };

    render(
      <ConnectionStatus
        connectionState={connectionState}
        compact={true}
      />
    );

    expect(screen.getByText("Conectando...")).toBeInTheDocument();
  });

  it("should render reconnecting state with attempt counter", () => {
    const connectionState: ConnectionState = {
      ...mockConnectionState,
      status: "reconnecting",
      reconnectAttempt: 2,
      maxReconnectAttempts: 5,
    };

    render(
      <ConnectionStatus
        connectionState={connectionState}
        compact={false}
      />
    );

    expect(screen.getByText("Reconectando... (2/5)")).toBeInTheDocument();
    expect(screen.getByText("Tentativa 2 de 5")).toBeInTheDocument();
  });

  it("should render failed state with retry button", () => {
    const onRetry = vi.fn();
    const connectionState: ConnectionState = {
      ...mockConnectionState,
      status: "failed",
      error: "Falha na conexão após 5 tentativas",
    };

    render(
      <ConnectionStatus
        connectionState={connectionState}
        onRetry={onRetry}
        compact={false}
      />
    );

    expect(screen.getByText("Falha na conexão")).toBeInTheDocument();
    expect(screen.getByText("Falha na conexão após 5 tentativas")).toBeInTheDocument();
    
    const retryButton = screen.getByText("Tentar novamente");
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("should show error message when provided", () => {
    const connectionState: ConnectionState = {
      ...mockConnectionState,
      status: "disconnected",
      error: "Network error occurred",
    };

    render(
      <ConnectionStatus
        connectionState={connectionState}
        compact={false}
      />
    );

    expect(screen.getByText("Network error occurred")).toBeInTheDocument();
  });

  it("should show progress bar during reconnection", () => {
    const connectionState: ConnectionState = {
      ...mockConnectionState,
      status: "reconnecting",
      reconnectAttempt: 3,
      maxReconnectAttempts: 5,
    };

    render(
      <ConnectionStatus
        connectionState={connectionState}
        compact={false}
      />
    );

    // Check progress bar exists
    const progressBar = screen.getByRole("progressbar") || 
                       document.querySelector('.bg-yellow-500');
    expect(progressBar).toBeInTheDocument();
  });

  it("should disable retry button when connecting", () => {
    const onRetry = vi.fn();
    const connectionState: ConnectionState = {
      ...mockConnectionState,
      status: "connecting",
    };

    render(
      <ConnectionStatus
        connectionState={connectionState}
        onRetry={onRetry}
        compact={false}
      />
    );

    const retryButton = screen.getByText("Conectando...");
    expect(retryButton).toBeDisabled();
  });

  it("should auto-hide connected state after delay", async () => {
    const connectionState: ConnectionState = {
      ...mockConnectionState,
      status: "connected",
      lastConnected: new Date(),
    };

    render(
      <ConnectionStatus
        connectionState={connectionState}
        compact={false}
      />
    );

    // Initially visible
    expect(screen.getByText("Conectado")).toBeInTheDocument();

    // After 3 seconds, should be hidden
    vi.advanceTimersByTime(3000);
    
    await waitFor(() => {
      expect(screen.queryByText("Conectado")).not.toBeInTheDocument();
    });
  });

  it("should show last connected time", () => {
    const lastConnected = new Date("2023-12-01T10:30:00Z");
    const connectionState: ConnectionState = {
      ...mockConnectionState,
      status: "connected",
      lastConnected,
    };

    render(
      <ConnectionStatus
        connectionState={connectionState}
        compact={false}
      />
    );

    expect(screen.getByText(/Última conexão:/)).toBeInTheDocument();
  });
});

describe("useConnectionNotifications", () => {
  function TestComponent({ connectionState }: { connectionState: ConnectionState }) {
    const { notifications, dismissNotification } = useConnectionNotifications(connectionState);
    
    return (
      <div>
        {notifications.map(notification => (
          <div key={notification.id} data-testid={`notification-${notification.type}`}>
            <span>{notification.message}</span>
            <button onClick={() => dismissNotification(notification.id)}>
              Dismiss
            </button>
          </div>
        ))}
      </div>
    );
  }

  it("should create success notification on reconnection", async () => {
    let connectionState: ConnectionState = {
      ...mockConnectionState,
      status: "reconnecting",
      reconnectAttempt: 1,
    };

    const { rerender } = render(<TestComponent connectionState={connectionState} />);

    // Change to connected
    connectionState = {
      ...connectionState,
      status: "connected",
      lastConnected: new Date(),
    };

    rerender(<TestComponent connectionState={connectionState} />);

    await waitFor(() => {
      expect(screen.getByText("Reconectado com sucesso!")).toBeInTheDocument();
    });
  });

  it("should create error notification on failure", async () => {
    let connectionState: ConnectionState = {
      ...mockConnectionState,
      status: "reconnecting",
      reconnectAttempt: 3,
      maxReconnectAttempts: 5,
    };

    const { rerender } = render(<TestComponent connectionState={connectionState} />);

    // Change to failed
    connectionState = {
      ...connectionState,
      status: "failed",
      reconnectAttempt: 5,
    };

    rerender(<TestComponent connectionState={connectionState} />);

    await waitFor(() => {
      expect(screen.getByText("Falha na conexão após 5 tentativas")).toBeInTheDocument();
    });
  });

  it("should create warning notification on first reconnect attempt", async () => {
    let connectionState: ConnectionState = {
      ...mockConnectionState,
      status: "connected",
    };

    const { rerender } = render(<TestComponent connectionState={connectionState} />);

    // Change to reconnecting
    connectionState = {
      ...connectionState,
      status: "reconnecting",
      reconnectAttempt: 1,
    };

    rerender(<TestComponent connectionState={connectionState} />);

    await waitFor(() => {
      expect(screen.getByText("Conexão perdida, tentando reconectar...")).toBeInTheDocument();
    });
  });

  it("should allow dismissing notifications", async () => {
    let connectionState: ConnectionState = {
      ...mockConnectionState,
      status: "reconnecting",
      reconnectAttempt: 1,
    };

    const { rerender } = render(<TestComponent connectionState={connectionState} />);

    // Change to failed
    connectionState = {
      ...connectionState,
      status: "failed",
      reconnectAttempt: 5,
    };

    rerender(<TestComponent connectionState={connectionState} />);

    await waitFor(() => {
      expect(screen.getByText("Falha na conexão após 5 tentativas")).toBeInTheDocument();
    });

    // Dismiss notification
    fireEvent.click(screen.getByText("Dismiss"));

    await waitFor(() => {
      expect(screen.queryByText("Falha na conexão após 5 tentativas")).not.toBeInTheDocument();
    });
  });
});
