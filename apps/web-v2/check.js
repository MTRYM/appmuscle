const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ws = await prisma.workoutSession.count();
  const ps = await prisma.plannedSession.count();
  const sets = await prisma.performedSet.count();
  console.log('workoutSessions:', ws);
  console.log('plannedSessions:', ps);
  console.log('performedSets:', sets);
}

main().finally(() => prisma.$disconnect());
