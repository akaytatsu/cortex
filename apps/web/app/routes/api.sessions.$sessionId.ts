import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { SessionPersistenceService } from "../services/session-persistence.service";
import { requireCurrentUser } from "../services/session.service";
import { createServiceLogger } from "../lib/logger";

const logger = createServiceLogger("SessionAPI");

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    // Require authentication
    const user = await requireCurrentUser(request);
    
    if (!params.sessionId) {
      return json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const sessionPersistence = new SessionPersistenceService();
    const sessions = await sessionPersistence.loadSessions();
    
    // Find session and verify ownership
    const session = sessions.find(
      s => s.id === params.sessionId && s.userId === user.id
    );

    if (!session) {
      return json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    logger.info("Session retrieved successfully", {
      userId: user.id,
      sessionId: params.sessionId,
    });

    return json({ session });
  } catch (error) {
    logger.error("Failed to load session", error as Error);
    
    if (error instanceof Response) {
      throw error; // Re-throw auth redirects
    }
    
    return json(
      { error: "Failed to load session" },
      { status: 500 }
    );
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    // Require authentication
    const user = await requireCurrentUser(request);
    
    if (!params.sessionId) {
      return json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const sessionPersistence = new SessionPersistenceService();
    const method = request.method;

    if (method === "DELETE") {
      // Verify session ownership before deletion
      const sessions = await sessionPersistence.loadSessions();
      const session = sessions.find(
        s => s.id === params.sessionId && s.userId === user.id
      );

      if (!session) {
        return json(
          { error: "Session not found or access denied" },
          { status: 404 }
        );
      }

      await sessionPersistence.removeSession(params.sessionId);
      
      logger.info("Session removed successfully", {
        userId: user.id,
        sessionId: params.sessionId,
      });

      return json({ success: true });
    }

    if (method === "PATCH") {
      // Update session
      const updates = await request.json();
      
      // Verify session ownership before update
      const sessions = await sessionPersistence.loadSessions();
      const session = sessions.find(
        s => s.id === params.sessionId && s.userId === user.id
      );

      if (!session) {
        return json(
          { error: "Session not found or access denied" },
          { status: 404 }
        );
      }

      // Don't allow changing userId
      delete updates.userId;

      await sessionPersistence.updateSession(params.sessionId, updates);
      
      logger.info("Session updated successfully", {
        userId: user.id,
        sessionId: params.sessionId,
      });

      return json({ success: true });
    }

    return json(
      { error: "Method not allowed" },
      { status: 405 }
    );
  } catch (error) {
    logger.error("Failed to handle session action", error as Error);
    
    if (error instanceof Response) {
      throw error; // Re-throw auth redirects
    }
    
    return json(
      { error: "Failed to process session request" },
      { status: 500 }
    );
  }
}