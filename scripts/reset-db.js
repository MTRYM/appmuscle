import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";
import crypto from "crypto";

const DATABASE_URL = 'postgres://d3339c053a51d317cab3801f4f0326c7a4320fbaf0c7bf88604d211a0f2a686e:sk_Bepyg18Y4P-vrX8qYSHpz@db.prisma.io:5432/postgres?sslmode=require';

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JOUR_OFFSET = {
  Lundi: 0,
  Mardi: 1,
  Mercredi: 2,
  Jeudi: 3,
  Vendredi: 4,
  Samedi: 5,
  Dimanche: 6,
};

function getMonday(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toISODate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function main() {
  console.log("🚀 Starting complete database reset for 17 Août 2026...");

  // 1. Delete all old workout data
  console.log("🧹 Cleaning old workout tables...");
  await prisma.performedSet.deleteMany({});
  await prisma.workoutSession.deleteMany({});
  await prisma.plannedSession.deleteMany({});
  await prisma.personalRecord.deleteMany({});
  await prisma.checkIn.deleteMany({});
  await prisma.measurement.deleteMany({});
  await prisma.vacation.deleteMany({});

  // 2. Set AppSettings with programStartDate: 2026-08-17
  const now = new Date().toISOString();
  console.log("⚙️ Setting programStartDate to 2026-08-17...");
  await prisma.appSettings.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      programStartDate: "2026-08-17",
      theme: "dark",
      createdAt: now,
      updatedAt: now,
    },
    update: {
      programStartDate: "2026-08-17",
      theme: "dark",
      updatedAt: now,
    },
  });

  // 3. Load programme.yaml
  const yamlPath = path.resolve("apps/web-v2/programme.yaml");
  const yamlContent = fs.readFileSync(yamlPath, "utf8");
  const raw = yaml.load(yamlContent);

  const weekStart = getMonday("2026-08-17");
  const plannedSessions = [];

  for (const [cycleIndex, cycle] of raw.cycles.entries()) {
    for (const [sessionIndex, seance] of cycle.seances.entries()) {
      const jour = seance.jour?.trim();
      const jourOffset = JOUR_OFFSET[jour] ?? 0;
      const offset = cycleIndex * 7 + jourOffset;
      const sessionDate = addDays(weekStart, offset);
      const dateISO = toISODate(sessionDate);

      plannedSessions.push({
        id: crypto.randomUUID(),
        dateISO,
        cycleIndex,
        sessionIndex,
        cycleName: cycle.nom,
        sessionName: seance.nom,
        jour,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Sort by date
  plannedSessions.sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  console.log(`📅 Inserting ${plannedSessions.length} planned sessions starting on 2026-08-17...`);
  await prisma.plannedSession.createMany({
    data: plannedSessions,
  });

  console.log("✅ Reset completed successfully!");
  console.log(`First planned session: ${plannedSessions[0]?.dateISO} (${plannedSessions[0]?.jour} — ${plannedSessions[0]?.sessionName})`);
  console.log(`Last planned session: ${plannedSessions[plannedSessions.length - 1]?.dateISO}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Reset failed:", err);
  process.exit(1);
});
