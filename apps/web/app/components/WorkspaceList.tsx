import type { Workspace } from "shared-types";
import { useState } from "react";
import { Form, Link } from "@remix-run/react";

interface WorkspaceListProps {
  workspaces: Workspace[];
}

export function WorkspaceList({ workspaces }: WorkspaceListProps) {
  const [workspaceToDelete, setWorkspaceToDelete] = useState<string | null>(
    null
  );

  if (workspaces.length === 0) {
    return null;
  }

  const handleDeleteClick = (workspaceName: string) => {
    setWorkspaceToDelete(workspaceName);
  };

  const handleConfirmDelete = () => {
    // Form submission will be handled by Remix Form component
    setWorkspaceToDelete(null);
  };

  const handleCancelDelete = () => {
    setWorkspaceToDelete(null);
  };

  return (
    <div className="space-y-4">
      {workspaces.map(workspace => (
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
          <div className="flex space-x-2">
            <Link
              to={`/workspaces/${encodeURIComponent(workspace.name)}`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Entrar
            </Link>
            <button
              className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-700 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20"
              onClick={() => handleDeleteClick(workspace.name)}
            >
              Remover
            </button>
          </div>
        </div>
      ))}

      {/* Confirmation Modal */}
      {workspaceToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Confirmar remoção
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tem certeza que deseja remover o workspace &quot;
                  {workspaceToDelete}&quot;?
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Esta ação apenas remove o workspace da lista. Os arquivos não
                  serão deletados.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Form
                  method="post"
                  action={`/workspaces/${encodeURIComponent(workspaceToDelete)}/delete`}
                  onSubmit={handleConfirmDelete}
                >
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Remover
                  </button>
                </Form>
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={handleCancelDelete}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <a
          href="/workspaces/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Adicionar Workspace
        </a>
      </div>
    </div>
  );
}
