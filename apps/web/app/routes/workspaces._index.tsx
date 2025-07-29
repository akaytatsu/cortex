import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { SessionService } from "../services/session.service";
import { serviceContainer } from "../lib/service-container";
import { LogoutButton } from "../components/LogoutButton";
import { WorkspaceList } from "../components/WorkspaceList";
import { EmptyWorkspaces } from "../components/EmptyWorkspaces";

export async function loader({ request }: LoaderFunctionArgs) {
  // Require authentication
  await SessionService.requireUserId(request);

  // Load workspaces
  const workspaceService = serviceContainer.getWorkspaceService();
  const workspaces = await workspaceService.listWorkspaces();

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
    <div className="min-h-screen bg-background-primary">
      {/* Mobile-first Container */}
      <div className="mobile-container tablet-container desktop-container py-4 md:py-6">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">
            Seus Workspaces
          </h1>
          <LogoutButton />
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4">
            <div className="rounded-md bg-error-50 p-4 border border-error-200">
              <div className="text-sm text-error-700">
                {errorMessage}
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4">
            <div className="rounded-md bg-success-50 p-4 border border-success-200">
              <div className="text-sm text-success-700">
                {successMessage}
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Mobile Optimized */}
        <div className="card-base p-4 md:p-6">
          {workspaces.length === 0 ? (
            <EmptyWorkspaces />
          ) : (
            <WorkspaceList workspaces={workspaces} />
          )}
        </div>
      </div>
    </div>
  );
}
