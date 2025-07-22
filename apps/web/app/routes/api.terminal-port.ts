import { json } from "@remix-run/node";
import { terminalWebSocketServer } from "../lib/websocket-server";
import { logger } from "../lib/logger";

export const loader = async () => {
  // Start the WebSocket server if not already started
  try {
    await terminalWebSocketServer.start();
  } catch (error) {
    logger.error("Failed to start WebSocket server", error as Error);
  }

  return json({ port: terminalWebSocketServer.port });
};
