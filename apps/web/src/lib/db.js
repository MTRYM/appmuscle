import { db } from '../db/database';
import { generateId } from '../import/id-mapping';

export { db };

export const USE_NEW_DB = true; // Flag to toggle V3 reads/writes

function parseISODate(dateISO) {
  const [year, month, day] = String(dateISO).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysISO(dateISO, days) {
  const date = parseISODate(dateISO);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function daysInclusive(startDateISO, endDateISO) {
  const start = parseISODate(startDateISO);
  const end = parseISODate(endDateISO);
  return Math.round((end - start) / 86_400_000) + 1;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

export async function getSettings() {
  if (USE_NEW_DB) {
    let settings = await db.appSettings.toCollection().first();
    if (!settings) {
      settings = { 
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); })), 
        programStartDate: null, 
        theme: 'dark', 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      };
      await db.appSettings.put(settings);
    }
    return settings;
  }
  let settings = await db.settings.get('main');
  if (!settings) {
    settings = { id: 'main', programStartDate: null, theme: 'dark' };
    await db.settings.put(settings);
  }
  return settings;
}

export async function updateSettings(partial) {
  const current = await getSettings();
  if (USE_NEW_DB) {
    const updated = { ...current, ...partial, updatedAt: new Date().toISOString() };
    await db.appSettings.put(updated);
    return updated;
  }
  const updated = { ...current, ...partial };
  await db.settings.put(updated);
  return updated;
}

export async function markMissedSessions(todayISO) {
  if (USE_NEW_DB) {
    const pending = await db.plannedWorkouts.where('status').equals('pending').toArray();
    const toMiss = pending.filter((p) => p.dateISO < todayISO);
    if (toMiss.length === 0) return;

    await db.transaction('rw', db.plannedWorkouts, async () => {
      for (const session of toMiss) {
        await db.plannedWorkouts.update(session.id, { status: 'missed', updatedAt: new Date().toISOString() });
      }
    });
    return;
  }
  const pending = await db.plannedSessions
    .where('status')
    .equals('pending')
    .toArray();

  const toMiss = pending.filter((p) => p.dateISO < todayISO);
  if (toMiss.length === 0) return;

  await db.transaction('rw', db.plannedSessions, async () => {
    for (const session of toMiss) {
      await db.plannedSessions.update(session.id, { status: 'missed' });
    }
  });
}

export async function getMissedSessions() {
  if (USE_NEW_DB) {
    return db.plannedWorkouts.where('status').equals('missed').sortBy('dateISO');
  }
  return db.plannedSessions.where('status').equals('missed').sortBy('dateISO');
}

export async function getTodayPlannedSession(todayISO) {
  if (USE_NEW_DB) {
    const sessions = await db.plannedWorkouts
      .where('dateISO')
      .equals(todayISO)
      .toArray();
    return sessions.find((s) => s.status === 'pending') ?? null;
  }
  const sessions = await db.plannedSessions
    .where('dateISO')
    .equals(todayISO)
    .toArray();
  return sessions.find((s) => s.status === 'pending') ?? null;
}

export async function getVacations() {
  if (USE_NEW_DB) {
    return db.vacationsV3.orderBy('startDateISO').toArray();
  }
  return db.vacations.orderBy('startDateISO').toArray();
}

