import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { serviceContainer } from "../lib/service-container";
import { SessionService } from "../services/session.service";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    await SessionService.requireUserId(request);

    const { workspaceName } = params;

    if (!workspaceName) {
      return json({ error: "Workspace name is required" }, { status: 400 });
    }

    // Get workspace details
    const workspaceService = serviceContainer.getWorkspaceService();
    const workspace = await workspaceService.getWorkspaceByName(workspaceName);

    if (!workspace) {
      return json({ error: "Workspace not found" }, { status: 404 });
    }

    // Get directory structure
    const fileSystemService = serviceContainer.getFileSystemService();
    const files = await fileSystemService.getDirectoryStructure(workspace.path);

    return json({ files });
  } catch (error) {
    console.error("Error loading files:", error);
    return json({ error: "Failed to load files" }, { status: 500 });
  }
};
