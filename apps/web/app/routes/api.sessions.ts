import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { SessionPersistenceService } from "../services/session-persistence.service";
import { requireCurrentUser } from "../services/session.service";
import { createServiceLogger } from "../lib/logger";

const logger = createServiceLogger("SessionsAPI");

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Require authentication
    const user = await requireCurrentUser(request);
    
    const sessionPersistence = new SessionPersistenceService();
    const sessions = await sessionPersistence.loadSessions();
    
    // Filter sessions by user
    const userSessions = sessions.filter(session => session.userId === user.id);
    
    logger.info("Sessions loaded successfully", {
      userId: user.id,
      sessionCount: userSessions.length,
    });

    return json({ sessions: userSessions });
  } catch (error) {
    logger.error("Failed to load sessions", error as Error);
    
    if (error instanceof Response) {
      throw error; // Re-throw auth redirects
    }
    
    return json(
      { error: "Failed to load sessions" },
      { status: 500 }
    );
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Require authentication
    const user = await requireCurrentUser(request);
    
    const sessionPersistence = new SessionPersistenceService();
    const method = request.method;

    if (method === "POST") {
      // Create or update session
      const sessionData = await request.json();
      
      // Validate required fields
      if (!sessionData.id || !sessionData.workspaceName || !sessionData.workspacePath) {
        return json(
          { error: "Missing required session fields" },
          { status: 400 }
        );
      }

      // Ensure session belongs to current user
      sessionData.userId = user.id;

      await sessionPersistence.saveSession(sessionData);
      
      logger.info("Session saved successfully", {
        userId: user.id,
        sessionId: sessionData.id,
        workspaceName: sessionData.workspaceName,
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