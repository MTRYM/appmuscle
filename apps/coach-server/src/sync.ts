import { FastifyInstance } from 'fastify';
import { prisma } from './lib/prisma.js';
import { z } from 'zod';

const pushSchema = z.array(z.object({
  eventId: z.string(),
  deviceId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  operation: z.enum(['create', 'update', 'delete', 'restore']),
  payload: z.any(),
  baseVersion: z.number().nullable().optional(),
  clientSequence: z.number(),
  idempotencyKey: z.string(),
  schemaVersion: z.number(),
  createdAtClient: z.string(),
}));

export async function syncRoutes(fastify: FastifyInstance) {
  fastify.get('/sync/pull', async (request, reply) => {
    const { after } = request.query as { after?: string };
    const sequence = after ? parseInt(after, 10) : 0;

    const events = await prisma.syncEvent.findMany({
      where: {
        serverSequence: {
          gt: sequence
        }
      },
      orderBy: {
        serverSequence: 'asc'
      }
    });

    return { events };
  });

  fastify.post('/sync/push', async (request, reply) => {
    const parseResult = pushSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: parseResult.error });
    }

    const events = parseResult.data;
    let processed = 0;
    
    for (const ev of events) {
      try {
        await prisma.syncEvent.create({
          data: {
            eventId: ev.eventId,
            deviceId: ev.deviceId,
            entityType: ev.entityType,
            entityId: ev.entityId,
            operation: ev.operation,
            payload: ev.payload ?? null,
            baseVersion: ev.baseVersion ?? null,
            clientSequence: ev.clientSequence,
            createdAtClient: ev.createdAtClient,
            receivedAtServer: new Date().toISOString(),
            idempotencyKey: ev.idempotencyKey,
            schemaVersion: ev.schemaVersion,
          }
        });
        processed++;
      } catch (err: any) {
        // Ignore UNIQUE constraint violations (idempotency P2002)
        if (err.code === 'P2002') {
           continue;
        }
        fastify.log.error(err);
      }
    }
    
    return { success: true, processed };
  });
}
