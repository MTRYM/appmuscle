import type { NormalizedData } from './normalizers';

export interface ImportReport {
  status: 'success' | 'error';
  versionDetected: string;
  errors: string[];
  counts: {
    settings: number;
    plannedWorkouts: number;
    workoutSessions: number;
    performedSets: number;
    exercises: number;
    vacations: number;
  };
  duplicatesSkipped: number;
}

export function generateReport(normalized: NormalizedData | null, errors: string[] = []): ImportReport {
  if (!normalized) {
    return {
      status: 'error',
      versionDetected: 'unknown',
      errors,
      counts: { settings: 0, plannedWorkouts: 0, workoutSessions: 0, performedSets: 0, exercises: 0, vacations: 0 },
      duplicatesSkipped: 0
    };
  }
  
  return {
    status: errors.length > 0 ? 'error' : 'success',
    versionDetected: 'v1/v2',
    errors,
    counts: {
      settings: normalized.settings.length,
      plannedWorkouts: normalized.plannedWorkouts.length,
      workoutSessions: normalized.workoutSessions.length,
      performedSets: normalized.performedSets.length,
      exercises: normalized.exercises.length,
      vacations: normalized.vacationsV3.length
    },
    duplicatesSkipped: 0 // In a full implementation, we'd check the DB and count these
  };
}
