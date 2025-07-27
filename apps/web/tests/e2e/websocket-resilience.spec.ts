import { test, expect, Page } from "@playwright/test";

// Mock WebSocket server for testing
class MockWebSocketServer {
  private connections: Set<WebSocket> = new Set();
  private isOnline = true;

  constructor(private port: number) {}

  start() {
    // In a real test environment, you would start a mock WebSocket server here
    // For this example, we'll use page.route to intercept WebSocket connections
  }

  goOffline() {
    this.isOnline = false;
    // Simulate server going offline
    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1006, "Server offline");
      }
    });
  }

  goOnline() {
    this.isOnline = true;
  }

  isServerOnline() {
    return this.isOnline;
  }
}

test.describe("WebSocket Connection Resilience", () => {
  let mockServer: MockWebSocketServer;

  test.beforeEach(async ({ page }) => {
    mockServer = new MockWebSocketServer(8000);
    
    // Intercept WebSocket connections for testing
    await page.route("ws://localhost:8000/**", async route => {
      if (mockServer.isServerOnline()) {
        // Let the connection proceed normally
        await route.continue();
      } else {
        // Reject the connection
        await route.abort("failed");
      }
    });
  });

  test("should detect connection loss and attempt reconnection", async ({ page }) => {
    // Navigate to a page that uses the WebSocket connection
    await page.goto("/chat"); // Assuming there's a chat page that uses WebSocket

    // Wait for initial connection
    await expect(page.getByTestId("connection-status")).toContainText("Conectado");

    // Simulate server going offline
    await page.evaluate(() => {
      // Force close the WebSocket connection to simulate network failure
      const ws = (window as any).mockWebSocket;
      if (ws) {
        ws.close(1006, "Network error");
      }
    });

    // Should show reconnecting status
    await expect(page.getByTestId("connection-status")).toContainText("Reconectando");
    
    // Should show reconnection attempt counter
    await expect(page.getByTestId("connection-status")).toContainText("tentativa 1");
  });

  test("should preserve session ID during reconnection", async ({ page }) => {
    await page.goto("/chat");

    // Wait for initial connection and capture session ID
    await expect(page.getByTestId("connection-status")).toContainText("Conectado");
    
    const initialSessionId = await page.evaluate(() => {
      return (window as any).currentSessionId;
    });

    // Simulate connection loss
    await page.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      if (ws) {
        ws.close(1006, "Network error");
      }
    });

    // Wait for reconnection
    await expect(page.getByTestId("connection-status")).toContainText("Reconectando");
    
    // Allow reconnection to succeed
    mockServer.goOnline();
    
    await expect(page.getByTestId("connection-status")).toContainText("Conectado");

    // Verify session ID is preserved
    const reconnectedSessionId = await page.evaluate(() => {
      return (window as any).currentSessionId;
    });

    expect(reconnectedSessionId).toBe(initialSessionId);
  });

  test("should implement exponential backoff strategy", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByTestId("connection-status")).toContainText("Conectado");

    // Keep server offline to force multiple reconnection attempts
    mockServer.goOffline();

    // Track reconnection timing
    const reconnectTimes: number[] = [];
    
    await page.evaluate(() => {
      const originalWebSocket = window.WebSocket;
      let attemptCount = 0;
      
      window.WebSocket = class extends originalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          attemptCount++;
          (window as any).reconnectAttempt = attemptCount;
          (window as any).reconnectTime = Date.now();
          super(url, protocols);
        }
      };
    });

    // Force initial disconnect
    await page.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      if (ws) {
        ws.close(1006, "Network error");
      }
    });

    // Wait for first reconnection attempt
    await expect(page.getByTestId("connection-status")).toContainText("tentativa 1");
    
    const firstAttemptTime = await page.evaluate(() => (window as any).reconnectTime);
    reconnectTimes.push(firstAttemptTime);

    // Wait for second reconnection attempt
    await expect(page.getByTestId("connection-status")).toContainText("tentativa 2");
    
    const secondAttemptTime = await page.evaluate(() => (window as any).reconnectTime);
    reconnectTimes.push(secondAttemptTime);

    // Verify exponential backoff (second attempt should be after longer delay)
    const delayBetweenAttempts = reconnectTimes[1] - reconnectTimes[0];
    expect(delayBetweenAttempts).toBeGreaterThan(1000); // Should be more than 1 second
  });

  test("should stop reconnecting after max attempts and show failure", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByTestId("connection-status")).toContainText("Conectado");

    // Keep server offline
    mockServer.goOffline();

    // Force disconnect
    await page.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      if (ws) {
        ws.close(1006, "Network error");
      }
    });

    // Wait through all reconnection attempts (assuming max 5 attempts)
    for (let i = 1; i <= 5; i++) {
      await expect(page.getByTestId("connection-status")).toContainText(`tentativa ${i}`);
      // Wait for next attempt (with exponential backoff)
      await page.waitForTimeout(Math.min(1000 * Math.pow(2, i), 30000));
    }

    // Should eventually show failure state
    await expect(page.getByTestId("connection-status")).toContainText("Falha na conexão");
    
    // Should show retry button
    await expect(page.getByTestId("retry-button")).toBeVisible();
  });

  test("should allow manual retry after failure", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByTestId("connection-status")).toContainText("Conectado");

    // Simulate failure state
    mockServer.goOffline();
    
    await page.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      if (ws) {
        ws.close(1006, "Network error");
      }
    });

    // Wait for failure state
    await expect(page.getByTestId("connection-status")).toContainText("Falha na conexão");

    // Bring server back online
    mockServer.goOnline();

    // Click retry button
    await page.getByTestId("retry-button").click();

    // Should reconnect successfully
    await expect(page.getByTestId("connection-status")).toContainText("Conectado");
  });

  test("should maintain connection for extended period without timeout", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByTestId("connection-status")).toContainText("Conectado");

    // Wait for more than 1 minute to verify connection stability
    await page.waitForTimeout(65000); // 65 seconds

    // Connection should still be active
    await expect(page.getByTestId("connection-status")).toContainText("Conectado");

    // Send a message to verify connection is still functional
    await page.getByTestId("message-input").fill("Test message after timeout");
    await page.getByTestId("send-button").click();

    // Should successfully send message (indicating connection is active)
    await expect(page.getByTestId("chat-messages")).toContainText("Test message after timeout");
  });

  test("should handle multiple tabs independently", async ({ browser }) => {
    // Create two tabs
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Navigate both to chat
    await page1.goto("/chat");
    await page2.goto("/chat");

    // Wait for both to connect
    await expect(page1.getByTestId("connection-status")).toContainText("Conectado");
    await expect(page2.getByTestId("connection-status")).toContainText("Conectado");

    // Get session IDs for both tabs
    const sessionId1 = await page1.evaluate(() => (window as any).currentSessionId);
    const sessionId2 = await page2.evaluate(() => (window as any).currentSessionId);

    // Session IDs should be different
    expect(sessionId1).not.toBe(sessionId2);

    // Disconnect only one tab
    await page1.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      if (ws) {
        ws.close(1006, "Network error");
      }
    });

    // Only first tab should show reconnecting
    await expect(page1.getByTestId("connection-status")).toContainText("Reconectando");
    
    // Second tab should remain connected
    await expect(page2.getByTestId("connection-status")).toContainText("Conectado");

    await context1.close();
    await context2.close();
  });

  test("should show appropriate visual feedback during all connection states", async ({ page }) => {
    await page.goto("/chat");

    // Connected state - green indicator
    await expect(page.getByTestId("connection-status")).toContainText("Conectado");
    await expect(page.getByTestId("connection-indicator")).toHaveClass(/text-green/);

    // Simulate disconnect
    await page.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      if (ws) {
        ws.close(1006, "Network error");
      }
    });

    // Reconnecting state - yellow indicator with animation
    await expect(page.getByTestId("connection-status")).toContainText("Reconectando");
    await expect(page.getByTestId("connection-indicator")).toHaveClass(/text-yellow/);
    await expect(page.getByTestId("connection-indicator")).toHaveClass(/animate-spin/);

    // Keep server offline to force failure
    mockServer.goOffline();
    
    // Wait for max attempts
    await page.waitForTimeout(30000);

    // Failed state - red indicator
    await expect(page.getByTestId("connection-status")).toContainText("Falha na conexão");
    await expect(page.getByTestId("connection-indicator")).toHaveClass(/text-red/);
  });
});

