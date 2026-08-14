import { load as loadYaml } from 'js-yaml';
import yamlRaw from '../../programme.yaml?raw';

const JOUR_OFFSET = {
  Lundi: 0,
  Mardi: 1,
  Mercredi: 2,
  Jeudi: 3,
  Vendredi: 4,
  Samedi: 5,
  Dimanche: 6,
};

let cachedProgramme = null;

/** Parse une cible numérique : reps ("6-8") ou secondes ("12-15"). */
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

/** @deprecated alias */
export const parseRepsRange = parseTargetRange;

export function isIsometricExercise(ex) {
  return ex?.type === 'isometrique';
}

export function isWarmupExercise(ex) {
  return ex?.groupe === 'Échauffement';
}

export function formatExerciseCible(ex) {
  if (!ex) return '';
  if (isIsometricExercise(ex)) {
    return `${ex.cibleParsed?.raw ?? ex.cible} s`;
  }
  return `${ex.cibleParsed?.raw ?? ex.cible} reps`;
}

export function formatSetPerformance(set) {
  if (set.exerciseType === 'isometrique') {
    const w = set.weight > 0 ? `${set.weight} kg · ` : '';
    return `${w}${set.repsActual} s`;
  }
  return `${set.weight} kg × ${set.repsActual}`;
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
    /** @deprecated — utiliser cible */
    reps: type === 'reps' ? String(cibleRaw) : undefined,
    duree_sec: type === 'isometrique' ? String(cibleRaw) : undefined,
    repsParsed: cibleParsed,
    description: (ex.description ?? '').trim(),
    repos_sec: ex.repos_sec ?? 90,
    rpe_cible: ex.rpe_cible ?? 7,
    groupe: ex.groupe ?? seanceNom,
  };
}

export function parseProgramme() {
  if (cachedProgramme) return cachedProgramme;

  const raw = loadYaml(yamlRaw);
  if (!raw?.cycles?.length) {
    throw new Error('programme.yaml invalide : cycles manquant');
  }

  const cycles = raw.cycles.map((cycle, cycleIndex) => {
    if (!cycle.nom || !cycle.seances?.length) {
      throw new Error(`Cycle ${cycleIndex + 1} invalide`);
    }

    const seances = cycle.seances.map((seance, sessionIndex) => {
      const jour = seance.jour?.trim();
      if (jour === undefined || JOUR_OFFSET[jour] === undefined) {
        throw new Error(`Jour invalide : ${jour}`);
      }

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

    return {
      cycleIndex,
      nom: cycle.nom,
      seances,
    };
  });

  cachedProgramme = { cycles };
  return cachedProgramme;
}

function getMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toISODate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function generatePlannedSessions(startDateISO, programme) {
  const weekStart = getMonday(startDateISO);
  const planned = [];

  for (const cycle of programme.cycles) {
    for (const seance of cycle.seances) {
      const offset = cycle.cycleIndex * 7 + seance.jourOffset;
      const sessionDate = addDays(weekStart, offset);

      planned.push({
        dateISO: toISODate(sessionDate),
        cycleIndex: cycle.cycleIndex,
        sessionIndex: seance.sessionIndex,
        cycleName: cycle.nom,
        sessionName: seance.nom,
        jour: seance.jour,
        status: 'pending',
      });
    }
  }

  return planned.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}

export function getSessionExercises(programme, cycleIndex, sessionIndex) {
  const cycle = programme.cycles[cycleIndex];
  if (!cycle) return [];
  const seance = cycle.seances[sessionIndex];
  return seance?.exercices ?? [];
}

export function getSessionTemplate(programme, cycleIndex, sessionIndex) {
  const cycle = programme.cycles[cycleIndex];
  if (!cycle) return null;
  const seance = cycle.seances[sessionIndex];
  if (!seance) return null;
  return {
    cycleIndex,
    sessionIndex,
    cycleName: cycle.nom,
    sessionName: seance.nom,
    jour: seance.jour,
    exercices: seance.exercices,
  };
}

export function getAllSessionTemplates(programme) {
  const templates = [];
  const seen = new Set();

  for (const cycle of programme.cycles) {
    for (const seance of cycle.seances) {
      const key = `${seance.nom}-${cycle.cycleIndex}-${seance.sessionIndex}`;
      if (seen.has(key)) continue;
      seen.add(key);
      templates.push({
        cycleIndex: cycle.cycleIndex,
        sessionIndex: seance.sessionIndex,
        cycleName: cycle.nom,
        sessionName: seance.nom,
        jour: seance.jour,
        exercices: seance.exercices,
        label: `${seance.nom} (${cycle.nom})`,
      });
    }
  }

  return templates;
}

export function formatDateFR(dateISO) {
  const [y, m, d] = dateISO.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
