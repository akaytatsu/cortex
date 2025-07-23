import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { cliDetectionService } from "~/services/cli-detection.service";
import { claudeCodeExecutionService } from "~/services/claude-code-execution.service";
import { serviceContainer } from "~/lib/service-container";

export async function action({ params, request }: ActionFunctionArgs) {
  const { workspaceName } = params;

  if (!workspaceName) {
    return json({ error: "Workspace name is required" }, { status: 400 });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { command, args = [], sessionId } = body;

    if (!command || typeof command !== "string") {
      return json({ error: "Command is required and must be a string" }, { status: 400 });
    }

    // Get workspace using the same service as the main workspace route
    const workspaceService = serviceContainer.getWorkspaceService();
    const workspace = await workspaceService.getWorkspaceByName(workspaceName);

    if (!workspace) {
      return json({ error: "Workspace not found" }, { status: 404 });
    }

    // Check if Claude Code CLI is available
    const cliStatus = await cliDetectionService.checkClaudeCodeAvailability(
      workspace.path
    );

    if (cliStatus.status !== "available") {
      return json({ 
        success: false,
        error: "Claude Code CLI is not available",
        output: `Claude Code CLI status: ${cliStatus.status}`,
        metadata: { cliStatus }
      }, { status: 503 });
    }

    // Execute the command
    const result = await claudeCodeExecutionService.executeCommand(
      workspace.path,
      command,
      args,
      { sessionId }
    );

    return json({
      success: result.success,
      output: result.output,
      error: result.error,
      metadata: {
        command,
        args,
        executionTime: result.executionTime,
        workspacePath: workspace.path,
        sessionId
      }
    });

  } catch (error) {
    console.error("Failed to execute Claude Code CLI command:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return json({
      success: false,
      error: "Command execution failed",
      output: errorMessage,
      metadata: {
        originalError: errorMessage
      }
    }, { status: 500 });
  }
}