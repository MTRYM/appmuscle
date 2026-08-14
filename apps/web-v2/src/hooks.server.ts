import type { Handle } from "@sveltejs/kit";
import { verifySessionToken } from "$lib/server/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return resolve(event);
  }

  // Allow static assets
  if (pathname.startsWith("/_app") || pathname.startsWith("/favicon")) {
    return resolve(event);
  }

  // Check auth cookie
  const token = event.cookies.get("session");
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    event.cookies.delete("session", { path: "/" });
    if (pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Session expirée" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }

  // Attach user info to locals
  event.locals.userId = payload.sub;

  return resolve(event);
};
