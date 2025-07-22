import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { FileSystemService } from "../services/filesystem.service";
import { SessionService } from "../services/session.service";
import { WorkspaceService } from "../services/workspace.service";
import type { FileSaveRequest, FileSaveResponse } from "shared-types";

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    // Authenticate user
    await SessionService.requireUserId(request);

    const { workspaceName } = params;

    if (!workspaceName) {
      return json<FileSaveResponse>(
        { success: false, message: "Workspace name is required" },
        { status: 400 }
      );
    }

    // Validate JSON body
    let saveRequest: FileSaveRequest;
    try {
      saveRequest = await request.json();
    } catch {
      return json<FileSaveResponse>(
        { success: false, message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!saveRequest.path || saveRequest.content === undefined) {
      return json<FileSaveResponse>(
        { success: false, message: "Path and content are required" },
        { status: 400 }
      );
    }

    // Get workspace path
    const workspace = await WorkspaceService.getWorkspaceByName(workspaceName);
    if (!workspace) {
      return json<FileSaveResponse>(
        { success: false, message: "Workspace not found" },
        { status: 404 }
      );
    }

    // Save file
    const result = await FileSystemService.saveFileContent(
      workspace.path,
      saveRequest
    );

    return json<FileSaveResponse>(result);
  } catch (error) {
    console.error("Error saving file:", error);

    if (error instanceof Error) {
      return json<FileSaveResponse>(
        {
          success: false,
          message: error.message,
        },
        { status: 500 }
      );
    }

    return json<FileSaveResponse>(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
