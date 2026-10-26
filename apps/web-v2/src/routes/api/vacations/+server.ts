import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_VACATION_DAYS = 90;
const DAY_MS = 86_400_000;

/** Parse "YYYY-MM-DD" en timestamp UTC, ou null si la date n'existe pas (ex: 2026-02-31). */
function parseISO(value: unknown): number | null {
  if (typeof value !== "string" || !DATE_RE.test(value)) return null;
  const t = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10) === value ? t : null;
}

function addDaysISO(dateISO: string, days: number): string {
  return new Date(Date.parse(`${dateISO}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export const GET: RequestHandler = async () => {
  const vacations = await prisma.vacation.findMany({
    orderBy: { startDateISO: "asc" },
  });
  return json(vacations);
};

/**
 * Ajoute une période de vacances et décale d'autant les séances "pending"
 * dont la date est >= au départ. Les séances déjà faites / loupées ne sont jamais touchées.
 */
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const start = parseISO(body?.startDateISO);
  const end = parseISO(body?.endDateISO);

  if (start === null || end === null) {
    return json({ error: "Dates invalides." }, { status: 400 });
  }
  if (end < start) {
    return json({ error: "La date de retour doit être après le départ." }, { status: 400 });
  }

  const days = Math.round((end - start) / DAY_MS) + 1;
  if (days > MAX_VACATION_DAYS) {
    return json({ error: `Maximum ${MAX_VACATION_DAYS} jours.` }, { status: 400 });
  }

  const startDateISO = body.startDateISO as string;
  const endDateISO = body.endDateISO as string;
  const now = new Date().toISOString();

  const shiftedSessions = await prisma.$transaction(async (tx) => {
    const toShift = await tx.plannedSession.findMany({
      where: { status: "pending", dateISO: { gte: startDateISO } },
      select: { id: true, dateISO: true },
    });

    for (const s of toShift) {
      await tx.plannedSession.update({
        where: { id: s.id },
        data: { dateISO: addDaysISO(s.dateISO, days), updatedAt: now },
      });
    }

    await tx.vacation.create({
      data: {
        startDateISO,
        endDateISO,
        days,
        shiftedSessions: toShift.length,
        createdAt: now,
        updatedAt: now,
      },
    });

    return toShift.length;
  });

  return json({ days, shiftedSessions });
};
