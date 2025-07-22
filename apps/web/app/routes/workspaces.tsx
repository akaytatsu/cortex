import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { SessionService } from "../services/session.service";
import { UserService } from "../services/user.service";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await SessionService.requireUserId(request);
  const user = await UserService.getUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return json({ user });
}

export const meta: MetaFunction = () => {
  return [
    { title: "Workspaces - IDE" },
    { name: "description", content: "Your development workspaces" },
  ];
};

export default function Workspaces() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Welcome to your IDE!
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                Hello, {user.email}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                This is a placeholder for the workspaces page.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Your IDE workspace functionality will be implemented here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
