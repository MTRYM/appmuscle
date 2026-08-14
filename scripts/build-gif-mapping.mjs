/**
 * Build exercise GIF mapping from ExerciseGymGifsDB (jsDelivr CDN).
 * Run: node scripts/build-gif-mapping.mjs
 */
import fs from 'fs';

const GIFDB_URL =
  'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/api/en/exercises.json';
const CDN_BASE =
  'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0';

const PROGRAMME_NAMES = [
  'Band Pull-Apart',
  'Scapular Push-Up',
  'Push-Up',
  'Dead Hang',
  'Scapular Pull-Up',
  'Glute Bridge',
  'Bodyweight Squat',
  'Jump Squat',
  'Handstand Chest-to-Wall',
  'Wall Handstand Toe Pulls',
  'Scapular Handstand Shrugs',
  'Jefferson Curl',
  'Copenhagen Side Plank',
  'Dead Bug',
  'Bench Press',
  'Larsen Press',
  'Weighted Ring Dip',
  'Standing Dumbbell Overhead Press',
  'Cable Lateral Raise',
  'Cable External Rotation',
  'Advanced Tuck Front Lever Hold',
  'Front Lever Raises (Tuck)',
  'Front Lever Raises',
  'Weighted Pull-Up',
  'Chest-to-Bar Pull-Up',
  'Chest Supported Row',
  'Bayesian Cable Curl',
  'Reverse Wrist Curl',
  'Countermovement Jump',
  'Hang Power Clean',
  'Bulgarian Split Squat',
  'Romanian Deadlift',
  'Seated Calf Raise',
  'Pallof Press',
  'False Grip Hang',
  'Explosive Chest-to-Bar Pull-Up',
  'Low Bar Muscle-Up Transition',
  'Low Bar Transition',
  'Negative Muscle-Up',
  'Incline Dumbbell Press',
  'Leaning Cable Lateral Raise',
  'Overhead Rope Triceps Extension',
  'Front Lever Scapular Pull',
  'Pronated Pull-Up',
  'Chest Supported T-Bar Row',
  'Incline Dumbbell Curl',
  'Face Pull',
  'Neck Flexion',
  'Neck Extension',
  'Max Vertical Jump',
  'Broad Jump',
  'Sprint 20 m',
  'Pogos',
  'Shoulder Mobility Flow',
  'Hip Mobility Flow',
];

/**
 * Manual overrides — verified best GIF match per programme exercise.
 * Only include when auto-match would be wrong or ambiguous.
 */
