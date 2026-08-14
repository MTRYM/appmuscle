import mapping from './exerciseGifs.json';

/** Alias noms programme v2 → clés mapping existantes */
const ALIASES = {
  'Ring Dip': 'Weighted Ring Dip',
  'Tuck Front Lever Hold': 'Advanced Tuck Front Lever Hold',
  'Scapular Push-Up': 'Push-Up',
  'Dead Hang': 'Scapular Pull-Up',
  'Band Pull-Apart': 'Face Pull',
};

/**
 * Retourne les métadonnées GIF pour un exercice du programme, ou null si absent.
 * Source : ExerciseGymGifsDB (jsDelivr CDN) — mapping vérifié manuellement.
 */
export function getExerciseGif(exerciseName) {
  if (!exerciseName) return null;
  const key = ALIASES[exerciseName] ?? exerciseName;
  return mapping[key] ?? null;
}

export function getExerciseGifUrl(exerciseName) {
  return getExerciseGif(exerciseName)?.gifUrl ?? null;
}
