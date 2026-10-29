import { parseRepsRange } from './programme.js';


export const DEFAULT_INCREMENT = 2.5;
export const LEG_INCREMENT = 5;

const LEG_KEYWORDS = [
  'squat',
  'presse',
  'soulevé',
  'jambes',
  'mollet',
  'fente',
  'leg curl',
  'leg extension',
];

const EQUIVALENT_NAMES = {
  'Weighted Dip': ['Weighted Dip', 'Ring Dip', 'Weighted Ring Dip'],
  'Ring Dip': ['Ring Dip', 'Weighted Dip', 'Weighted Ring Dip'],
  'Chest-Supported Row': ['Chest-Supported Row', 'Chest Supported Row'],
};

export function roundWeight(weight) {
  return Math.round(weight * 2) / 2;
}

export function getIncrementForExercise(exerciseName) {
  const lower = exerciseName.toLowerCase();
  if (LEG_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return LEG_INCREMENT;
  }
  return DEFAULT_INCREMENT;
}

export function isSetSuccessful(set, repsTarget) {
  const target = set.repsTarget ?? repsTarget;
  const { min } = parseRepsRange(target);
  return (set.repsActual ?? 0) >= min;
}

/** Toutes les séries de l'exercice ont atteint le minimum de reps → pas à l'échec. */
export function isExerciseSuccessful(sets, repsTarget) {
  if (!sets.length) return false;
  return sets.every((set) => isSetSuccessful(set, repsTarget));
}

export function getLastExercisePerformance(sessionsWithSets, exerciseName) {
  const candidates = EQUIVALENT_NAMES[exerciseName] ?? [exerciseName];
  const sorted = [...sessionsWithSets].sort((a, b) => {
    const dateA = a.completedAt ?? `${a.dateISO}T00:00:00`;
    const dateB = b.completedAt ?? `${b.dateISO}T00:00:00`;
    return dateB.localeCompare(dateA);
  });

  for (const session of sorted) {
    const sets = session.sets.filter((s) => candidates.includes(s.exerciseName));
    if (sets.length > 0) {
      return { session, sets };
    }
  }

  return null;
}

/**
 * Propose une charge pour la prochaine séance.
 * - Réussite (reps min atteintes sur toutes les séries) → +2,5 kg (ou +5 jambes)
 * - Échec (au moins une série sous l'objectif) → reprise au même poids, pas d'augmentation
 */
export async function suggestWeightForExercise(exerciseName, cibleTarget, exerciseType, sessionsWithSets) {
  if (exerciseType === 'isometrique') return null;

  const last = getLastExercisePerformance(sessionsWithSets, exerciseName);
  if (!last) return null;

  const maxWeight = Math.max(...last.sets.map((s) => s.weight ?? 0));
  if (maxWeight <= 0) return null;

  const repsForCheck = last.sets[0]?.repsTarget ?? cibleTarget;
  const successful = isExerciseSuccessful(last.sets, repsForCheck);
  const increment = getIncrementForExercise(exerciseName);


  if (successful) {
    const suggested = roundWeight(maxWeight + increment);
    return {
      weight: suggested,
      previousWeight: maxWeight,
      increment,
      type: 'increase',
      message: `Proposition ${suggested} kg (+${increment}) — réussi à ${maxWeight} kg la dernière fois`,
    };
  }

  return {
    weight: maxWeight,
    previousWeight: maxWeight,
    increment: 0,
    type: 'repeat',
    message: `Reprise à ${maxWeight} kg — objectif reps non atteint la dernière fois`,
  };
}
