import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import { SessionService } from "../services/session.service";
import { WorkspaceService } from "../services/workspace.service";
import { AddWorkspaceForm } from "../components/AddWorkspaceForm";

export async function loader({ request }: LoaderFunctionArgs) {
  // Require authentication
  await SessionService.requireUserId(request);
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  // Require authentication
  await SessionService.requireUserId(request);

  const formData = await request.formData();
  const name = formData.get("name")?.toString();
  const path = formData.get("path")?.toString();

  // Validation
  const errors: { name?: string; path?: string; general?: string } = {};

  if (!name?.trim()) {
    errors.name = "Workspace name is required";
  }

  if (!path?.trim()) {
    errors.path = "Workspace path is required";
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  try {
    await WorkspaceService.addWorkspace({
      name: name!.trim(),
      path: path!.trim(),
    });

    return redirect("/workspaces");
  } catch (error) {
    if (error instanceof Error) {
      return json(
        {
          errors: { general: error.message },
        },
        { status: 400 }
      );
    }

    return json(
      {
        errors: { general: "An unexpected error occurred. Please try again." },
      },
      { status: 500 }
    );
  }
}

export const meta: MetaFunction = () => {
  return [
    { title: "Add Workspace - IDE" },
    { name: "description", content: "Create a new development workspace" },
  ];
};

export default function AddWorkspace() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Create New Workspace
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Add a new development workspace to organize your projects
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
          <AddWorkspaceForm errors={actionData?.errors} />
        </div>
      </div>
    </div>
  );
}