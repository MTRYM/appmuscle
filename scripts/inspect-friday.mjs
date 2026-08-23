import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = 'postgres://d3339c053a51d317cab3801f4f0326c7a4320fbaf0c7bf88604d211a0f2a686e:sk_Bepyg18Y4P-vrX8qYSHpz@db.prisma.io:5432/postgres?sslmode=require';

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
