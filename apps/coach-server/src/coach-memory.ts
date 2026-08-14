import { prisma } from './lib/prisma.js';

export class CoachMemoryService {
  async propose(memory: {
    id: string;
    category: string;
    content: string;
    sourceType: string;
    confidence?: string;
    expiresAt?: string;
  }) {
    await prisma.coachMemory.create({
      data: {
        id: memory.id,
        category: memory.category,
        content: memory.content,
        sourceType: memory.sourceType,
        confidence: memory.confidence ?? 'medium',
        status: 'candidate',
        createdAt: new Date().toISOString(),
        expiresAt: memory.expiresAt,
      },
    });
  }

  async getActive() {
    return prisma.coachMemory.findMany({
      where: { status: 'confirmed' },
    });
  }

  async confirm(id: string) {
    await prisma.coachMemory.update({
      where: { id },
      data: { status: 'confirmed', lastConfirmedAt: new Date().toISOString() },
    });
  }

  async reject(id: string) {
    await prisma.coachMemory.update({
      where: { id },
      data: { status: 'rejected' },
    });
  }

  async remove(id: string) {
    await prisma.coachMemory.update({
      where: { id },
      data: { status: 'expired' },
    });
  }

  async getAllForDisplay() {
    return prisma.coachMemory.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const coachMemory = new CoachMemoryService();
