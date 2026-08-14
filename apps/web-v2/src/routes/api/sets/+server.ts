import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

// GET /api/sets?sessionId=xxx
export const GET: RequestHandler = async ({ url }) => {
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return json({ error: "sessionId requis" }, { status: 400 });
  }

  const sets = await prisma.performedSet.findMany({
    where: { sessionId },
    orderBy: [{ exerciseName: "asc" }, { setNumber: "asc" }],
  });

  return json(sets);
};

// POST /api/sets — create or update a set
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const now = new Date().toISOString();

  const set = await prisma.performedSet.upsert({
    where: { id: body.id },
    create: {
      id: body.id,
      sessionId: body.sessionId,
      exerciseId: body.exerciseId || null,
      exerciseName: body.exerciseName,
      exerciseType: body.exerciseType || "reps",
      setNumber: body.setNumber,
      weight: body.weight,
      repsActual: body.repsActual,
      repsTarget: body.repsTarget || "",
      rpe: body.rpe || null,
      restSecActual: body.restSecActual || null,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      weight: body.weight,
      repsActual: body.repsActual,
      rpe: body.rpe,
      restSecActual: body.restSecActual,
      updatedAt: now,
    },
  });

  return json(set);
};

// DELETE /api/sets?id=xxx
export const DELETE: RequestHandler = async ({ url }) => {
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "id requis" }, { status: 400 });

  await prisma.performedSet.delete({ where: { id } });
  return json({ success: true });
};
