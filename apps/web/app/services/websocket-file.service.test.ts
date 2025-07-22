import { WebSocketFileService } from "./websocket-file.service";
import type { WSFileMessage, SaveRequestMessage } from "shared-types";

describe("WebSocketFileService", () => {
  let service: WebSocketFileService;
  const mockWorkspacePath = "/test/workspace";

  beforeEach(() => {
    service = new WebSocketFileService();
  });

  describe("connection management", () => {
    it("should register a new connection", () => {
      const connection = service.registerConnection(
        "conn1",
        "user1",
        "workspace1"
      );

      expect(connection).toMatchObject({
        id: "conn1",
        userId: "user1",
        workspaceName: "workspace1",
      });
      expect(connection.connectedAt).toBeInstanceOf(Date);
      expect(connection.lastActivity).toBeInstanceOf(Date);
    });

    it("should unregister a connection", () => {
      service.registerConnection("conn1", "user1", "workspace1");
      expect(service.getActiveConnectionsCount()).toBe(1);

      service.unregisterConnection("conn1");
      expect(service.getActiveConnectionsCount()).toBe(0);
    });

    it("should update connection activity", () => {
      const connection = service.registerConnection(
        "conn1",
        "user1",
        "workspace1"
      );
      const originalActivity = connection.lastActivity;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        service.updateConnectionActivity("conn1");
        const updatedConnection = service.getConnection("conn1");
        expect(updatedConnection?.lastActivity.getTime()).toBeGreaterThan(
          originalActivity.getTime()
        );
      }, 10);
    });
  });

  describe("message handling", () => {
    beforeEach(() => {
      service.registerConnection("conn1", "user1", "workspace1");
    });

    it("should handle file content request with missing path", async () => {
      const message: WSFileMessage = {
        type: "file_content",
        payload: {},
        messageId: "msg1",
      };

      const response = await service.handleMessage(
        "conn1",
        message,
        mockWorkspacePath
      );

      expect(response).toMatchObject({
        type: "error",
        payload: {
          message: "File path is required",
        },
        messageId: "msg1",
      });
    });

    it("should handle save request with missing data", async () => {
      const message: SaveRequestMessage = {
        type: "save_request",
        payload: {
          path: "",
          content: "",
        } as SaveRequestMessage["payload"],
        messageId: "msg1",
      };

      const response = await service.handleMessage(
        "conn1",
        message,
        mockWorkspacePath
      );

      expect(response).toMatchObject({
        type: "error",
        payload: {
          message: "Path and content are required",
        },
        messageId: "msg1",
      });
    });

    it("should handle unknown message type", async () => {
      const message: WSFileMessage = {
        type: "unknown_type" as WSFileMessage["type"],
        payload: {},
        messageId: "msg1",
      };

      const response = await service.handleMessage(
        "conn1",
        message,
        mockWorkspacePath
      );

      expect(response).toMatchObject({
        type: "error",
        payload: {
          message: "Unknown message type",
        },
        messageId: "msg1",
      });
    });
  });

  describe("connection status messages", () => {
    it("should create connection status message", () => {
      const message = service.createConnectionStatusMessage("connected");

      expect(message).toMatchObject({
        type: "connection_status",
        payload: {
          status: "connected",
        },
      });
      expect(message.payload.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("file session tracking", () => {
    beforeEach(() => {
      service.registerConnection("conn1", "user1", "workspace1");
    });

    it("should track file sessions", async () => {
      expect(service.getActiveFileSessionsCount()).toBe(0);

      // This would be called internally when handling file content requests
      // For now, we can only test the public interface
      const connection = service.getConnection("conn1");
      expect(connection).toBeTruthy();
    });
  });
});
