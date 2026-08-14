import { FastifyInstance } from 'fastify';

/**
 * Simple PIN-based authentication for local network pairing.
 * 
 * The server has a static PIN (defaults to '916491' — same as the app access code).
 * The mobile app sends this PIN to verify it's authorized.
 * No database, no expiring codes, no complexity.
 * 
 * Security: This is for a LOCAL NETWORK only. The PIN prevents random 
 * devices on your Wi-Fi from accessing your data. For internet exposure, 
 * use Tailscale or a VPN instead of opening ports.
 */

const SERVER_PIN = process.env.COACH_PIN || '916491';

export async function authRoutes(fastify: FastifyInstance) {

  /**
   * GET /auth/ping
   * Simple health check that also tells the client if the server requires a PIN.
   * No authentication needed.
   */
  fastify.get('/auth/ping', async () => {
    return { 
      ok: true, 
      requiresPin: true,
      serverName: 'AppMuscu Coach Server',
      timestamp: new Date().toISOString()
    };
  });

  /**
   * POST /auth/verify-pin
   * The mobile sends { pin, deviceName } and gets back { success: true } if correct.
   * This is the ONLY step needed to "pair". 
   */
  fastify.post('/auth/verify-pin', async (request, reply) => {
    const body = request.body as { pin?: string; deviceName?: string } | null;
    
    if (!body || !body.pin) {
      return reply.status(400).send({ error: 'PIN requis.' });
    }

    if (body.pin !== SERVER_PIN) {
      // Small delay to prevent brute-force
      await new Promise(r => setTimeout(r, 1000));
      return reply.status(403).send({ error: 'PIN incorrect.' });
    }

    return { 
      success: true, 
      message: 'Appareil autorisé.',
      deviceName: body.deviceName || 'Unknown'
    };
  });

  /**
   * Simple middleware helper: validate PIN from Authorization header.
   * Usage in other routes: request.headers.authorization === `Bearer ${SERVER_PIN}`
   */
  fastify.decorate('validatePin', (request: any, reply: any, done: any) => {
    const auth = request.headers.authorization;
    if (auth !== `Bearer ${SERVER_PIN}`) {
      reply.status(401).send({ error: 'Non autorisé. PIN invalide.' });
      return;
    }
    done();
  });
}
