import { Link } from "@remix-run/react";

export function EmptyWorkspaces() {
  return (
    <div className="text-center py-12">
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        No workspaces found. Create your first workspace to get started.
      </p>
      <Link
        to="/workspaces/new"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Add Workspace
      </Link>
    </div>
  );
}
