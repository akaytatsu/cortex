import type { ActionFunctionArgs } from "@remix-run/node";
import { SessionService } from "../services/session.service";

export async function action({ request }: ActionFunctionArgs) {
  return await SessionService.logout(request);
}

export async function loader() {
  return new Response(null, { status: 404 });
}
