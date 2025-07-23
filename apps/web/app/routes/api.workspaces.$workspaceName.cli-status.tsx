import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { cliDetectionService } from "~/services/cli-detection.service";
import { serviceContainer } from "~/lib/service-container";

export async function loader({ params }: LoaderFunctionArgs) {
  const { workspaceName } = params;

  if (!workspaceName) {
    return json({ error: "Workspace name is required" }, { status: 400 });
  }

  try {
    // Get workspace using the same service as the main workspace route
    const workspaceService = serviceContainer.getWorkspaceService();
    const workspace = await workspaceService.getWorkspaceByName(workspaceName);

    if (!workspace) {
      return json({ error: "Workspace not found" }, { status: 404 });
    }

    // Use the existing CLI detection service with the actual workspace path
    const cliStatus = await cliDetectionService.checkClaudeCodeAvailability(
      workspace.path
    );

    return json({
      available: cliStatus.status === "available",
      version: cliStatus.version,
      status: cliStatus.status,
    });
  } catch (error) {
    console.error("Failed to check CLI status:", error);
    return json(
      {
        available: false,
        version: null,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
