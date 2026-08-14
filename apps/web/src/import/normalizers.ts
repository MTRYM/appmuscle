import type { IdMapping } from './id-mapping';
import { generateId } from './id-mapping';
import type { 
  SettingRecord, 
  PlannedSessionRecord, 
  WorkoutSessionRecord, 
  PerformedSetRecord, 
  VacationRecord,
  ExerciseRecord
} from '@appmuscu/shared-schema';

export function normalizeSettings(legacySettings: any[], idMap: IdMapping): SettingRecord[] {
  const now = new Date().toISOString();
  return legacySettings.map(s => ({
    id: idMap.getUuid('settings', s.id),
    programStartDate: s.programStartDate,
    theme: s.theme || 'dark',
    createdAt: now,
    updatedAt: now,
  }));
}

export function normalizePlannedSessions(legacyPlanned: any[], idMap: IdMapping): PlannedSessionRecord[] {
  const now = new Date().toISOString();
  return legacyPlanned.map(p => ({
    id: idMap.getUuid('plannedSession', p.id),
    legacyId: p.id,
    dateISO: p.dateISO,
    cycleIndex: p.cycleIndex,
    sessionIndex: p.sessionIndex,
    cycleName: p.cycleName,
    sessionName: p.sessionName,
    jour: p.jour,
    status: p.status,
    createdAt: now,
    updatedAt: now,
  }));
}

export function normalizeSessions(legacySessions: any[], idMap: IdMapping): WorkoutSessionRecord[] {
  const now = new Date().toISOString();
  return legacySessions.map(s => ({
    id: idMap.getUuid('session', s.id),
    legacyId: s.id,
    dateISO: s.dateISO,
    plannedSessionId: s.plannedSessionId ? idMap.getUuid('plannedSession', s.plannedSessionId) : null,
    type: s.type,
    status: s.status === 'completed' ? 'completed' : 'in_progress',
    startedAt: s.startedAt || now,
    completedAt: s.completedAt || now,
    durationSec: s.durationSec || 0,
    avgRpe: s.avgRpe || null,
    feedback: s.feedback || null,
    createdAt: now,
    updatedAt: now,
  }));
}

export function normalizeSets(legacySets: any[], idMap: IdMapping): { sets: PerformedSetRecord[], exercises: ExerciseRecord[] } {
  const now = new Date().toISOString();
  const sets: PerformedSetRecord[] = [];
  const exercisesMap = new Map<string, ExerciseRecord>();

  for (const s of legacySets) {
    const exName = s.exerciseName || 'Inconnu';
    const exType = s.exerciseType === 'isometrique' ? 'isometrique' : 'reps';
    
    // Create/Reuse exercise record based on name
    let exerciseId = idMap.getUuid('exercise_name', exName);
    if (!exercisesMap.has(exerciseId)) {
      exercisesMap.set(exerciseId, {
        id: exerciseId,
        name: exName,
        type: exType,
        createdAt: now,
        updatedAt: now,
      });
    }

    sets.push({
      id: idMap.getUuid('set', s.id),
      legacyId: s.id,
      sessionId: idMap.getUuid('session', s.sessionId),
      exerciseId: exerciseId,
      exerciseName: exName,
      exerciseType: exType,
      setNumber: s.setNumber,
      weight: s.weight || 0,
      repsActual: s.repsActual || 0,
      repsTarget: s.repsTarget || '',
      rpe: s.rpe || null,
      restSecActual: s.restSecActual || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { sets, exercises: Array.from(exercisesMap.values()) };
}

export function normalizeVacations(legacyVacations: any[], idMap: IdMapping): VacationRecord[] {
  const now = new Date().toISOString();
  return legacyVacations.map(v => ({
    id: idMap.getUuid('vacation', v.id),
    legacyId: v.id,
    startDateISO: v.startDateISO,
    endDateISO: v.endDateISO,
    days: v.days,
    shiftedSessions: v.shiftedSessions,
    createdAt: v.createdAt || now,
    updatedAt: v.createdAt || now,
  }));
}

export interface NormalizedData {
  settings: SettingRecord[];
  plannedWorkouts: PlannedSessionRecord[];
  workoutSessions: WorkoutSessionRecord[];
  performedSets: PerformedSetRecord[];
  exercises: ExerciseRecord[];
  vacationsV3: VacationRecord[];
}

export function normalizeAll(legacyData: any, idMap: IdMapping): NormalizedData {
  const settings = normalizeSettings(legacyData.settings || [], idMap);
  const plannedWorkouts = normalizePlannedSessions(legacyData.plannedSessions || [], idMap);
  const workoutSessions = normalizeSessions(legacyData.sessions || [], idMap);
  const { sets: performedSets, exercises } = normalizeSets(legacyData.sets || [], idMap);
  const vacationsV3 = normalizeVacations(legacyData.vacations || [], idMap);

  return {
    settings,
    plannedWorkouts,
    workoutSessions,
    performedSets,
    exercises,
    vacationsV3
  };
}
