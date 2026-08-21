/**
 * api.ts
 * Replaces the old Dexie db.js
 * Interfaces with the SvelteKit server API
 */

export async function getSettings() {
  const res = await fetch('/api/settings');
  return res.json();
}

export async function updateSettings(partial: any) {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial)
  });
  return res.json();
}

export async function getTodayPlannedSession(dateISO: string) {
  const res = await fetch(`/api/planned-sessions?date=${dateISO}&status=pending`);
  const data = await res.json();
  return data.length > 0 ? data[0] : null;
}

export async function getMissedSessions() {
  const res = await fetch(`/api/planned-sessions?status=missed`);
  return res.json();
}

export async function markMissedSessions(todayISO: string) {
  // Can be done server-side or here by fetching pending and updating
  // For now, we fetch pending before today and mark missed
  const res = await fetch('/api/planned-sessions?status=pending');
  const pending = await res.json();
  const toMiss = pending.filter((p: any) => p.dateISO < todayISO);
  
  for (const session of toMiss) {
    await fetch(`/api/planned-sessions?id=${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'missed' })
    });
  }
}

export async function replacePlannedSessions(sessions: any[]) {
  const res = await fetch('/api/planned-sessions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessions)
  });
  if (!res.ok) {
    throw new Error('Erreur lors de la génération des séances planifiées');
  }
  return res.json();
}

export async function syncPlannedWithCompleted() {
  // Implementation depends on what this did in old Dexie.
  // We can skip or implement server-side if needed.
}

export async function saveWorkoutSession(sessionData: any, setsData?: any[]) {
  const sets = setsData || sessionData.sets || [];
  const payload = {
    ...sessionData,
    sets,
  };

  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Erreur lors de la sauvegarde (${res.status})`);
  }

  const savedSession = await res.json();
  return savedSession;
}

export async function getAllSessionsWithSets() {
  const res = await fetch('/api/sessions?limit=500'); // limit or get all
  const data = await res.json();
  // Map Prisma relation name 'performedSets' to 'sets' for frontend compatibility
  return data.map((session: any) => ({
    ...session,
    sets: session.performedSets || []
  }));
}

export async function getPlannedSessions() {
  const res = await fetch('/api/planned-sessions?limit=500');
  return res.json();
}

export async function getVacations() { 
  // Should call /api/vacations, but for now let's just return empty array if not implemented
  return []; 
}

export async function addVacationAndShiftPlan(s: any, e: any, d: any) {
  // Not implemented yet on backend
  throw new Error("Mode vacances non implémenté côté serveur");
}

export async function getDayData(dateISO: string) {
  const [planned, sessions, vacations] = await Promise.all([
    fetch(`/api/planned-sessions?date=${dateISO}`).then(r => r.json()),
    fetch(`/api/sessions?date=${dateISO}`).then(r => r.json()),
    getVacations()
  ]);

  const mappedSessions = sessions.map((session: any) => ({
    ...session,
    sets: session.performedSets || []
  }));

  const activeVacations = vacations.filter((v: any) => dateISO >= v.startDateISO && dateISO <= v.endDateISO);

  return {
    planned,
    sessions: mappedSessions,
    vacations: activeVacations
  };
}

export async function deleteWorkoutSession(sessionId: string) {
  const res = await fetch(`/api/sessions?id=${sessionId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Erreur lors de la suppression (${res.status})`);
  }

  return res.json();
}

export async function getInProgressSession() {
  const res = await fetch('/api/sessions?status=in_progress&limit=1');
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    return {
      ...data[0],
      sets: data[0].performedSets || [],
    };
  }
  return null;
}
