import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

const ALLOWED_MEASUREMENT_TYPES = [
  "cou",
  "epaules",
  "poitrine",
  "bras",
  "bras_repos",
  "avant_bras",
  "taille",
  "hanches",
  "cuisses",
  "mollets",
];

// Valeurs initiales issues du fichier AthleteProfil
const INITIAL_ATHLETE_PROFILE = {
  age: 16,
  heightCm: 193,
  targetWeightKg: 88,
  targetWeightRange: "85–90 kg",
  wingspanCm: 195,
  legLengthCm: 95,
  armLengthCm: 52,
  armLengthWithShoulderCm: 64,
};

const INITIAL_WEIGHT_KG = 83;

const INITIAL_MEASUREMENTS: Array<{ type: string; value: number }> = [
  { type: "cou", value: 37 },
  { type: "poitrine", value: 96 },
  { type: "taille", value: 79 },
  { type: "bras", value: 37 },
  { type: "bras_repos", value: 32 },
  { type: "cuisses", value: 59 },
];

// GET /api/body — get athlete profile, weight check-ins, and body measurements (auto-seeds from AthleteProfil if empty)
export const GET: RequestHandler = async () => {
  try {
    let [profileRow, checkIns, measurements] = await Promise.all([
      prisma.athleteProfile.findUnique({ where: { id: "main" } }).catch(() => null),
      prisma.checkIn.findMany({ orderBy: { dateISO: "asc" } }),
      prisma.measurement.findMany({ orderBy: { dateISO: "asc" } }),
    ]);

    const now = new Date().toISOString();
    const seedDateISO = now.slice(0, 10);

    // 1. Auto-seed AthleteProfile if not yet initialized
    if (!profileRow) {
      try {
        profileRow = await prisma.athleteProfile.upsert({
          where: { id: "main" },
          create: {
            id: "main",
            data: JSON.stringify(INITIAL_ATHLETE_PROFILE),
            createdAt: now,
            updatedAt: now,
          },
          update: {},
        });
      } catch (e) {
        console.warn("Auto-seed athleteProfile warning:", e);
      }
    }

    // 2. Auto-seed initial Weight CheckIn (83 kg) if none exists
    if (checkIns.length === 0) {
      try {
        const createdWeight = await prisma.checkIn.create({
          data: {
            dateISO: seedDateISO,
            weight: INITIAL_WEIGHT_KG,
            notes: "Profil athlète initial",
            createdAt: now,
            updatedAt: now,
          },
        });
        checkIns = [createdWeight];
      } catch (e) {
        console.warn("Auto-seed checkIn warning:", e);
      }
    }

    // 3. Auto-seed initial Measurements from AthleteProfil if none exist
    if (measurements.length === 0) {
      try {
        const createdList = [];
        for (const item of INITIAL_MEASUREMENTS) {
          const created = await prisma.measurement.create({
            data: {
              dateISO: seedDateISO,
              type: item.type,
              value: item.value,
              createdAt: now,
              updatedAt: now,
            },
          });
          createdList.push(created);
        }
        measurements = createdList;
      } catch (e) {
        console.warn("Auto-seed measurements warning:", e);
      }
    }

    let profile = { ...INITIAL_ATHLETE_PROFILE };
    if (profileRow?.data) {
      try {
        const parsed = JSON.parse(profileRow.data);
        profile = {
          ...INITIAL_ATHLETE_PROFILE,
          ...parsed,
          heightCm: parsed.heightCm ?? INITIAL_ATHLETE_PROFILE.heightCm,
          targetWeightKg: parsed.targetWeightKg ?? INITIAL_ATHLETE_PROFILE.targetWeightKg,
          wingspanCm: parsed.wingspanCm ?? INITIAL_ATHLETE_PROFILE.wingspanCm,
          legLengthCm: parsed.legLengthCm ?? INITIAL_ATHLETE_PROFILE.legLengthCm,
          armLengthCm: parsed.armLengthCm ?? INITIAL_ATHLETE_PROFILE.armLengthCm,
          armLengthWithShoulderCm:
            parsed.armLengthWithShoulderCm ?? INITIAL_ATHLETE_PROFILE.armLengthWithShoulderCm,
        };
      } catch {
        // Fallback to INITIAL_ATHLETE_PROFILE
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

// POST /api/body — save profile (height, wingspan, etc.), weight check-in, or body measurement
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ error: "Requête invalide" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const todayISO = now.slice(0, 10);

  try {
    // 1. Update profile (Taille / Objectif poids / Envergure / Segments)
    if (body.kind === "profile") {
      const existing = await prisma.athleteProfile
        .findUnique({ where: { id: "main" } })
        .catch(() => null);

      let currentData: Record<string, any> = { ...INITIAL_ATHLETE_PROFILE };
      if (existing?.data) {
        try {
          currentData = { ...INITIAL_ATHLETE_PROFILE, ...JSON.parse(existing.data) };
        } catch {
          currentData = { ...INITIAL_ATHLETE_PROFILE };
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

      if (body.wingspanCm !== undefined) {
        const w =
          body.wingspanCm === null || body.wingspanCm === "" ? null : Number(body.wingspanCm);
        if (w !== null && !Number.isNaN(w) && w >= 50 && w <= 280) {
          currentData.wingspanCm = w;
        }
      }

      if (body.legLengthCm !== undefined) {
        const l =
          body.legLengthCm === null || body.legLengthCm === "" ? null : Number(body.legLengthCm);
        if (l !== null && !Number.isNaN(l) && l >= 30 && l <= 160) {
          currentData.legLengthCm = l;
        }
      }

      if (body.armLengthCm !== undefined) {
        const a =
          body.armLengthCm === null || body.armLengthCm === "" ? null : Number(body.armLengthCm);
        if (a !== null && !Number.isNaN(a) && a >= 20 && a <= 120) {
          currentData.armLengthCm = a;
        }
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