const MANUAL = {
  'Band Pull-Apart': 'band-pull-apart',
  'Scapular Push-Up': 'scapular-push-up',
  'Push-Up': 'push-up',
  'Dead Hang': 'dead-hang',
  'Scapular Pull-Up': 'scapular-pull-up',
  'Glute Bridge': 'barbell-glute-bridge-two-legs-on-bench-male',
  'Bodyweight Squat': 'squat',
  'Jump Squat': 'jump-squat',
  'Handstand Chest-to-Wall': 'handstand',
  'Wall Handstand Toe Pulls': 'handstand',
  'Scapular Handstand Shrugs': 'scapular-pull-up',
  'Jefferson Curl': null,
  'Copenhagen Side Plank': 'side-plank-hip-adduction',
  'Dead Bug': 'dead-bug',
  'Bench Press': 'barbell-bench-press',
  'Larsen Press': 'barbell-bench-press',
  'Weighted Ring Dip': 'ring-dips',
  'Standing Dumbbell Overhead Press': 'dumbbell-standing-overhead-press',
  'Cable Lateral Raise': 'cable-lateral-raise',
  'Cable External Rotation': 'cable-standing-shoulder-external-rotation',
  'Advanced Tuck Front Lever Hold': 'front-lever',
  'Front Lever Raises (Tuck)': 'front-lever',
  'Front Lever Raises': 'front-lever',
  'Weighted Pull-Up': 'weighted-pull-up',
  'Chest-to-Bar Pull-Up': 'pull-up',
  'Chest Supported Row': 'lever-seated-row',
  'Bayesian Cable Curl': 'cable-curl',
  'Reverse Wrist Curl': 'dumbbell-reverse-wrist-curl',
  'Countermovement Jump': 'jump-squat',
  'Hang Power Clean': 'power-clean',
  'Bulgarian Split Squat': 'dumbbell-single-leg-split-squat',
  'Romanian Deadlift': 'barbell-romanian-deadlift',
  'Seated Calf Raise': 'barbell-seated-calf-raise',
  'Pallof Press': 'band-horizontal-pallof-press',
  'False Grip Hang': null,
  'Explosive Chest-to-Bar Pull-Up': 'pull-up',
  'Low Bar Muscle-Up Transition': 'muscle-up',
  'Low Bar Transition': 'muscle-up',
  'Negative Muscle-Up': 'muscle-up',
  'Incline Dumbbell Press': 'dumbbell-incline-bench-press',
  'Leaning Cable Lateral Raise': 'cable-lateral-raise',
  'Overhead Rope Triceps Extension': 'cable-overhead-triceps-extension-rope-attachment',
  'Front Lever Scapular Pull': 'scapular-pull-up',
  'Pronated Pull-Up': 'pull-up',
  'Chest Supported T-Bar Row': 'lever-t-bar-row',
  'Incline Dumbbell Curl': 'dumbbell-incline-biceps-curl',
  'Face Pull': 'cable-rear-delt-row-with-rope',
  'Neck Flexion': null,
  'Neck Extension': null,
  'Max Vertical Jump': 'jump-squat',
  'Broad Jump': null,
  'Sprint 20 m': null,
  'Pogos': null,
  'Shoulder Mobility Flow': 'chest-and-front-of-shoulder-stretch',
  'Hip Mobility Flow': 'roller-hip-stretch',
};

const SEARCH_QUERIES = {
  'Handstand Chest-to-Wall': ['handstand against wall', 'wall handstand'],
  'Wall Handstand Toe Pulls': ['handstand', 'wall walk'],
  'Scapular Handstand Shrugs': ['scapular pull', 'scapular shrug'],
  'Jefferson Curl': ['jefferson curl'],
  'Copenhagen Side Plank': ['copenhagen plank', 'copenhagen'],
  'Dead Bug': ['dead bug'],
  'Bench Press': ['barbell bench press', 'bench press'],
  'Larsen Press': ['bench press'],
  'Weighted Ring Dip': ['ring dip'],
  'Standing Dumbbell Overhead Press': ['dumbbell shoulder press', 'overhead press'],
  'Cable Lateral Raise': ['cable lateral raise'],
  'Cable External Rotation': ['cable external rotation'],
  'Advanced Tuck Front Lever Hold': ['front lever', 'tuck front lever'],
  'Front Lever Raises (Tuck)': ['front lever'],
  'Front Lever Raises': ['front lever'],
  'Weighted Pull-Up': ['weighted pull up', 'weighted pull-up'],
  'Chest-to-Bar Pull-Up': ['pull up', 'pull-up'],
  'Chest Supported Row': ['chest supported row'],
  'Bayesian Cable Curl': ['cable curl', 'bayesian curl'],
  'Reverse Wrist Curl': ['reverse wrist curl'],
  'Countermovement Jump': ['box jump', 'jump squat'],
  'Hang Power Clean': ['hang clean', 'power clean'],
  'Bulgarian Split Squat': ['bulgarian split squat'],
  'Romanian Deadlift': ['romanian deadlift'],
  'Seated Calf Raise': ['seated calf raise'],
  'Pallof Press': ['pallof press'],
  'False Grip Hang': ['dead hang'],
  'Explosive Chest-to-Bar Pull-Up': ['pull up'],
  'Low Bar Muscle-Up Transition': ['muscle up', 'muscle-up'],
  'Low Bar Transition': ['muscle up'],
  'Negative Muscle-Up': ['muscle up'],
  'Incline Dumbbell Press': ['incline dumbbell press', 'incline bench press'],
  'Leaning Cable Lateral Raise': ['cable lateral raise'],
  'Overhead Rope Triceps Extension': ['cable overhead triceps', 'rope triceps'],
  'Front Lever Scapular Pull': ['scapular pull'],
  'Pronated Pull-Up': ['pull up', 'pull-up'],
  'Chest Supported T-Bar Row': ['t bar row', 't-bar row'],
  'Incline Dumbbell Curl': ['incline dumbbell curl'],
  'Face Pull': ['face pull'],
  'Neck Flexion': ['neck flexion'],
  'Neck Extension': ['neck extension'],
  'Max Vertical Jump': ['box jump', 'vertical jump'],
  'Broad Jump': ['broad jump', 'standing broad jump'],
  'Shoulder Mobility Flow': ['shoulder stretch', 'shoulder mobility'],
  'Hip Mobility Flow': ['hip stretch', 'hip flexor stretch'],
};

