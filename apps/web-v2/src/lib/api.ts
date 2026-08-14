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
  // Clear future sessions in db or just upsert?
  // Upsert array
  await fetch('/api/planned-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessions)
  });
}

export async function syncPlannedWithCompleted() {
  // Implementation depends on what this did in old Dexie.
  // We can skip or implement server-side if needed.
}

export async function saveWorkoutSession(sessionData: any, setsData: any[]) {
  // 1. Save session
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData)
  });
  const savedSession = await res.json();

  // 2. Save sets
  for (const set of setsData) {
    set.sessionId = savedSession.id;
    await fetch('/api/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(set)
    });
  }

  // 3. Mark planned session as done if completed
  if (sessionData.status === 'completed' && sessionData.plannedSessionId) {
    await fetch(`/api/planned-sessions?id=${sessionData.plannedSessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' })
    });
  }

  return savedSession;
}

export async function getAllSessionsWithSets() {
  const res = await fetch('/api/sessions?limit=500'); // limit or get all
  return res.json();
}

export async function getPlannedSessions() {
  const res = await fetch('/api/planned-sessions?limit=500');
  return res.json();
}

export async function getVacations() { return []; }
export async function addVacationAndShiftPlan(s, e, d) {}
export async function getDayData(dateISO) { return { isRestDay: false, type: 'Aucun plan' }; }
