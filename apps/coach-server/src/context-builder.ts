import { prisma } from './lib/prisma.js';

export class TrainingContextBuilder {
  /**
   * Constructs a tailored context for the LLM based on recent sync events
   * instead of passing the entire database.
   */
  async buildContext(deviceId: string) {
    // 1. Fetch recent sessions (last 5)
    const recentSessionsEvents = await prisma.syncEvent.findMany({
      where: { entityType: 'workout_session' },
      orderBy: { serverSequence: 'desc' },
      take: 5,
    });

    // 2. Fetch athlete profile (latest update)
    const profileEvents = await prisma.syncEvent.findMany({
      where: { entityType: 'athlete_profile' },
      orderBy: { serverSequence: 'desc' },
      take: 1,
    });

    // 2b. Fetch performed sets for recent sessions (to understand weights and reps)
    const recentSetsEvents = await prisma.syncEvent.findMany({
      where: { entityType: 'performed_set' },
      orderBy: { serverSequence: 'desc' },
      take: 50,
    });

    // Parse payloads
    const recentSessions = recentSessionsEvents.map(e => e.payload).filter(Boolean);
    const athleteProfile = profileEvents.length > 0 ? profileEvents[0].payload : null;
    const recentSets = recentSetsEvents.map(e => e.payload).filter(Boolean);

    // 3. Compute deterministic aggregates (e.g. fatigue summary, adherence)
    // We mock this slightly for the example, but it prevents the LLM from doing raw math.
    const fatigueSummary = this.computeFatigue(recentSessions);

    return {
      athleteProfile,
      recentSessions,
      recentSets,
      fatigueSummary,
      dataFreshness: {
        generatedAt: new Date().toISOString(),
      }
    };
  }

  private computeFatigue(sessions: any[]) {
    if (!sessions || sessions.length === 0) return { trend: 'unknown' };
    
    // Average RPE of recent sessions
    let totalRpe = 0;
    let count = 0;
    for (const s of sessions) {
      if (s.avgRpe) {
        totalRpe += s.avgRpe;
        count++;
      }
    }
    const avgRpe = count > 0 ? totalRpe / count : 0;
    return {
      averageRpe: avgRpe,
      trend: avgRpe > 8 ? 'high' : avgRpe < 6 ? 'low' : 'optimal'
    };
  }
}

export const contextBuilder = new TrainingContextBuilder();
