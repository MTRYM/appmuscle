/**
 * Catégorisation des exercices pour les statistiques.
 * Les règles sont évaluées dans l'ordre : la première qui correspond gagne.
 * Tout exercice inconnu (séance libre, futur exercice) tombe dans « Autres »,
 * donc rien ne disparaît de l'interface.
 */

export const CATEGORY_ORDER = [
  'Poussée',
  'Tirage',
  'Handstand',
  'Front Lever & Planche',
  'Gainage & Abdos',
  'Bras & Poignets',
  'Jambes & Explosivité',
  'Mobilité',
  'Autres',
];

const RULES = [
  ['Mobilité', ['mobility']],
  ['Handstand', ['handstand', 'pike push-up']],
  ['Front Lever & Planche', ['front lever', 'planche']],
  [
    'Gainage & Abdos',
    ['l-sit', 'hollow', 'dead bug', 'dragon flag', 'knee-to-chest', 'copenhagen', 'pallof', 'compression'],
  ],
  ['Bras & Poignets', ['curl', 'external rotation']],
  ['Jambes & Explosivité', ['squat', 'deadlift', 'glute', 'jump', 'clean']],
  ['Tirage', ['pull-up', 'dead hang', 'pull-apart', 'muscle-up']],
  ['Poussée', ['bench', 'larsen', 'push-up', 'dip', 'overhead press']],
];

export function getExerciseCategory(name) {
  const n = String(name ?? '').toLowerCase();
  for (const [category, keywords] of RULES) {
    if (keywords.some((k) => n.includes(k))) return category;
  }
  return 'Autres';
}

/** Retourne [{ category, items: [...] }] dans l'ordre CATEGORY_ORDER, sans catégories vides. */
export function groupByCategory(items, getName = (x) => x) {
  const map = new Map();
  for (const item of items) {
    const cat = getExerciseCategory(getName(item));
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(item);
  }
  return CATEGORY_ORDER.filter((c) => map.has(c)).map((category) => ({
    category,
    items: map.get(category),
  }));
}
