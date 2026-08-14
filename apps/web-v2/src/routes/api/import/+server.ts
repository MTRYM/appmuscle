import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

export const POST: RequestHandler = async ({ request }) => {
  const data = await request.json();

  if (!data) return json({ error: "Aucune donnée" }, { status: 400 });

  try {
    const tables = data.tables || data; // handle different export formats

    // We only import workoutSessions, performedSets, plannedWorkouts for now
    if (tables.workoutSessions) {
      for (const session of tables.workoutSessions) {
        await prisma.workoutSession.upsert({
          where: { id: session.id },
          create: {
            id: session.id,
            dateISO: session.dateISO,
            plannedSessionId: session.plannedSessionId,
            type: session.type,
            status: session.status,
            startedAt: session.startedAt,
            completedAt: session.completedAt,
            durationSec: session.durationSec,
            avgRpe: session.avgRpe,
            feedback: session.feedback,
            createdAt: session.createdAt || new Date().toISOString(),
            updatedAt: session.updatedAt || new Date().toISOString(),
          },
          update: {},
        });
      }
    }

    if (tables.performedSets) {
      for (const set of tables.performedSets) {
        await prisma.performedSet.upsert({
          where: { id: set.id },
          create: {
            id: set.id,
            sessionId: set.sessionId,
            exerciseId: set.exerciseId,
            exerciseName: set.exerciseName,
            exerciseType: set.exerciseType,
            setNumber: set.setNumber,
            weight: set.weight,
            repsActual: set.repsActual,
            repsTarget: set.repsTarget,
            rpe: set.rpe,
            restSecActual: set.restSecActual,
            createdAt: set.createdAt || new Date().toISOString(),
            updatedAt: set.updatedAt || new Date().toISOString(),
          },
          update: {},
        });
      }
    }

    if (tables.plannedWorkouts) {
      for (const p of tables.plannedWorkouts) {
        await prisma.plannedSession.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            dateISO: p.dateISO,
            cycleIndex: p.cycleIndex,
            sessionIndex: p.sessionIndex,
            cycleName: p.cycleName,
            sessionName: p.sessionName,
            jour: p.jour,
            status: p.status,
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: p.updatedAt || new Date().toISOString(),
          },
          update: {},
        });
      }
    }

    return json({ success: true });
  } catch (err: any) {
    console.error("Import error", err);
    return json({ error: err.message }, { status: 500 });
  }
};
