import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

/**
 * Catch-all route for unmatched URLs
 * Handles requests like Chrome DevTools and other browser-specific requests
 */
export const loader = ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // Handle Chrome DevTools requests
  if (url.pathname.includes(".well-known")) {
    return json({}, { status: 404 });
  }
  
  // Handle other unmatched routes
  throw new Response("Not Found", { status: 404 });
};