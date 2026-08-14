import { FastifyInstance } from 'fastify';
import { coachMemory } from './coach-memory.js';
import { z } from 'zod';

const proposeSchema = z.object({
  id: z.string(),
  category: z.enum(['preference','constraint','goal','habit','observation','temporary-conclusion']),
  content: z.string().max(2000),
  sourceType: z.enum(['athlete-profile','user-message','training-data','coach-summary']),
  confidence: z.enum(['low','medium','high']).optional(),
  expiresAt: z.string().optional(),
});

export async function memoryRoutes(fastify: FastifyInstance) {
  // GET all memories (for user management page)
  fastify.get('/coach/memories', async () => {
    return coachMemory.getAllForDisplay();
  });

  // POST a proposed memory (from LLM output processing)
  fastify.post('/coach/memories', async (request, reply) => {
    const parsed = proposeSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error });
    await coachMemory.propose(parsed.data);
    return { success: true };
  });

  // PATCH confirm a memory
  fastify.patch('/coach/memories/:id/confirm', async (request) => {
    const { id } = request.params as { id: string };
    await coachMemory.confirm(id);
    return { success: true };
  });

  // PATCH reject a memory
  fastify.patch('/coach/memories/:id/reject', async (request) => {
    const { id } = request.params as { id: string };
    await coachMemory.reject(id);
    return { success: true };
  });

  // DELETE (expire) a memory
  fastify.delete('/coach/memories/:id', async (request) => {
    const { id } = request.params as { id: string };
    await coachMemory.remove(id);
    return { success: true };
  });
}
