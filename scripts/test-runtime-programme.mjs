import { load as loadYaml } from 'js-yaml';
import fs from 'fs';

const JOUR_OFFSET = {
  Lundi: 0,
  Mardi: 1,
  Mercredi: 2,
  Jeudi: 3,
  Vendredi: 4,
  Samedi: 5,
  Dimanche: 6,
};

export function parseTargetRange(value) {
  if (typeof value === 'number') {
    return { min: value, max: value, mid: value, raw: String(value) };
  }
  const str = String(value).trim();
  const match = str.match(/^(\d+)\s*-\s*(\d+)$/);
  if (match) {
    const min = parseInt(match[1], 10);
    const max = parseInt(match[2], 10);
    return { min, max, mid: (min + max) / 2, raw: str };
  }
  const single = parseInt(str, 10);
  if (!Number.isNaN(single)) {
    return { min: single, max: single, mid: single, raw: str };
  }
  return { min: 0, max: 0, mid: 0, raw: str };
}

function normalizeExercise(ex, seanceNom) {
  const type = ex.type === 'isometrique' ? 'isometrique' : 'reps';
  const cibleRaw =
    type === 'isometrique'
      ? (ex.duree_sec ?? ex.reps ?? '10')
      : (ex.reps ?? '8-10');
  const cibleParsed = parseTargetRange(cibleRaw);

  return {
    nom: ex.nom,
    type,
    series: ex.series ?? 3,
    cible: String(cibleRaw),
    cibleParsed,
    reps: type === 'reps' ? String(cibleRaw) : undefined,
    duree_sec: type === 'isometrique' ? String(cibleRaw) : undefined,
    repsParsed: cibleParsed,
    description: (ex.description ?? '').trim(),
    repos_sec: ex.repos_sec ?? 90,
    rpe_cible: ex.rpe_cible ?? 7,
    groupe: ex.groupe ?? seanceNom,
  };
}

try {
  const yamlRaw = fs.readFileSync('apps/web-v2/programme.yaml', 'utf8');
  const raw = loadYaml(yamlRaw);
  
  const cycles = raw.cycles.map((cycle, cycleIndex) => {
    const seances = cycle.seances.map((seance, sessionIndex) => {
      const jour = seance.jour?.trim();
      const exercices = (seance.exercices ?? []).map((ex) =>
        normalizeExercise(ex, seance.nom),
      );
      return {
        sessionIndex,
        jour,
        jourOffset: JOUR_OFFSET[jour],
        nom: seance.nom,
        exercices,
      };
    });
    return { cycleIndex, nom: cycle.nom, seances };
  });

  console.log(`✅ ${cycles.length} cycles analysés avec succès !`);
  let totalExos = 0;
  cycles.forEach(c => {
    c.seances.forEach(s => {
      totalExos += s.exercices.length;
      s.exercices.forEach(e => {
        if (!e.cibleParsed.raw) {
          throw new Error(`Cible manquante pour ${e.nom}`);
        }
      });
    });
  });
  console.log(`✅ Total exercices validés : ${totalExos} exercices normalisés.`);
  console.log('\n🎉 VALIDATION RUNTIME ET PARSING 100% SUCCÈS !');
} catch (err) {
  console.error('❌ Erreur:', err);
  process.exit(1);
}
