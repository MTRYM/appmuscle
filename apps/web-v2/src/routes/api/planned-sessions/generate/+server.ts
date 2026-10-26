import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SESSIONS = 500;

function isValidSession(s: any): boolean {
  return (
    s &&
    typeof s.dateISO === "string" &&
    DATE_RE.test(s.dateISO) &&
    Number.isInteger(s.cycleIndex) &&
    Number.isInteger(s.sessionIndex) &&
    typeof s.cycleName === "string" &&
    typeof s.sessionName === "string" &&
    typeof s.jour === "string"
  );
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const sessions = Array.isArray(body) ? body : [];

  if (sessions.length > MAX_SESSIONS || !sessions.every(isValidSession)) {
    return json({ error: "Planning invalide." }, { status: 400 });
  }

  const now = new Date().toISOString();

  const count = await prisma.$transaction(async (tx) => {
    // 1. Supprime les séances à venir non commencées.
    //    On ne supprime jamais une séance liée à une séance réalisée / en cours
    //    (sinon erreur de clé étrangère et perte d'historique).
    await tx.plannedSession.deleteMany({
      where: { status: "pending", workoutSessions: { none: {} } },
    });

    // 2. Évite les doublons avec les séances conservées (faites, loupées ou liées).
    const kept = await tx.plannedSession.findMany({
      select: { dateISO: true, cycleIndex: true, sessionIndex: true },
    });
    const keptKeys = new Set(kept.map((k) => `${k.dateISO}|${k.cycleIndex}|${k.sessionIndex}`));

    // 3. Insertion avec liste blanche de champs (pas de champs arbitraires du client).
    const data = sessions
      .filter((s: any) => !keptKeys.has(`${s.dateISO}|${s.cycleIndex}|${s.sessionIndex}`))
      .map((s: any) => ({
        dateISO: s.dateISO,
        cycleIndex: s.cycleIndex,
        sessionIndex: s.sessionIndex,
        cycleName: s.cycleName,
        sessionName: s.sessionName,
        jour: s.jour,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      }));

    if (data.length > 0) {
      await tx.plannedSession.createMany({ data });
    }
    return data.length;
  });

  return json({ success: true, count });
};
