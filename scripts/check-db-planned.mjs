import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('./apps/web-v2/node_modules/@prisma/client');
import dotenv from 'dotenv';
dotenv.config({ path: './apps/web-v2/.env' });

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.plannedSession.count();
  const byStatus = await prisma.plannedSession.groupBy({
    by: ['status'],
    _count: { id: true },
  });
  const firstLast = await prisma.plannedSession.findMany({
    orderBy: { dateISO: 'asc' },
    take: 5,
  });
  const last = await prisma.plannedSession.findMany({
    orderBy: { dateISO: 'desc' },
    take: 5,
  });
  const settings = await prisma.setting.findMany();

  console.log('Total planned sessions:', count);
  console.log('By status:', byStatus);
  console.log('First 5:', firstLast.map(s => ({ date: s.dateISO, name: s.sessionName, status: s.status })));
  console.log('Last 5:', last.map(s => ({ date: s.dateISO, name: s.sessionName, status: s.status })));
  console.log('Settings:', settings);
}

main().catch(console.error).finally(() => prisma.$disconnect());
