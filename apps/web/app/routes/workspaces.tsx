import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { SessionService } from "../services/session.service";
import { WorkspaceService } from "../services/workspace.service";
import { LogoutButton } from "../components/LogoutButton";
import { WorkspaceList } from "../components/WorkspaceList";
import { EmptyWorkspaces } from "../components/EmptyWorkspaces";

export async function loader({ request }: LoaderFunctionArgs) {
  // Require authentication
  await SessionService.requireUserId(request);

  // Load workspaces
  const workspaces = await WorkspaceService.listWorkspaces();

  // Check for error and success messages in query params
  const url = new URL(request.url);
  const errorMessage = url.searchParams.get("error");
  const successMessage = url.searchParams.get("success");

  return json({
    workspaces,
    errorMessage: errorMessage ? decodeURIComponent(errorMessage) : null,
    successMessage: successMessage ? decodeURIComponent(successMessage) : null,
  });
}

export const meta: MetaFunction = () => {
  return [
    { title: "Workspaces - IDE" },
    { name: "description", content: "Manage your development workspaces" },
  ];
};

export default function Workspaces() {
  const { workspaces, errorMessage, successMessage } =
    useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Your Workspaces
          </h1>
          <LogoutButton />
        </div>

        {errorMessage && (
          <div className="px-4 sm:px-0 mb-4">
            <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
              <div className="text-sm text-red-700 dark:text-red-400">
                {errorMessage}
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="px-4 sm:px-0 mb-4">
            <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
              <div className="text-sm text-green-700 dark:text-green-400">
                {successMessage}
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            {workspaces.length === 0 ? (
              <EmptyWorkspaces />
            ) : (
              <WorkspaceList workspaces={workspaces} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
