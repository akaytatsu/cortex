import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import { SessionService } from "../services/session.service";
import { LoginForm } from "../components/LoginForm";
import { serviceContainer } from "../lib/service-container";

export async function loader({ request }: LoaderFunctionArgs) {
  // Se não há usuários, redireciona para setup
  const authService = serviceContainer.getAuthService();
  const hasUsers = await authService.hasUsers();
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

export async function action({ request }: ActionFunctionArgs) {
  // Verifica se não há usuários, redireciona para setup
  const authService = serviceContainer.getAuthService();
  const hasUsers = await authService.hasUsers();
  if (!hasUsers) {
    return redirect("/setup");
  }

  // Verifica se já está logado, redireciona para workspaces
  const userId = await SessionService.getUserId(request);
  if (userId) {
    return redirect("/workspaces");
  }

  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  // Validação server-side
  const errors: { email?: string; password?: string; general?: string } = {};

  if (!email?.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "Please enter a valid email address";
  }

  if (!password?.trim()) {
    errors.password = "Password is required";
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  try {
    // Valida as credenciais usando valores trimmed
    const authService = serviceContainer.getAuthService();
    const user = await authService.validateLogin({
      email: email!.trim(),
      password: password!.trim(),
    });

    // Cria a sessão e redireciona para workspaces
    return SessionService.createUserSession(user.id, "/workspaces");
  } catch (error) {
    if (error instanceof Error) {
      return json(
        {
          errors: { general: error.message },
        },
        { status: 401 }
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
    { title: "Login - IDE" },
    { name: "description", content: "Sign in to your IDE account" },
  ];
};

export default function Login() {
  const actionData = useActionData<typeof action>();

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
          <LoginForm errors={actionData?.errors} />
        </div>
      </div>
    </div>
  );
}
