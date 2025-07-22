import type { Workspace } from "shared-types";

interface WorkspaceListProps {
  workspaces: Workspace[];
}

export function WorkspaceList({ workspaces }: WorkspaceListProps) {
  if (workspaces.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {workspaces.map((workspace) => (
        <div
          key={workspace.name}
          className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {workspace.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {workspace.path}
            </p>
          </div>
          <div className="space-x-3">
            <button
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              onClick={() => {
                // TODO: Navigate to workspace in future story
                alert(`Entering workspace: ${workspace.name}`);
              }}
            >
              Enter
            </button>
          </div>
        </div>
      ))}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <a
          href="/workspaces/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Workspace
        </a>
      </div>
    </div>
  );
}