import { Form, useNavigation } from "@remix-run/react";
import { useState } from "react";

interface AddWorkspaceFormProps {
  errors?: {
    name?: string;
    path?: string;
    general?: string;
  };
}

export function AddWorkspaceForm({ errors }: AddWorkspaceFormProps) {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [createNewFolder, setCreateNewFolder] = useState(false);
  const [clientErrors, setClientErrors] = useState<{
    name?: string;
    path?: string;
  }>({});

  const isSubmitting = navigation.state === "submitting";

  const validateName = (name: string): string | undefined => {
    if (!name.trim()) return "Workspace name is required";
    return undefined;
  };

  const validatePath = (path: string, isCreatingNew: boolean): string | undefined => {
    if (!path.trim()) return "Workspace path is required";
    if (isCreatingNew && path.includes("..")) {
      return "Path cannot contain '..' for security reasons";
    }
    return undefined;
  };

  const handleNameChange = (value: string) => {
    setName(value);
    const error = validateName(value);
    setClientErrors(prev => ({ ...prev, name: error }));
  };

  const handlePathChange = (value: string) => {
    setPath(value);
    const error = validatePath(value, createNewFolder);
    setClientErrors(prev => ({ ...prev, path: error }));
  };

  const handleCreateNewFolderChange = (checked: boolean) => {
    setCreateNewFolder(checked);
    // Re-validate path with new mode
    const error = validatePath(path, checked);
    setClientErrors(prev => ({ ...prev, path: error }));
  };

  const isFormValid =
    !clientErrors.name && !clientErrors.path && name.trim() && path.trim() && !isSubmitting;

  return (
    <Form method="post" className="space-y-6">
      {errors?.general && (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <div className="text-sm text-red-700 dark:text-red-400">
            {errors.general}
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Workspace Name
        </label>
        <div className="mt-1">
          <input
            id="name"
            name="name"
            type="text"
            required
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-300 sm:text-sm"
            placeholder="My Project"
          />
          {(clientErrors.name || errors?.name) && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {clientErrors.name || errors?.name}
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center space-x-2 mb-4">
          <input
            id="createNewFolder"
            name="createNewFolder"
            type="checkbox"
            checked={createNewFolder}
            onChange={e => handleCreateNewFolderChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
          />
          <label
            htmlFor="createNewFolder"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Criar nova pasta
          </label>
        </div>

        <label
          htmlFor="path"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {createNewFolder ? "Caminho onde criar a nova pasta" : "Caminho da pasta existente"}
        </label>
        <div className="mt-1">
          <input
            id="path"
            name="path"
            type="text"
            required
            value={path}
            onChange={e => handlePathChange(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-300 sm:text-sm"
            placeholder={createNewFolder ? "/home/user/projects" : "/path/to/your/project"}
          />
          {createNewFolder && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Uma nova pasta com o nome do workspace será criada neste caminho
            </p>
          )}
          {(clientErrors.path || errors?.path) && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {clientErrors.path || errors?.path}
            </p>
          )}
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={!isFormValid}
          className="flex-1 flex justify-center items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 dark:focus:ring-offset-gray-800"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {createNewFolder ? "Criando Workspace..." : "Criando Workspace..."}
            </>
          ) : (
            "Create Workspace"
          )}
        </button>
        <a
          href="/workspaces"
          className="flex-1 flex justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          Cancel
        </a>
      </div>
    </Form>
  );
}