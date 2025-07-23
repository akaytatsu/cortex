import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { serviceContainer } from "../lib/service-container";
import { SessionService } from "../services/session.service";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const startTime = Date.now();
  
  try {
    // Validate user authentication and get user ID
    const userId = await SessionService.requireUserId(request);

    const { workspace } = params;

    if (!workspace) {
      return json(
        { 
          error: { 
            code: 'WORKSPACE_PARAMETER_MISSING', 
            message: 'Workspace parameter is required',
            context: { parameter: 'workspace' }
          }
        }, 
        { status: 400 }
      );
    }

    // Get workspace details and validate it exists
    const workspaceService = serviceContainer.getWorkspaceService();
    const workspaceData = await workspaceService.getWorkspaceByName(workspace);

    if (!workspaceData) {
      return json(
        { 
          error: { 
            code: 'WORKSPACE_NOT_FOUND', 
            message: `Workspace '${workspace}' not found`,
            context: { workspaceName: workspace }
          }
        }, 
        { status: 404 }
      );
    }

    // TODO: Add permission check when AuthService supports workspace:read permission
    // const authService = serviceContainer.getAuthService();
    // const hasPermission = await authService.checkPermission(userId, 'workspace:read', workspace);
    // if (!hasPermission) {
    //   return json(
    //     { 
    //       error: { 
    //         code: 'PERMISSION_DENIED', 
    //         message: 'Insufficient permissions to access workspace agents',
    //         requiredPermission: 'workspace:read'
    //       }
    //     }, 
    //     { status: 403 }
    //   );
    // }

    // Enhanced rate limiting with sliding window
    const rateLimitKey = `agents:${userId}:${workspace}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 30;

    // Initialize rate limit store if not exists
    if (!(global as any).rateLimitStore) {
      (global as any).rateLimitStore = new Map();
    }

    const store = (global as any).rateLimitStore as Map<string, number[]>;
    const userRequests = store.get(rateLimitKey) || [];
    
    // Clean old requests (sliding window)
    const recentRequests = userRequests.filter((timestamp: number) => now - timestamp < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const retryAfterMs = windowMs - (now - oldestRequest) + 1000; // Add 1s buffer
      
      return json(
        { 
          error: { 
            code: 'RATE_LIMIT_EXCEEDED', 
            message: 'Too many requests. Please try again later.',
            context: { 
              maxRequests, 
              windowMs, 
              currentRequests: recentRequests.length,
              retryAfterMs 
            }
          }
        }, 
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil(retryAfterMs / 1000).toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(now + retryAfterMs).toISOString()
          }
        }
      );
    }

    // Update rate limit store with current request
    recentRequests.push(now);
    store.set(rateLimitKey, recentRequests);

    // Add rate limit headers to successful responses
    const remainingRequests = Math.max(0, maxRequests - recentRequests.length);

    // Get agents using the AgentService
    const agentService = serviceContainer.getAgentService();
    const agentResponse = await agentService.getAgentsWithMetadata(workspaceData.path);

    // Add performance metrics
    const responseTime = Date.now() - startTime;
    
    const response = {
      ...agentResponse,
      metadata: {
        ...agentResponse.metadata,
        responseTimeMs: responseTime,
        requestId: `${userId}-${workspace}-${now}`,
        userId
      }
    };

    // Log metrics for monitoring
    const logger = serviceContainer.getLogger();
    logger.info("Agents loaded via API", {
      userId,
      workspaceName: workspace,
      workspacePath: workspaceData.path,
      agentCount: response.agents.length,
      responseTimeMs: responseTime,
      fromCache: response.metadata.fromCache,
      requestId: response.metadata.requestId
    });

    return json(response, {
      headers: {
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': remainingRequests.toString(),
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    const logger = serviceContainer.getLogger();
    
    logger.error("Error loading agents via API", error as Error, {
      workspace: params.workspace,
      responseTimeMs: responseTime,
      url: request.url
    });

    return json(
      { 
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load workspace agents',
          context: { timestamp: new Date().toISOString() }
        }
      }, 
      { status: 500 }
    );
  }
};