export async function addVacationAndShiftPlan(startDateISO, endDateISO) {
  if (!startDateISO || !endDateISO) {
    throw new Error('Sélectionnez une date de départ et une date de retour.');
  }
  if (endDateISO < startDateISO) {
    throw new Error('La date de retour doit être après la date de départ.');
  }

  const days = daysInclusive(startDateISO, endDateISO);
  if (days < 1) {
    throw new Error('La période de vacances est invalide.');
  }

  if (USE_NEW_DB) {
    return db.transaction('rw', [db.vacationsV3, db.plannedWorkouts], async () => {
      const existingVacations = await db.vacationsV3.toArray();
      const overlap = existingVacations.some((v) =>
        rangesOverlap(startDateISO, endDateISO, v.startDateISO, v.endDateISO),
      );
      if (overlap) {
        throw new Error('Cette période chevauche déjà des vacances enregistrées.');
      }

      const planned = await db.plannedWorkouts.toArray();
      const toShift = planned.filter((session) => {
        if (session.status === 'done') return false;
        return session.dateISO >= startDateISO;
      });

      const now = new Date().toISOString();
      await db.vacationsV3.add({
        id: generateId(),
        startDateISO,
        endDateISO,
        days,
        shiftedSessions: toShift.length,
        createdAt: now,
        updatedAt: now,
      });

      for (const session of toShift) {
        await db.plannedWorkouts.update(session.id, {
          dateISO: addDaysISO(session.dateISO, days),
          status: session.status === 'missed' ? 'pending' : session.status,
          updatedAt: now,
        });
      }

      return { days, shiftedSessions: toShift.length };
    });
  }

  return db.transaction('rw', [db.vacations, db.plannedSessions], async () => {
    const existingVacations = await db.vacations.toArray();
    const overlap = existingVacations.some((v) =>
      rangesOverlap(startDateISO, endDateISO, v.startDateISO, v.endDateISO),
    );
    if (overlap) {
      throw new Error('Cette période chevauche déjà des vacances enregistrées.');
    }

    const planned = await db.plannedSessions.toArray();
    const toShift = planned.filter((session) => {
      if (session.status === 'done') return false;
      return session.dateISO >= startDateISO;
    });

    await db.vacations.add({
      startDateISO,
      endDateISO,
      days,
      shiftedSessions: toShift.length,
      createdAt: new Date().toISOString(),
    });

    for (const session of toShift) {
      await db.plannedSessions.update(session.id, {
        dateISO: addDaysISO(session.dateISO, days),
        status: session.status === 'missed' ? 'pending' : session.status,
      });
    }

    return { days, shiftedSessions: toShift.length };
  });
}

function plainFeedback(feedback) {
  if (!feedback || typeof feedback !== 'object') return null;
  return {
    rpeRessenti: feedback.rpeRessenti ?? null,
    energieAvant: feedback.energieAvant ?? null,
    energieApres: feedback.energieApres ?? null,
    sommeil: feedback.sommeil ?? null,
    courbatures: feedback.courbatures ?? null,
    motivation: feedback.motivation ?? null,
    douleur: feedback.douleur ?? null,
    douleurDetail: feedback.douleurDetail ?? '',
    notes: feedback.notes ?? '',
  };
}

