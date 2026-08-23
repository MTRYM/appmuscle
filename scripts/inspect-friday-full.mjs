import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = 'postgres://d3339c053a51d317cab3801f4f0326c7a4320fbaf0c7bf88604d211a0f2a686e:sk_Bepyg18Y4P-vrX8qYSHpz@db.prisma.io:5432/postgres?sslmode=require';

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const sessions = await prisma.workoutSession.findMany({
    where: { dateISO: '2026-08-21' },
    include: { performedSets: true, plannedSession: true }
  });
  
  sessions.forEach(s => {
    console.log(`\nWorkoutSession ID: ${s.id}`);
    console.log(`Date: ${s.dateISO}, Type: ${s.type}, Status: ${s.status}, Duration: ${s.durationSec}s`);
    console.log(`PlannedSession: ${s.plannedSession?.sessionName} (${s.plannedSessionId}) - PlannedStatus: ${s.plannedSession?.status}`);
    console.log(`Sets (${s.performedSets.length}):`);
    s.performedSets.forEach(set => {
      console.log(`  ${set.setNumber}. ${set.exerciseName} - ${set.weight}kg x ${set.repsActual} (Target: ${set.repsTarget}, RPE: ${set.rpe})`);
    });
  });

  const fridayPlanned = await prisma.plannedSession.findFirst({
    where: { dateISO: '2026-08-21' }
  });
  console.log(`\nFriday Planned Session: ${fridayPlanned.id} (${fridayPlanned.sessionName}) -> Current Status: ${fridayPlanned.status}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
