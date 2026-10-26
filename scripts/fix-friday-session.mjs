import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== MISE À JOUR DE LA SÉANCE DU VENDREDI 21 AOÛT 2026 ===");
  
  // 1. Mettre à jour la PlannedSession du vendredi 21 août en 'done'
  const updatedPlanned = await prisma.plannedSession.update({
    where: { id: '88d95d05-4ca7-4c19-bcf7-fac6fc21c4e1' },
    data: {
      status: 'done',
      updatedAt: new Date().toISOString()
    }
  });
  console.log(`✅ PlannedSession ${updatedPlanned.id} (${updatedPlanned.dateISO} ${updatedPlanned.jour}) mise à jour avec succès : status = "${updatedPlanned.status}"`);

  // 2. Vérifier que la WorkoutSession correspondante est bien 'completed'
  const workout = await prisma.workoutSession.findFirst({
    where: { plannedSessionId: '88d95d05-4ca7-4c19-bcf7-fac6fc21c4e1' }
  });
  if (workout && workout.status !== 'completed') {
    await prisma.workoutSession.update({
      where: { id: workout.id },
      data: { status: 'completed', updatedAt: new Date().toISOString() }
    });
    console.log(`✅ WorkoutSession ${workout.id} mise à jour en 'completed'`);
  } else if (workout) {
    console.log(`✅ WorkoutSession ${workout.id} était déjà en 'completed' avec ${workout.durationSec}s et 11 séries.`);
  }

  // 3. Vérification des séances planifiées
  const plannedSessions = await prisma.plannedSession.findMany({
    where: { dateISO: { in: ['2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23'] } },
    orderBy: { dateISO: 'asc' }
  });

  console.log("\n--- Statut Semaine 1 ---");
  plannedSessions.forEach(p => {
    console.log(`- ${p.dateISO} (${p.jour}) : ${p.sessionName} -> Statut : [${p.status.toUpperCase()}]`);
  });

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
