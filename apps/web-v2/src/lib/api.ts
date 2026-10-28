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

export async function movePlannedSession(id: string, newDateISO: string, swapWithId?: string) {
  const res = await fetch(`/api/planned-sessions?id=${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dateISO: newDateISO, swapWithId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erreur lors du déplacement (${res.status})`);
  }
  return data;
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
  // Handled server-side
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
  const res = await fetch('/api/sessions?limit=500');
  const data = await res.json();
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
  const res = await fetch('/api/vacations');
  if (!res.ok) return [];
  return res.json();
}

export async function addVacationAndShiftPlan(startDateISO: string, endDateISO: string) {
  const res = await fetch('/api/vacations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDateISO, endDateISO })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erreur (${res.status})`);
  }
  return data;
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

export async function getBodyData() {
  const res = await fetch('/api/body');
  if (!res.ok) {
    throw new Error('Erreur lors du chargement des données corporelles');
  }
  return res.json();
}

export async function saveBodyProfile(data: { heightCm?: number | null; targetWeightKg?: number | null }) {
  const res = await fetch('/api/body', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'profile', ...data }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || 'Erreur lors de la sauvegarde du profil');
  }
  return payload;
}

export async function saveBodyWeight(weight: number, dateISO?: string, notes?: string) {
  const res = await fetch('/api/body', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'weight', weight, dateISO, notes }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || 'Erreur lors de la sauvegarde du poids');
  }
  return payload;
}

export async function saveBodyMeasurement(type: string, value: number, dateISO?: string) {
  const res = await fetch('/api/body', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'measurement', type, value, dateISO }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || 'Erreur lors de la sauvegarde de la mesure');
  }
  return payload;
}

export async function deleteBodyEntry(kind: 'weight' | 'measurement', id: string) {
  const res = await fetch(`/api/body?kind=${kind}&id=${id}`, {
    method: 'DELETE',
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || 'Erreur lors de la suppression');
  }
  return payload;
}
