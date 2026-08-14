import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

export const GET: RequestHandler = async () => {
  const exercises = await prisma.exercise.findMany({
    orderBy: { name: "asc" },
  });

  return json(exercises);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const now = new Date().toISOString();

  // Support bulk creation (used during import/migration)
  if (Array.isArray(body)) {
    const results = [];
    for (const item of body) {
      const ex = await prisma.exercise.upsert({
        where: { name: item.name }, // Use name as unique identifier for upsert
        create: {
          id: item.id,
          name: item.name,
          type: item.type || "reps",
          createdAt: item.createdAt || now,
          updatedAt: now,
        },
        update: {
          type: item.type,
          updatedAt: now,
        },
      });
      results.push(ex);
    }
    return json({ success: true, count: results.length });
  }

  const exercise = await prisma.exercise.upsert({
    where: { name: body.name },
    create: {
      id: body.id,
      name: body.name,
      type: body.type || "reps",
      createdAt: body.createdAt || now,
      updatedAt: now,
    },
    update: {
      type: body.type,
      updatedAt: now,
    },
  });

  return json(exercise);
};
