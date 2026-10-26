import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== INSPECTION DE LA BASE DE DONNÉES ===");
  
  const plannedSessions = await prisma.plannedSession.findMany({
    orderBy: { dateISO: 'asc' }
  });
  console.log(`Total planned sessions: ${plannedSessions.length}`);
  plannedSessions.slice(0, 10).forEach(p => {
    console.log(`[Planned] ${p.dateISO} (${p.jour}) - ${p.sessionName} | Status: ${p.status} | ID: ${p.id}`);
  });

  const workoutSessions = await prisma.workoutSession.findMany({
    include: { performedSets: true },
    orderBy: { dateISO: 'desc' }
  });
  console.log(`\nTotal workout sessions: ${workoutSessions.length}`);
  workoutSessions.forEach(w => {
    console.log(`[Workout] ${w.dateISO} - Type: ${w.type} | Status: ${w.status} | Duration: ${w.durationSec}s | Sets: ${w.performedSets.length} | PlannedSessionId: ${w.plannedSessionId}`);
  });

  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
