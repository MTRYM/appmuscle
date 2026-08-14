import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

export const POST: RequestHandler = async ({ request }) => {
  const data = await request.json();

  if (!data) return json({ error: "Aucune donnée" }, { status: 400 });

  try {
    const tables = data.tables || data; // handle different export formats

    // 1. D'abord les séances planifiées (car workoutSession dépend de plannedSession)
    const exportPlanned = tables.plannedSessions || tables.plannedWorkouts;
    if (exportPlanned) {
      for (const p of exportPlanned) {
        await prisma.plannedSession.upsert({
          where: { id: String(p.id) },
          create: {
            id: String(p.id),
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

    // 2. Ensuite les séances réalisées (qui dépendent potentiellement de plannedSession)
    const exportSessions = tables.sessions || tables.workoutSessions;
    if (exportSessions) {
      for (const session of exportSessions) {
        await prisma.workoutSession.upsert({
          where: { id: String(session.id) },
          create: {
            id: String(session.id),
            dateISO: session.dateISO,
            plannedSessionId: session.plannedSessionId ? String(session.plannedSessionId) : null,
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

    // 3. Enfin les séries (qui dépendent de workoutSession)
    const exportSets = tables.sets || tables.performedSets;
    if (exportSets) {
      for (const set of exportSets) {
        await prisma.performedSet.upsert({
          where: { id: String(set.id) },
          create: {
            id: String(set.id),
            sessionId: String(set.sessionId),
            exerciseId: set.exerciseId ? String(set.exerciseId) : null,
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

    return json({ success: true });
  } catch (err: any) {
    console.error("Import error", err);
    return json({ error: err.message }, { status: 500 });
  }
};
