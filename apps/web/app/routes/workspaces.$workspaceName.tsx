import { json, redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { serviceContainer } from "../lib/service-container";
import { SessionService } from "../services/session.service";
import { IDELayout } from "../components/IDELayout";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const userId = await SessionService.requireUserId(request);

  const { workspaceName } = params;

  if (!workspaceName) {
    throw redirect("/workspaces");
  }

  try {
    const workspaceService = serviceContainer.getWorkspaceService();
    const workspace = await workspaceService.getWorkspaceByName(workspaceName);

    if (!workspace) {
      throw redirect("/workspaces");
    }

    return json({ workspace, userId });
  } catch (error) {
    throw redirect("/workspaces");
  }
};

export default function WorkspacePage() {
  const { workspace, userId } = useLoaderData<typeof loader>();

  return <IDELayout workspace={workspace} userId={userId} />;
}
