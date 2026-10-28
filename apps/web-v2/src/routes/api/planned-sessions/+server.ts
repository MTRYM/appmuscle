import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

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

// GET /api/planned-sessions — list planned sessions with automatic missed sync
export const GET: RequestHandler = async ({ url }) => {
  const dateISO = url.searchParams.get("date");
  const status = url.searchParams.get("status");
  const limit = parseInt(url.searchParams.get("limit") || "200", 10);

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);

  // 1. Automatically mark past pending sessions as missed
  try {
    await prisma.plannedSession.updateMany({
      where: {
        status: "pending",
        dateISO: { lt: todayISO },
      },
      data: {
        status: "missed",
        updatedAt: now.toISOString(),
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
