import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import { parseProgramme } from "$lib/programme";

const WEEKDAYS_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

function getFrenchJour(dateISO: string): string {
  const d = new Date(`${dateISO}T12:00:00`);
  return WEEKDAYS_FR[d.getDay()] || "Lundi";
}

function addDaysISO(baseISO: string, days: number): string {
  const d = new Date(`${baseISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

let macrocycleCheckDone = false;

async function ensureMacrocycleSeeded(nowISO: string, todayISO: string) {
  if (macrocycleCheckDone) return;
  try {
    const existingMacroCount = await prisma.plannedSession.count({
      where: { cycleIndex: { gte: 6 } },
    });

    if (existingMacroCount > 0) {
      macrocycleCheckDone = true;
      return;
    }

    const programme = parseProgramme();

    // 1. Sync pending sessions of Cycles 3, 4, 5 (2026-10-27 → 2026-11-15) with updated v4.0 names
    for (const cycleIdx of [3, 4, 5]) {
      const cycle = programme.cycles[cycleIdx];
      if (!cycle) continue;
      for (const seance of cycle.seances) {
        await prisma.plannedSession.updateMany({
          where: {
            cycleIndex: cycleIdx,
            sessionIndex: seance.sessionIndex,
            dateISO: { gte: "2026-10-27" },
            status: "pending",
          },
          data: {
            cycleName: cycle.nom,
            sessionName: seance.nom,
            updatedAt: nowISO,
          },
        });
      }
    }

    // 2. Seed Cycles 6..18 (13-week Macrocycle: Monday 2026-11-16 → Sunday 2027-02-14, 78 sessions)
    const macrocycleMonday = "2026-11-16";
    const newSessions = [];

    for (const cycle of programme.cycles) {
      if (cycle.cycleIndex < 6) continue;
      const weekOffset = (cycle.cycleIndex - 6) * 7;
      for (const seance of cycle.seances) {
        const sessionDateISO = addDaysISO(macrocycleMonday, weekOffset + seance.jourOffset);
        newSessions.push({
          dateISO: sessionDateISO,
          cycleIndex: cycle.cycleIndex,
          sessionIndex: seance.sessionIndex,
          cycleName: cycle.nom,
          sessionName: seance.nom,
          jour: seance.jour,
          status: sessionDateISO < todayISO ? "missed" : "pending",
          createdAt: nowISO,
          updatedAt: nowISO,
        });
      }
    }

    if (newSessions.length > 0) {
      await prisma.plannedSession.createMany({ data: newSessions });
    }
    macrocycleCheckDone = true;
  } catch (err) {
    console.warn("Could not auto-seed 3-month macrocycle:", err);
  }
}

// GET /api/planned-sessions — list planned sessions with automatic missed sync
export const GET: RequestHandler = async ({ url }) => {
  const dateISO = url.searchParams.get("date");
  const status = url.searchParams.get("status");
  const limit = parseInt(url.searchParams.get("limit") || "500", 10);

  const now = new Date();
  const nowISO = now.toISOString();
  const todayISO = nowISO.slice(0, 10);

  // 0. Ensure 3-month macrocycle (Cycles 6..18: Nov 16, 2026 → Feb 14, 2027) is seeded in DB
  await ensureMacrocycleSeeded(nowISO, todayISO);

  // 1. Automatically mark past pending sessions as missed
  try {
    await prisma.plannedSession.updateMany({
      where: {
        status: "pending",
        dateISO: { lt: todayISO },
      },
      data: {
        status: "missed",
        updatedAt: nowISO,
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

// PATCH /api/planned-sessions?id=xxx — update status, move dateISO, or swap two sessions
export const PATCH: RequestHandler = async ({ url, request }) => {
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "id requis" }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const now = new Date();
  const nowISO = now.toISOString();
  const todayISO = nowISO.slice(0, 10);
  const allowedStatuses = ["pending", "done", "missed"];

  try {
    const existing = await prisma.plannedSession.findUnique({ where: { id } });
    if (!existing) {
      return json({ error: "Séance planifiée introuvable" }, { status: 404 });
    }

    // Case 1: Swap two planned sessions' dates
    if (body.swapWithId) {
      const target = await prisma.plannedSession.findUnique({
        where: { id: String(body.swapWithId) },
      });
      if (!target) {
        return json({ error: "Séance cible pour l'échange introuvable" }, { status: 404 });
      }

      const newDateForExisting = target.dateISO;
      const newDateForTarget = existing.dateISO;

      const statusForExisting =
        existing.status === "done"
          ? "done"
          : newDateForExisting >= todayISO
            ? "pending"
            : "missed";

      const statusForTarget =
        target.status === "done"
          ? "done"
          : newDateForTarget >= todayISO
            ? "pending"
            : "missed";

      const [updatedExisting, updatedTarget] = await prisma.$transaction([
        prisma.plannedSession.update({
          where: { id: existing.id },
          data: {
            dateISO: newDateForExisting,
            jour: getFrenchJour(newDateForExisting),
            status: statusForExisting,
            updatedAt: nowISO,
          },
        }),
        prisma.plannedSession.update({
          where: { id: target.id },
          data: {
            dateISO: newDateForTarget,
            jour: getFrenchJour(newDateForTarget),
            status: statusForTarget,
            updatedAt: nowISO,
          },
        }),
      ]);

      return json({ session: updatedExisting, swappedWith: updatedTarget });
    }

    // Case 2: Move dateISO and/or update status
    const updateData: Record<string, any> = { updatedAt: nowISO };

    if (body.dateISO !== undefined) {
      if (typeof body.dateISO !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.dateISO)) {
        return json({ error: "Format de date invalide (YYYY-MM-DD requis)" }, { status: 400 });
      }
      updateData.dateISO = body.dateISO;
      updateData.jour = getFrenchJour(body.dateISO);

      if (body.status && allowedStatuses.includes(body.status)) {
        updateData.status = body.status;
      } else if (existing.status !== "done") {
        updateData.status = body.dateISO >= todayISO ? "pending" : "missed";
      }
    } else if (body.status !== undefined) {
      if (!allowedStatuses.includes(body.status)) {
        return json({ error: "status invalide" }, { status: 400 });
      }
      updateData.status = body.status;
    } else {
      return json({ error: "Aucune modification fournie" }, { status: 400 });
    }

    const session = await prisma.plannedSession.update({
      where: { id },
      data: updateData,
    });

    return json(session);
  } catch (err: any) {
    console.error("Erreur PATCH planned-sessions:", err);
    return json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
};
