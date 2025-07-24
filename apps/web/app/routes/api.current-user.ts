import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { SessionService } from "../services/session.service";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const userId = await SessionService.getUserId(request);
    
    if (!userId) {
      return json({ authenticated: false, userId: null }, { status: 401 });
    }

    return json({ authenticated: true, userId });
  } catch (error) {
    return json(
      { authenticated: false, userId: null, error: "Authentication failed" },
      { status: 401 }
    );
  }
};