test.describe("WebSocket Message Handling During Reconnection", () => {
  test("should queue messages during reconnection and send when reconnected", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByTestId("connection-status")).toContainText("Conectado");

    // Simulate connection loss
    await page.evaluate(() => {
      const ws = (window as any).mockWebSocket;
      if (ws) {
        ws.close(1006, "Network error");
      }
    });

    // Try to send message while disconnected
    await page.getByTestId("message-input").fill("Message during disconnect");
    await page.getByTestId("send-button").click();

    // Message should be queued (show pending indicator)
    await expect(page.getByTestId("message-queue")).toContainText("1 mensagem pendente");

    // Simulate reconnection
    await expect(page.getByTestId("connection-status")).toContainText("Conectado");

    // Queued message should be sent
    await expect(page.getByTestId("chat-messages")).toContainText("Message during disconnect");
    await expect(page.getByTestId("message-queue")).not.toBeVisible();
  });

  test("should handle heartbeat mechanism correctly", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByTestId("connection-status")).toContainText("Conectado");

    // Monitor heartbeat messages
    let heartbeatCount = 0;
    await page.evaluate(() => {
      const originalSend = WebSocket.prototype.send;
      WebSocket.prototype.send = function(data) {
        const message = JSON.parse(data.toString());
        if (message.type === 'heartbeat') {
          (window as any).heartbeatCount = ((window as any).heartbeatCount || 0) + 1;
        }
        return originalSend.call(this, data);
      };
    });

    // Wait for several heartbeat intervals (assuming 15 second intervals)
    await page.waitForTimeout(45000); // 45 seconds = ~3 heartbeats

    heartbeatCount = await page.evaluate(() => (window as any).heartbeatCount || 0);
    expect(heartbeatCount).toBeGreaterThanOrEqual(2);
  });
});
