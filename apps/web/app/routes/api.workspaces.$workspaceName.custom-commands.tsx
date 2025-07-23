import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { customCommandDiscoveryService } from "~/services/custom-command-discovery.service";
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

    // Discover custom commands in the workspace
    const customCommands = await customCommandDiscoveryService.discoverCommands(
      workspace.path
    );

    return json(customCommands);

  } catch (error) {
    console.error("Failed to discover custom commands:", error);
    return json(
      {
        error: "Failed to discover custom commands",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}