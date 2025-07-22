import { Form } from "@remix-run/react";
import { useState } from "react";

interface AddWorkspaceFormProps {
  errors?: {
    name?: string;
    path?: string;
    general?: string;
  };
}

export function AddWorkspaceForm({ errors }: AddWorkspaceFormProps) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [clientErrors, setClientErrors] = useState<{
    name?: string;
    path?: string;
  }>({});

  const validateName = (name: string): string | undefined => {
    if (!name.trim()) return "Workspace name is required";
    return undefined;
  };

  const validatePath = (path: string): string | undefined => {
    if (!path.trim()) return "Workspace path is required";
    return undefined;
  };

  const handleNameChange = (value: string) => {
    setName(value);
    const error = validateName(value);
    setClientErrors(prev => ({ ...prev, name: error }));
  };

  const handlePathChange = (value: string) => {
    setPath(value);
    const error = validatePath(value);
    setClientErrors(prev => ({ ...prev, path: error }));
  };

  const isFormValid =
    !clientErrors.name && !clientErrors.path && name.trim() && path.trim();

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
        <label
          htmlFor="path"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Workspace Path
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
            placeholder="/path/to/your/project"
          />
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
          className="flex-1 flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 dark:focus:ring-offset-gray-800"
        >
          Create Workspace
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