export async function saveWorkoutSession({
  dateISO,
  plannedSessionId,
  type,
  startedAt,
  completedAt,
  durationSec,
  avgRpe,
  sets,
  feedback = null,
}) {
  if (USE_NEW_DB) {
    return db.transaction('rw', [db.workoutSessions, db.performedSets, db.plannedWorkouts, db.exercises], async () => {
      const sessionId = generateId();
      const now = new Date().toISOString();
      
      await db.workoutSessions.add({
        id: sessionId,
        dateISO,
        plannedSessionId: plannedSessionId ?? null,
        type,
        status: 'completed',
        startedAt,
        completedAt,
        durationSec,
        avgRpe,
        feedback: plainFeedback(feedback),
        createdAt: now,
        updatedAt: now,
      });

      if (sets.length > 0) {
        const exercisesInDb = await db.exercises.toArray();
        const newExercises = [];
        
        const mappedSets = sets.map((s) => {
          let exerciseId = null;
          const exName = String(s.exerciseName ?? '');
          const existingEx = exercisesInDb.find(e => e.name === exName) || newExercises.find(e => e.name === exName);
          if (existingEx) {
             exerciseId = existingEx.id;
          } else {
             exerciseId = generateId();
             newExercises.push({
               id: exerciseId,
               name: exName,
               type: s.exerciseType === 'isometrique' ? 'isometrique' : 'reps',
               createdAt: now,
               updatedAt: now,
             });
          }
          
          return {
            id: generateId(),
            sessionId,
            exerciseId,
            exerciseName: exName,
            exerciseType: s.exerciseType === 'isometrique' ? 'isometrique' : 'reps',
            setNumber: Number(s.setNumber),
            weight: Number(s.weight),
            repsActual: Number(s.repsActual),
            repsTarget: String(s.repsTarget ?? ''),
            rpe: s.rpe != null ? Number(s.rpe) : null,
            restSecActual: s.restSecActual != null ? Number(s.restSecActual) : null,
            createdAt: now,
            updatedAt: now,
          };
        });
        
        if (newExercises.length > 0) {
           await db.exercises.bulkAdd(newExercises);
        }
        await db.performedSets.bulkAdd(mappedSets);
      }

      if (plannedSessionId) {
        await db.plannedWorkouts.update(plannedSessionId, { status: 'done', updatedAt: now });
      }

      return sessionId;
    });
  }

  return db.transaction('rw', [db.sessions, db.sets, db.plannedSessions], async () => {
    const sessionId = await db.sessions.add({
      dateISO,
      plannedSessionId: plannedSessionId ?? null,
      type,
      status: 'completed',
      startedAt,
      completedAt,
      durationSec,
      avgRpe,
      feedback: plainFeedback(feedback),
    });

    if (sets.length > 0) {
      await db.sets.bulkAdd(
        sets.map((s) => ({
          sessionId,
          exerciseName: String(s.exerciseName ?? ''),
          exerciseType: s.exerciseType === 'isometrique' ? 'isometrique' : 'reps',
          setNumber: Number(s.setNumber),
          weight: Number(s.weight),
          repsActual: Number(s.repsActual),
          repsTarget: String(s.repsTarget ?? ''),
          rpe: s.rpe != null ? Number(s.rpe) : null,
          restSecActual: s.restSecActual != null ? Number(s.restSecActual) : null,
        })),
      );
    }

    if (plannedSessionId) {
      await db.plannedSessions.update(plannedSessionId, { status: 'done' });
    }

    return sessionId;
  });
}

export async function replacePlannedSessions(sessions) {
  if (USE_NEW_DB) {
    const now = new Date().toISOString();
    const mapped = sessions.map(s => ({
      ...s,
      id: s.id || generateId(),
      createdAt: now,
      updatedAt: now,
    }));
    await db.transaction('rw', db.plannedWorkouts, async () => {
      await db.plannedWorkouts.clear();
      if (mapped.length > 0) {
        await db.plannedWorkouts.bulkAdd(mapped);
      }
    });
    return;
  }
  await db.transaction('rw', db.plannedSessions, async () => {
    await db.plannedSessions.clear();
    if (sessions.length > 0) {
      await db.plannedSessions.bulkAdd(sessions);
    }
  });
}

export async function syncPlannedWithCompleted() {
  if (USE_NEW_DB) {
    const completed = await db.workoutSessions.toArray();
    const planned = await db.plannedWorkouts.toArray();
    for (const session of completed) {
      if (!session.plannedSessionId) continue;
      const p = planned.find((pl) => pl.id === session.plannedSessionId);
      if (p && p.status !== 'done') {
        await db.plannedWorkouts.update(p.id, { status: 'done', updatedAt: new Date().toISOString() });
      }
    }
    return;
  }
  const completed = await db.sessions.toArray();
  const planned = await db.plannedSessions.toArray();

  for (const session of completed) {
    if (!session.plannedSessionId) continue;
    const p = planned.find((pl) => pl.id === session.plannedSessionId);
    if (p && p.status !== 'done') {
      await db.plannedSessions.update(p.id, { status: 'done' });
    }
  }
}

export async function exportAll() {
  const [settings, plannedSessions, sessions, sets, vacations] = await Promise.all([
    db.settings.toArray(),
    db.plannedSessions.toArray(),
    db.sessions.toArray(),
    db.sets.toArray(),
    db.vacations.toArray(),
  ]);

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    settings,
    plannedSessions,
    sessions,
    sets,
    vacations,
  };
}

