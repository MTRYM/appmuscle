import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  try {
    const memory = await prisma.coachMemory.findFirst();
    console.log("✅ Connected");
    if (memory) {
      console.log(`Found memory: ${memory.id}`);
    } else {
      console.log("No memories found, but connection succeeded.");
    }
  } catch (error) {
    console.error("❌ Connection failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
