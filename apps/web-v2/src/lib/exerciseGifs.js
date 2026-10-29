import mapping from './exerciseGifs.json';

/** Alias noms programme v2 → clés mapping existantes */
const ALIASES = {
  'Ring Dip': 'Weighted Ring Dip',
  'Weighted Dip': 'Weighted Ring Dip',
  'Tuck Front Lever Hold': 'Advanced Tuck Front Lever Hold',
  'Open-Hip Tuck Front Lever Hold': 'Advanced Tuck Front Lever Hold',
  'Single-Leg Half-Tuck Front Lever Hold': 'Advanced Tuck Front Lever Hold',
  'Paused Front Lever Raises (Tuck)': 'Front Lever Raises (Tuck)',
  'Paused Front Lever Raises (Open-Tuck)': 'Front Lever Raises (Tuck)',
  'Paused Front Lever Raises (Adv Tuck)': 'Front Lever Raises (Tuck)',
  'Scapular Front Lever Pull-to-Hold': 'Scapular Pull-Up',
  'Scapular Push-Up': 'Push-Up',
  'Pseudo Planche Push-Up': 'Push-Up',
  'Dead Hang': 'Scapular Pull-Up',
  'Band Pull-Apart': 'Face Pull',
  'Handstand Freestanding Practice': 'Handstand Chest-to-Wall',
  'Handstand Balance Flow': 'Handstand Chest-to-Wall',
  'Tuck Handstand Hold': 'Handstand Chest-to-Wall',
  'Wall Handstand Shoulder Taps': 'Handstand Chest-to-Wall',
  'Elevated Pike Push-Up': 'Push-Up',
  'Wall Handstand Push-Up (Négatives)': 'Handstand Chest-to-Wall',
  'Wall Handstand Push-Up (Concentrique Explosif)': 'Handstand Chest-to-Wall',
  'Wall Handstand Push-Up': 'Handstand Chest-to-Wall',
  'Planche Lean': 'Push-Up',
  'Planche Lean (Protraction Active)': 'Push-Up',
  'Planche Lean (Pieds au mur)': 'Push-Up',
  'Scapular Planche Lean Hold': 'Push-Up',
  'Tuck Planche Float (Décollement depuis Lean)': 'Push-Up',
  'Tuck Planche Float (Maintien 2-3s)': 'Push-Up',
  'Tuck Planche Float (Maintien 3-4s)': 'Push-Up',
  'Tuck Planche Hold (Essais Courts / Float)': 'Push-Up',
  'Tuck Planche Hold': 'Push-Up',
  'TRX Inverted Row': 'Chest Supported Row',
  'Chest-Supported Row': 'Chest Supported Row',
  'Straight-Arm Lat Pulldown': 'Scapular Pull-Up',
  'Hollow Body Hold': 'Dead Bug',
  'Strict Muscle-Up (Qualité)': 'Low Bar Muscle-Up Transition',
  'Tuck L-Sit Hold': 'Dead Bug',
  'L-Sit Hold (Parallettes ou Sol)': 'Dead Bug',
  'L-Sit Hold (Mains au sol)': 'Dead Bug',
  'L-Sit to Tuck Press Transition Prep': 'Dead Bug',
  'L-Sit to Tuck Planche Rock': 'Dead Bug',
  'Combo L-Sit → Tuck Planche → Bent-Arm Press Prep': 'Dead Bug',
  'Dragon Flag (Négatives / Holds)': 'Dead Bug',
  'Archer Pull-Up (Progression)': 'Pronated Pull-Up',
  'Band Biceps Curl': 'Bayesian Cable Curl',
  'Seated Pike Compression Leg Lift': 'Dead Bug',
  'Hanging Knee-to-Chest Lift': 'Dead Bug',
  'Depth Drop to Max Jump': 'Countermovement Jump',
  'Wrist Warm-Up (Flexion & Extension Sol)': 'Reverse Wrist Curl',
  'Thoracic Butcher\'s Block Stretch': 'Push-Up',
  '90/90 Hip Switch Structuré': 'Glute Bridge',
  'Loaded Pike Compression Stretch': 'Romanian Deadlift',
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
