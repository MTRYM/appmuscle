import { prisma } from "../src/lib/prisma.js";

async function main() {
  console.log("Seeding database...");

  // Upsert a test CoachMemory
  await prisma.coachMemory.upsert({
    where: { id: "test-memory-1" },
    update: {},
    create: {
      id: "test-memory-1",
      category: "preference",
      content: "L'utilisateur préfère s'entraîner le matin.",
      sourceType: "user_stated",
      confidence: "high",
      status: "confirmed",
      createdAt: new Date().toISOString(),
    },
  });

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
