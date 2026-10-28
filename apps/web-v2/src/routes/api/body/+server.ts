import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

const ALLOWED_MEASUREMENT_TYPES = [
  "cou",
  "epaules",
  "poitrine",
  "bras",
  "avant_bras",
  "taille",
  "hanches",
  "cuisses",
  "mollets",
];

// GET /api/body — get athlete profile (height, targetWeight), weight check-ins, and body measurements
export const GET: RequestHandler = async () => {
  try {
    const [profileRow, checkIns, measurements] = await Promise.all([
      prisma.athleteProfile.findUnique({ where: { id: "main" } }).catch(() => null),
      prisma.checkIn.findMany({ orderBy: { dateISO: "asc" } }),
      prisma.measurement.findMany({ orderBy: { dateISO: "asc" } }),
    ]);

    let profile = { heightCm: null as number | null, targetWeightKg: null as number | null };
    if (profileRow?.data) {
      try {
        const parsed = JSON.parse(profileRow.data);
        profile = {
          heightCm: parsed.heightCm ?? null,
          targetWeightKg: parsed.targetWeightKg ?? null,
        };
      } catch {
        // Ignore malformed JSON
      }
    }

    return json({
      profile,
      checkIns,
      measurements,
    });
  } catch (err: any) {
    console.error("Erreur GET /api/body:", err);
    return json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
};

// POST /api/body — save profile (height), weight check-in, or body measurement
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "Requête invalide" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const todayISO = now.slice(0, 10);

  try {
    // 1. Update profile (Taille / Objectif poids)
    if (body.kind === "profile") {
      const existing = await prisma.athleteProfile
        .findUnique({ where: { id: "main" } })
        .catch(() => null);

      let currentData: Record<string, any> = {};
      if (existing?.data) {
        try {
          currentData = JSON.parse(existing.data);
        } catch {
          currentData = {};
        }
      }

      if (body.heightCm !== undefined) {
        const h = body.heightCm === null || body.heightCm === "" ? null : Number(body.heightCm);
        if (h !== null && (Number.isNaN(h) || h < 50 || h > 260)) {
          return json({ error: "Taille invalide (entre 50 et 260 cm)" }, { status: 400 });
        }
        currentData.heightCm = h;
      }

      if (body.targetWeightKg !== undefined) {
        const tw =
          body.targetWeightKg === null || body.targetWeightKg === ""
            ? null
            : Number(body.targetWeightKg);
        if (tw !== null && (Number.isNaN(tw) || tw < 20 || tw > 300)) {
          return json({ error: "Poids cible invalide" }, { status: 400 });
        }
        currentData.targetWeightKg = tw;
      }

      const serialized = JSON.stringify(currentData);
      await prisma.athleteProfile.upsert({
        where: { id: "main" },
        create: {
          id: "main",
          data: serialized,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          data: serialized,
          updatedAt: now,
        },
      });

      return json({ success: true, profile: currentData });
    }

    // 2. Save weight check-in
    if (body.kind === "weight") {
      const weight = Number(body.weight);
      if (Number.isNaN(weight) || weight < 20 || weight > 350) {
        return json({ error: "Poids invalide (entre 20 et 350 kg)" }, { status: 400 });
      }
      const dateISO =
        typeof body.dateISO === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dateISO)
          ? body.dateISO
          : todayISO;
      const notes = typeof body.notes === "string" ? body.notes.trim() : "";

      const existingOnDate = await prisma.checkIn.findFirst({
        where: { dateISO },
      });

      let saved;
      if (existingOnDate) {
        saved = await prisma.checkIn.update({
          where: { id: existingOnDate.id },
          data: { weight, notes: notes || existingOnDate.notes, updatedAt: now },
        });
      } else {
        saved = await prisma.checkIn.create({
          data: {
            dateISO,
            weight,
            notes,
            createdAt: now,
            updatedAt: now,
          },
        });
      }

      return json({ success: true, checkIn: saved });
    }

    // 3. Save body measurement (cm)
    if (body.kind === "measurement") {
      const type = String(body.type || "");
      if (!ALLOWED_MEASUREMENT_TYPES.includes(type)) {
        return json({ error: "Zone corporelle invalide" }, { status: 400 });
      }
      const value = Number(body.value);
      if (Number.isNaN(value) || value < 10 || value > 250) {
        return json({ error: "Mesure invalide (entre 10 et 250 cm)" }, { status: 400 });
      }
      const dateISO =
        typeof body.dateISO === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dateISO)
          ? body.dateISO
          : todayISO;

      const existingOnDate = await prisma.measurement.findFirst({
        where: { dateISO, type },
      });

      let saved;
      if (existingOnDate) {
        saved = await prisma.measurement.update({
          where: { id: existingOnDate.id },
          data: { value, updatedAt: now },
        });
      } else {
        saved = await prisma.measurement.create({
          data: {
            dateISO,
            type,
            value,
            createdAt: now,
            updatedAt: now,
          },
        });
      }

      return json({ success: true, measurement: saved });
    }

    return json({ error: "Type d'enregistrement inconnu" }, { status: 400 });
  } catch (err: any) {
    console.error("Erreur POST /api/body:", err);
    return json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
};

// DELETE /api/body?kind=weight|measurement&id=xxx
export const DELETE: RequestHandler = async ({ url }) => {
  const kind = url.searchParams.get("kind");
  const id = url.searchParams.get("id");

  if (!id || !kind) {
    return json({ error: "Paramètres kind et id requis" }, { status: 400 });
  }

  try {
    if (kind === "weight") {
      await prisma.checkIn.delete({ where: { id } });
      return json({ success: true });
    }
    if (kind === "measurement") {
      await prisma.measurement.delete({ where: { id } });
      return json({ success: true });
    }
    return json({ error: "Type invalide" }, { status: 400 });
  } catch (err: any) {
    console.error("Erreur DELETE /api/body:", err);
    return json({ error: err.message || "Erreur lors de la suppression" }, { status: 500 });
  }
};
