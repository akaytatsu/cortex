import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { SessionService } from "../services/session.service";
import { AuthService } from "../services/auth.service";

export async function loader({ request }: LoaderFunctionArgs) {
  // Se não há usuários, redireciona para setup
  const hasUsers = await AuthService.hasUsers();
  if (!hasUsers) {
    return redirect("/setup");
  }
  
  // Se já está logado, redireciona para workspaces
  const userId = await SessionService.getUserId(request);
  if (userId) {
    return redirect("/workspaces");
  }
  
  return json({});
}

export const meta: MetaFunction = () => {
  return [
    { title: "Login - IDE" },
    { name: "description", content: "Sign in to your IDE account" },
  ];
};

export default function Login() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Access your development environment
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Login functionality placeholder
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              This page demonstrates the redirect flow from the setup process.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Full authentication will be implemented in future stories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}