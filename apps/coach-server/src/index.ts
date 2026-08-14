import Fastify from 'fastify';
import cors from '@fastify/cors';
import { syncRoutes } from './sync.js';
import { authRoutes } from './auth.js';
import { memoryRoutes } from './memory-routes.js';
import { contextBuilder } from './context-builder.js';
import { ollamaCoach } from './ollama.js';
import { coachMemory } from './coach-memory.js';
import { policyEngine } from './policy-engine.js';

const fastify = Fastify({ logger: true });

fastify.register(cors, {
  origin: true // Allow all origins for local network testing
});

fastify.get('/health', async () => {
  return { status: 'ok', server: 'coach-server', timestamp: new Date().toISOString() };
});

fastify.register(syncRoutes);
fastify.register(authRoutes);
fastify.register(memoryRoutes);



/**
 * POST /coach/chat
 * Chat freely with the local Ollama coach
 */
fastify.post('/coach/chat', async (request, reply) => {
  const { deviceId, message } = request.body as { deviceId: string; message: string };
  if (!message || !message.trim()) {
    return reply.status(400).send({ error: 'Message requis' });
  }

  const context = await contextBuilder.buildContext(deviceId || 'local');
  const memories = await coachMemory.getActive();
  const enrichedContext = { ...context, coachMemories: memories };

  const response = await ollamaCoach.chat(message, enrichedContext);

  if (!response) {
    return reply.status(503).send({
      error: 'Coach indisponible',
      message: 'Ollama est hors-ligne ou le modèle n\'est pas chargé.'
    });
  }

  return { 
    success: true, 
    answer: response.answer,
    proposedActions: response.proposedActions,
    confidence: response.confidence,
    reasoning: response.reasoning,
    model: response.model, 
    timestamp: new Date().toISOString() 
  };
});

const start = async () => {
  try {
    // Listen on 0.0.0.0 so devices on the local Wi-Fi can connect
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    const addr = fastify.server.address();
    if (addr && typeof addr === 'object') {
      console.log(`✅ Coach server listening on http://${addr.address}:${addr.port}`);
      console.log(`   Expose via Tailscale Serve: tailscale serve https / http://127.0.0.1:3000`);
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

