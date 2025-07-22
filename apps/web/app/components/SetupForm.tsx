import { Form } from "@remix-run/react";
import { useState } from "react";

interface SetupFormProps {
  errors?: {
    email?: string;
    password?: string;
    general?: string;
  };
}

export function SetupForm({ errors }: SetupFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientErrors, setClientErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const validateEmail = (email: string): string | undefined => {
    if (!email) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Please enter a valid email address";
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return "Password is required";
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    return undefined;
  };

  const handleEmailChange = (value: string) => {
    const trimmedValue = value.trim();
    setEmail(trimmedValue);
    const error = validateEmail(trimmedValue);
    setClientErrors(prev => ({ ...prev, email: error }));
  };

  const handlePasswordChange = (value: string) => {
    const trimmedValue = value.trim();
    setPassword(trimmedValue);
    const error = validatePassword(trimmedValue);
    setClientErrors(prev => ({ ...prev, password: error }));
  };

  const isFormValid = email && password && !clientErrors.email && !clientErrors.password;

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
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email Address
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => handleEmailChange(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-300 sm:text-sm"
            placeholder="admin@example.com"
          />
          {(clientErrors.email || errors?.email) && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {clientErrors.email || errors?.email}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Password
        </label>
        <div className="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={e => handlePasswordChange(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-300 sm:text-sm"
            placeholder="Enter a secure password"
          />
          {(clientErrors.password || errors?.password) && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {clientErrors.password || errors?.password}
            </p>
          )}
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={!isFormValid}
          className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 dark:focus:ring-offset-gray-800"
        >
          Create Administrator Account
        </button>
      </div>
    </Form>
  );
}
