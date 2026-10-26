import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const fridayPlanned = await prisma.plannedSession.findUnique({
    where: { id: '88d95d05-4ca7-4c19-bcf7-fac6fc21c4e1' },
    include: { workoutSessions: { include: { performedSets: true } } }
  });
  console.log("Friday Planned:", JSON.stringify(fridayPlanned, null, 2));

  const allFridayWorkouts = await prisma.workoutSession.findMany({
    where: { dateISO: '2026-08-21' },
    include: { performedSets: true }
  });
  console.log("All Friday Workouts:", JSON.stringify(allFridayWorkouts, null, 2));

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
