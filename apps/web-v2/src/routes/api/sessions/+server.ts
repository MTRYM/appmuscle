import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

// GET /api/sessions — list sessions (with optional date filter)
export const GET: RequestHandler = async ({ url }) => {
  const dateISO = url.searchParams.get("date");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  const where = dateISO ? { dateISO } : {};

  const sessions = await prisma.workoutSession.findMany({
    where,
    include: {
      performedSets: { orderBy: { setNumber: "asc" } },
      plannedSession: true,
    },
    orderBy: { dateISO: "desc" },
    take: limit,
  });

  return json(sessions);
};

// POST /api/sessions — create or update a session
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const now = new Date().toISOString();

  const session = await prisma.workoutSession.upsert({
    where: { id: body.id },
    create: {
      id: body.id,
      dateISO: body.dateISO,
      plannedSessionId: body.plannedSessionId || null,
      type: body.type || "planned",
      status: body.status || "in_progress",
      startedAt: body.startedAt || now,
      completedAt: body.completedAt || null,
      durationSec: body.durationSec || null,
      avgRpe: body.avgRpe || null,
      feedback: body.feedback || null,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      status: body.status,
      completedAt: body.completedAt,
      durationSec: body.durationSec,
      avgRpe: body.avgRpe,
      feedback: body.feedback,
      updatedAt: now,
    },
  });

  return json(session);
};