function norm(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function score(name, query) {
  const n = norm(name);
  const q = norm(query);
  if (n === q) return 100;
  if (n.includes(q) && q.length >= 6) return 90;
  const qWords = q.split(' ').filter((w) => w.length > 2);
  if (!qWords.length) return 0;
  if (!qWords.every((w) => n.includes(w))) return 0;
  return 60 + qWords.length * 8;
}

function findBySlug(db, slug) {
  return db.find(
    (e) =>
      e.slug === slug ||
      e.id === slug ||
      e.id?.endsWith(`/${slug}`) ||
      e.file?.includes(`/${slug}.gif`),
  );
}

function findBest(db, queries) {
  let best = null;
  let bestScore = 0;
  for (const q of queries) {
    for (const ex of db) {
      const s = score(ex.name, q);
      if (s > bestScore) {
        bestScore = s;
        best = ex;
      }
    }
    if (bestScore >= 90) break;
  }
  return bestScore >= 60 ? best : null;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

console.log('Fetching ExerciseGymGifsDB (by muscle groups)...');
const musclesRes = await fetch(`${CDN_BASE}/api/en/muscles.json`);
const muscles = await musclesRes.json();
const db = [];
for (const m of muscles) {
  const r = await fetch(`${CDN_BASE}/api/en/${m.endpoint}`);
  const json = await r.json();
  const list = json.exercises ?? json;
  if (Array.isArray(list)) db.push(...list);
  await sleep(200);
}
console.log(`Loaded ${db.length} exercises`);

const byId = new Map(db.map((e) => [e.id, e]));
const mapping = {};
const report = [];

for (const name of PROGRAMME_NAMES) {
  const manualSlug = MANUAL[name];
  if (manualSlug === null) {
    report.push(`✗ ${name} — volontairement sans GIF (pas de démo fiable)`);
    continue;
  }

  let match = manualSlug ? findBySlug(db, manualSlug) : null;
  if (!match) {
    const queries = SEARCH_QUERIES[name] ?? [name];
    match = findBest(db, queries);
  }

  if (match) {
    const gifUrl = match.gifUrl || `${CDN_BASE}/${match.file}`;
    mapping[name] = {
      gifUrl,
      source: 'ExerciseGymGifsDB',
      sourceName: match.name,
      sourceId: match.id,
    };
    report.push(`✓ ${name} → ${match.name} (${match.id})`);
  } else {
    report.push(`✗ ${name} — aucun GIF trouvé`);
  }
}

console.log('\n' + report.join('\n'));
console.log(`\nMapped: ${Object.keys(mapping).length}/${PROGRAMME_NAMES.length}`);

// Verify a sample of URLs
console.log('\nVerifying GIF URLs...');
let ok = 0;
let fail = 0;
for (const [name, data] of Object.entries(mapping)) {
  try {
    const r = await fetch(data.gifUrl, { method: 'HEAD' });
    if (r.ok) ok++;
    else {
      fail++;
      console.warn(`FAIL HEAD ${name}: ${r.status}`);
      delete mapping[name];
    }
  } catch (e) {
    fail++;
    console.warn(`FAIL ${name}:`, e.message);
    delete mapping[name];
  }
}
console.log(`Verified: ${ok} OK, ${fail} removed`);

fs.writeFileSync('src/lib/exerciseGifs.json', JSON.stringify(mapping, null, 2));
console.log('Written src/lib/exerciseGifs.json');
