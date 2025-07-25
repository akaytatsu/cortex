import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { serviceContainer } from "../lib/service-container";
import { SessionService } from "../services/session.service";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    await SessionService.requireUserId(request);

    const { workspaceName } = params;
    const url = new URL(request.url);
    const filePath = url.searchParams.get("path");

    if (!workspaceName) {
      return json({ error: "Workspace name is required" }, { status: 400 });
    }

    if (!filePath) {
      return json({ error: "File path is required" }, { status: 400 });
    }

    // Get workspace details
    const workspaceService = serviceContainer.getWorkspaceService();
    const workspace = await workspaceService.getWorkspaceByName(workspaceName);

    if (!workspace) {
      return json({ error: "Workspace not found" }, { status: 404 });
    }

    // Get file content
    const fileSystemService = serviceContainer.getFileSystemService();
    const fileContent = await fileSystemService.getFileContent(
      workspace.path,
      filePath
    );

    return json({ fileContent });
  } catch (error) {
    console.error("Error loading file content:", error);

    if (error instanceof Error && error.message.includes("binary")) {
      return json({ error: "Cannot display binary file" }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes("too large")) {
      return json({ error: "File too large to display" }, { status: 400 });
    }

    return json({ error: "Failed to load file content" }, { status: 500 });
  }
};
