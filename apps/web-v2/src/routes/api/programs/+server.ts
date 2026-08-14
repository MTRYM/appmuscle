import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

export const GET: RequestHandler = async () => {
  const programs = await prisma.program.findMany({
    include: {
      blocks: {
        orderBy: { order: "asc" },
        include: {
          templates: {
            include: {
              exercises: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  });

  return json(programs);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const now = new Date().toISOString();

  // For simplicity, just creating a new program or updating an existing one
  const program = await prisma.program.upsert({
    where: { id: body.id },
    create: {
      id: body.id,
      name: body.name,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      name: body.name,
      updatedAt: now,
    },
  });

  return json(program);
};
