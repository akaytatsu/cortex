import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import { SessionService } from "../services/session.service";
import { SetupForm } from "../components/SetupForm";
import { serviceContainer } from "../lib/service-container";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function loader(_args: LoaderFunctionArgs) {
  const authService = serviceContainer.getAuthService();
  const hasUsers = await authService.hasUsers();

  if (hasUsers) {
    return redirect("/login");
  }

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const authService = serviceContainer.getAuthService();
  const hasUsers = await authService.hasUsers();

  if (hasUsers) {
    return redirect("/login");
  }

  const formData = await request.formData();
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;

  // Validation
  const errors: { email?: string; password?: string; general?: string } = {};

  if (!email || typeof email !== "string") {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address";
  }

  if (!password || typeof password !== "string") {
    errors.password = "Password is required";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters long";
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.createFirstUser({
      email: email!,
      password: password!,
    });

    return SessionService.createUserSession(user.id);
  } catch (error) {
    if (error instanceof Error) {
      return json({ errors: { general: error.message } }, { status: 400 });
    }

    return json(
      { errors: { general: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}

export const meta: MetaFunction = () => {
  return [
    { title: "Setup - First User" },
    { name: "description", content: "Create your first user account" },
  ];
};

export default function Setup() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            First Time Setup
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Create your administrator account
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
          <SetupForm errors={actionData?.errors} />
        </div>
      </div>
    </div>
  );
}
