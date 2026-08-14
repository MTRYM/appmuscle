import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const sessions = Array.isArray(body) ? body : [];

  const now = new Date().toISOString();

  // 1. Delete all currently pending planned sessions to avoid duplicates
  await prisma.plannedSession.deleteMany({
    where: { status: "pending" }
  });

  // 2. Insert the new sessions in bulk
  if (sessions.length > 0) {
    // Generate UUIDs for them if missing and add timestamps
    const dataToInsert = sessions.map((s: any) => ({
      ...s,
      createdAt: now,
      updatedAt: now,
    }));

    await prisma.plannedSession.createMany({
      data: dataToInsert,
    });
  }

  return json({ success: true, count: sessions.length });
};
