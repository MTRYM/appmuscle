import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

// GET /api/planned-sessions — list planned sessions with automatic missed sync
export const GET: RequestHandler = async ({ url }) => {
  const dateISO = url.searchParams.get("date");
  const status = url.searchParams.get("status");
  const limit = parseInt(url.searchParams.get("limit") || "200", 10);

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);

  // 1. Automatically mark past pending sessions as missed
  try {
    await prisma.plannedSession.updateMany({
      where: {
        status: "pending",
        dateISO: { lt: todayISO },
      },
      data: {
        status: "missed",
        updatedAt: now.toISOString(),
      },
    });
  } catch (err) {
    console.warn("Could not auto-mark missed sessions:", err);
  }

  // 2. Query with applied filters
  const where: any = {};
  if (dateISO) where.dateISO = dateISO;
  if (status) where.status = status;

  const sessions = await prisma.plannedSession.findMany({
    where,
    orderBy: { dateISO: "asc" },
    take: limit,
  });

  return json(sessions);
};

// POST /api/planned-sessions — create or update
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const now = new Date().toISOString();

  // Support bulk upsert
  if (Array.isArray(body)) {
    const results = [];
    for (const item of body) {
      const session = await prisma.plannedSession.upsert({
        where: { id: item.id },
        create: { ...item, createdAt: item.createdAt || now, updatedAt: now },
        update: { ...item, updatedAt: now },
      });
      results.push(session);
    }
    return json({ success: true, count: results.length });
  }

  const session = await prisma.plannedSession.upsert({
    where: { id: body.id },
    create: { ...body, createdAt: body.createdAt || now, updatedAt: now },
    update: { ...body, updatedAt: now },
  });

  return json(session);
};

// PATCH /api/planned-sessions?id=xxx — update status
export const PATCH: RequestHandler = async ({ url, request }) => {
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "id requis" }, { status: 400 });

  const body = await request.json();
  const session = await prisma.plannedSession.update({
    where: { id },
    data: { ...body, updatedAt: new Date().toISOString() },
  });

  return json(session);
};
