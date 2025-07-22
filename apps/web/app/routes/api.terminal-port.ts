import { json } from "@remix-run/node";
import { terminalWebSocketServer } from "../lib/websocket-server";

export const loader = async () => {
  // Start the WebSocket server if not already started
  try {
    await terminalWebSocketServer.start();
  } catch (error) {
    console.error("Failed to start WebSocket server:", error);
  }
  
  return json({ port: terminalWebSocketServer.port });
};