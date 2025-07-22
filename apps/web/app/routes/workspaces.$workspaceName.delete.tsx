import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { SessionService } from "../services/session.service";
import { WorkspaceService } from "../services/workspace.service";

export async function action({ request, params }: ActionFunctionArgs) {
  // Require authentication
  await SessionService.requireUserId(request);

  const workspaceName = params.workspaceName;
  
  if (!workspaceName) {
    throw new Response("Workspace name is required", { status: 400 });
  }

  try {
    await WorkspaceService.removeWorkspace(decodeURIComponent(workspaceName));
    return redirect("/workspaces?success=" + encodeURIComponent("Workspace removido com sucesso!"));
  } catch (error) {
    if (error instanceof Error) {
      // For workspace deletion, we'll redirect back with an error in query params
      const searchParams = new URLSearchParams();
      searchParams.set('error', encodeURIComponent(error.message));
      return redirect(`/workspaces?${searchParams.toString()}`);
    }

    const searchParams = new URLSearchParams();
    searchParams.set('error', encodeURIComponent('An unexpected error occurred while removing the workspace.'));
    return redirect(`/workspaces?${searchParams.toString()}`);
  }
}

// This route should only handle POST requests for deletion
export function loader() {
  throw new Response("Not Found", { status: 404 });
}