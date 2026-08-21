import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import crypto from "crypto";

// GET /api/sessions — list sessions (with optional date filter)
export const GET: RequestHandler = async ({ url }) => {
  try {
    const dateISO = url.searchParams.get("date");
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);

    const where: any = {};
    if (dateISO) where.dateISO = dateISO;
    if (status) where.status = status;

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
  } catch (err: any) {
    console.error("Erreur GET /api/sessions:", err);
    return json({ error: "Erreur serveur", message: err.message }, { status: 500 });
  }
};

// POST /api/sessions — create or update a session with performed sets
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const now = new Date().toISOString();

    const sessionId = body.id || crypto.randomUUID();
    const sets = Array.isArray(body.sets) ? body.sets : [];

    // Use a transaction to ensure atomic and reliable persistence
    const savedSession = await prisma.$transaction(async (tx) => {
      // 1. Create or update WorkoutSession
      const session = await tx.workoutSession.upsert({
        where: { id: sessionId },
        create: {
          id: sessionId,
          dateISO: body.dateISO || now.slice(0, 10),
          plannedSessionId: body.plannedSessionId || null,
          type: body.type || "planned",
          status: body.status || "completed",
          startedAt: body.startedAt || now,
          completedAt: body.completedAt || now,
          durationSec: body.durationSec !== undefined ? Number(body.durationSec) : null,
          avgRpe: body.avgRpe !== undefined && body.avgRpe !== null ? Number(body.avgRpe) : null,
          feedback: body.feedback || null,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          status: body.status || "completed",
          completedAt: body.completedAt || now,
          durationSec: body.durationSec !== undefined ? Number(body.durationSec) : null,
          avgRpe: body.avgRpe !== undefined && body.avgRpe !== null ? Number(body.avgRpe) : null,
          feedback: body.feedback || null,
          updatedAt: now,
        },
      });

      // 2. If sets are provided, replace them
      if (sets.length > 0) {
        await tx.performedSet.deleteMany({
          where: { sessionId: session.id },
        });

        for (let i = 0; i < sets.length; i++) {
          const s = sets[i];
          await tx.performedSet.create({
            data: {
              id: s.id || crypto.randomUUID(),
              sessionId: session.id,
              exerciseId: s.exerciseId || null,
              exerciseName: s.exerciseName || "Exercice",
              exerciseType: s.exerciseType || "reps",
              setNumber: s.setNumber !== undefined ? Number(s.setNumber) : i + 1,
              weight: s.weight !== undefined && s.weight !== null ? Number(s.weight) : 0,
              repsActual: s.repsActual !== undefined && s.repsActual !== null ? Number(s.repsActual) : 0,
              repsTarget: String(s.repsTarget || ""),
              rpe: s.rpe !== undefined && s.rpe !== null ? Number(s.rpe) : null,
              restSecActual: s.restSecActual !== undefined && s.restSecActual !== null ? Number(s.restSecActual) : null,
              createdAt: now,
              updatedAt: now,
            },
          });
        }
      }

      // 3. Mark planned session as done if completed
      if (body.status === "completed" && body.plannedSessionId) {
        try {
          await tx.plannedSession.update({
            where: { id: body.plannedSessionId },
            data: {
              status: "done",
              updatedAt: now,
            },
          });
        } catch (planErr) {
          console.warn("Could not update plannedSession status:", planErr);
        }
      }

      return session;
    });

    return json({
      success: true,
      id: savedSession.id,
      ...savedSession,
    });
  } catch (err: any) {
    console.error("Erreur POST /api/sessions:", err);
    return json(
      {
        error: "Erreur lors de la sauvegarde de la séance",
        message: err.message || "Erreur serveur inconnue",
      },
      { status: 500 }
    );
  }
};

// DELETE /api/sessions?id=xxx — delete a session and its performed sets
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const id = url.searchParams.get("id");
    if (!id) {
      return json({ error: "id requis" }, { status: 400 });
    }

    const now = new Date().toISOString();

    await prisma.$transaction(async (tx) => {
      // 1. Find the session to get plannedSessionId before deleting
      const session = await tx.workoutSession.findUnique({
        where: { id },
        select: { plannedSessionId: true, status: true },
      });

      if (!session) {
        throw new Error("Séance introuvable");
      }

      // 2. Delete all performed sets for this session
      await tx.performedSet.deleteMany({
        where: { sessionId: id },
      });

      // 3. Delete the workout session itself
      await tx.workoutSession.delete({
        where: { id },
      });

      // 4. If it was linked to a planned session, revert its status
      if (session.plannedSessionId) {
        try {
          const planned = await tx.plannedSession.findUnique({
            where: { id: session.plannedSessionId },
          });
          if (planned) {
            // Determine new status: if session date is before today, mark missed; otherwise pending
            const todayISO = new Date().toISOString().slice(0, 10);
            const newStatus = planned.dateISO < todayISO ? "missed" : "pending";
            await tx.plannedSession.update({
              where: { id: session.plannedSessionId },
              data: { status: newStatus, updatedAt: now },
            });
          }
        } catch (planErr) {
          console.warn("Could not revert plannedSession status:", planErr);
        }
      }
    });

    return json({ success: true, id });
  } catch (err: any) {
    console.error("Erreur DELETE /api/sessions:", err);
    return json(
      {
        error: "Erreur lors de la suppression de la séance",
        message: err.message || "Erreur serveur inconnue",
      },
      { status: 500 }
    );
  }
};
