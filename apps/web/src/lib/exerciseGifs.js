import mapping from './exerciseGifs.json';

/** Alias noms programme v2 → clés mapping existantes */
const ALIASES = {
  'Ring Dip': 'Weighted Ring Dip',
  'Tuck Front Lever Hold': 'Advanced Tuck Front Lever Hold',
  'Scapular Push-Up': 'Push-Up',
  'Dead Hang': 'Scapular Pull-Up',
  'Band Pull-Apart': 'Face Pull',
  'Handstand Freestanding Practice': 'Handstand Chest-to-Wall',
  'Handstand Balance Flow': 'Handstand Chest-to-Wall',
  'Wall Handstand Shoulder Taps': 'Handstand Chest-to-Wall',
  'Elevated Pike Push-Up': 'Push-Up',
  'Wall Handstand Push-Up (Négatives)': 'Handstand Chest-to-Wall',
  'Wall Handstand Push-Up': 'Handstand Chest-to-Wall',
  'Planche Lean': 'Push-Up',
  'Planche Lean (Protraction Active)': 'Push-Up',
  'Tuck Planche Hold': 'Push-Up',
  'TRX Inverted Row': 'Chest Supported Row',
  'Hollow Body Hold': 'Dead Bug',
  'Strict Muscle-Up (Qualité)': 'Low Bar Muscle-Up Transition',
  'Tuck L-Sit Hold': 'Dead Bug',
  'L-Sit Hold (Parallettes ou Sol)': 'Dead Bug',
  'L-Sit to Tuck Press Transition Prep': 'Dead Bug',
  'Dragon Flag (Négatives / Holds)': 'Dead Bug',
  'Archer Pull-Up (Progression)': 'Pronated Pull-Up',
  'Band Biceps Curl': 'Bayesian Cable Curl',
  'Seated Pike Compression Leg Lift': 'Dead Bug',
  'Hanging Knee-to-Chest Lift': 'Dead Bug',
  'Elephant Walk & Pike Décompression': 'Dead Bug',
  'Puppy Dog Pose (Ouverture Épaules)': 'Push-Up',
  'Couch Stretch (Fléchisseurs / Psoas)': 'Glute Bridge',
  'Wrist & Forearm Mobility Flow': 'Reverse Wrist Curl',
  '90/90 Hip Flow & Pancake doux': 'Glute Bridge',
  'Child\'s Pose & Respiration Diaphragmatique': 'Dead Bug',
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
