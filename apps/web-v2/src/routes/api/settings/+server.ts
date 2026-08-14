import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

export const GET: RequestHandler = async () => {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "main" },
  });

  if (!settings) {
    return json(
      {
        id: "main",
        programStartDate: null,
        theme: "dark",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }

  return json(settings);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const now = new Date().toISOString();

  const settings = await prisma.appSettings.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      programStartDate: body.programStartDate || null,
      theme: body.theme || "dark",
      createdAt: now,
      updatedAt: now,
    },
    update: {
      programStartDate: body.programStartDate !== undefined ? body.programStartDate : undefined,
      theme: body.theme !== undefined ? body.theme : undefined,
      updatedAt: now,
    },
  });

  return json(settings);
};