export function validateImportData(data) {
  if (!data || typeof data !== 'object') return false;
  if (![1, 2].includes(data.version)) return false;
  if (!Array.isArray(data.settings)) return false;
  if (!Array.isArray(data.plannedSessions)) return false;
  if (!Array.isArray(data.sessions)) return false;
  if (!Array.isArray(data.sets)) return false;
  if (data.version >= 2 && !Array.isArray(data.vacations)) return false;
  return true;
}

export async function importAll(data) {
  if (!validateImportData(data)) {
    throw new Error('Format de fichier invalide');
  }

  await db.transaction('rw', [db.settings, db.plannedSessions, db.sessions, db.sets, db.vacations], async () => {
    await db.settings.clear();
    await db.plannedSessions.clear();
    await db.sessions.clear();
    await db.sets.clear();
    await db.vacations.clear();

    if (data.settings.length) await db.settings.bulkAdd(data.settings);
    if (data.plannedSessions.length) await db.plannedSessions.bulkAdd(data.plannedSessions);
    if (data.sessions.length) await db.sessions.bulkAdd(data.sessions);
    if (data.sets.length) await db.sets.bulkAdd(data.sets);
    if (data.vacations?.length) await db.vacations.bulkAdd(data.vacations);
  });
}

export async function getAllSessionsWithSets() {
  if (USE_NEW_DB) {
    const [sessions, sets] = await Promise.all([db.workoutSessions.toArray(), db.performedSets.toArray()]);
    return sessions.map((session) => ({
      ...session,
      sets: sets.filter((s) => s.sessionId === session.id),
    }));
  }
  const [sessions, sets] = await Promise.all([db.sessions.toArray(), db.sets.toArray()]);
  return sessions.map((session) => ({
    ...session,
    sets: sets.filter((s) => s.sessionId === session.id),
  }));
}

export const RESET_CONFIRMATION_PHRASE =
  'supprimer-definitivement-toutes-mes-donnees-appmuscu';

export async function resetAllData() {
  if (USE_NEW_DB) {
    await db.transaction('rw', [db.appSettings, db.plannedWorkouts, db.workoutSessions, db.performedSets, db.vacationsV3, db.exercises], async () => {
      await db.appSettings.clear();
      await db.plannedWorkouts.clear();
      await db.workoutSessions.clear();
      await db.performedSets.clear();
      await db.vacationsV3.clear();
      await db.exercises.clear();
    });
    await getSettings();
    return;
  }
  await db.transaction('rw', [db.settings, db.plannedSessions, db.sessions, db.sets, db.vacations], async () => {
    await db.settings.clear();
    await db.plannedSessions.clear();
    await db.sessions.clear();
    await db.sets.clear();
    await db.vacations.clear();
  });
  await getSettings();
}

export async function getDayData(dateISO) {
  if (USE_NEW_DB) {
    const [planned, sessions, allSets, vacations] = await Promise.all([
      db.plannedWorkouts.where('dateISO').equals(dateISO).toArray(),
      db.workoutSessions.where('dateISO').equals(dateISO).toArray(),
      db.performedSets.toArray(),
      db.vacationsV3
        .where('startDateISO')
        .belowOrEqual(dateISO)
        .filter((v) => v.endDateISO >= dateISO)
        .toArray(),
    ]);

    const sessionsWithSets = sessions.map((s) => ({
      ...s,
      sets: allSets.filter((set) => set.sessionId === s.id),
    }));

    return { planned, sessions: sessionsWithSets, vacations };
  }

  const [planned, sessions, allSets, vacations] = await Promise.all([
    db.plannedSessions.where('dateISO').equals(dateISO).toArray(),
    db.sessions.where('dateISO').equals(dateISO).toArray(),
    db.sets.toArray(),
    db.vacations
      .where('startDateISO')
      .belowOrEqual(dateISO)
      .filter((v) => v.endDateISO >= dateISO)
      .toArray(),
  ]);

  const sessionsWithSets = sessions.map((s) => ({
    ...s,
    sets: allSets.filter((set) => set.sessionId === s.id),
  }));

  return { planned, sessions: sessionsWithSets, vacations };
}
