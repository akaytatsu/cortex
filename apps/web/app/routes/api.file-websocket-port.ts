import { json } from "@remix-run/node";
import { fileWebSocketServer } from "../lib/websocket-file-server";
import { FileWebSocketServer } from "../lib/websocket-file-server";

export async function loader() {
  try {
    // Start the file WebSocket server if not already started
    await fileWebSocketServer.start();

    return json({
      port: fileWebSocketServer.getPort(),
      activeConnections: fileWebSocketServer.getActiveConnectionsCount(),
    });
  } catch (error) {
    console.error("Error starting file WebSocket server:", error);

    // Try to reset and start again in case of error
    try {
      console.log("Attempting to reset WebSocket server...");
      FileWebSocketServer.reset();
      await fileWebSocketServer.start();
      return json({
        port: fileWebSocketServer.getPort(),
        activeConnections: fileWebSocketServer.getActiveConnectionsCount(),
      });
    } catch (retryError) {
      console.error("Retry also failed:", retryError);
      return json(
        {
          error: "Failed to start file WebSocket server",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }
}
