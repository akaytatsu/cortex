import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { mcpDiscoveryService } from "~/services/mcp-discovery.service";
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

    // Discover MCP servers in the workspace
    const mcpServers = await mcpDiscoveryService.discoverMcpServers(
      workspace.path
    );

    return json(mcpServers);

  } catch (error) {
    console.error("Failed to discover MCP servers:", error);
    return json(
      {
        error: "Failed to discover MCP servers",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}