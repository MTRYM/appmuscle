import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  verifyPassword,
  createSessionToken,
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
  hashPassword,
} from "$lib/server/auth";
import { prisma } from "$lib/server/prisma";

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  const ip = getClientAddress();

  // Rate limiting
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    const retryMin = Math.ceil((rl.retryAfterMs || 0) / 60000);
    return json(
      { error: `Trop de tentatives. Réessayez dans ${retryMin} min.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.password) {
    return json({ error: "Mot de passe requis." }, { status: 400 });
  }

  // Get or create user (single-user app)
  let user = await prisma.appUser.findFirst();

  if (!user) {
    // First login → create the account with this password
    const hash = hashPassword(body.password);
    user = await prisma.appUser.create({
      data: { passwordHash: hash },
    });
  } else {
    // Verify password
    if (!verifyPassword(body.password, user.passwordHash)) {
      recordFailedAttempt(ip);
      return json({ error: "Mot de passe incorrect." }, { status: 401 });
    }
  }

  clearAttempts(ip);

  // Create JWT token
  const token = createSessionToken(user.id);

  // Set httpOnly secure cookie
  cookies.set("session", token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return json({ success: true });
};

export const DELETE: RequestHandler = async ({ cookies }) => {
  cookies.delete("session", { path: "/" });
  return json({ success: true });
};
