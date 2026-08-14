import { parseRepsRange } from './programme.js';

export function estimate1RM(weight, reps) {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
}

export function calcSetVolume(set) {
  if (set.exerciseType === 'isometrique') {
    const secs = set.repsActual ?? 0;
    const weight = set.weight ?? 0;
    return weight > 0 ? weight * secs : 0;
  }
  const reps = set.repsActual ?? parseRepsRange(set.repsTarget).mid;
  return (set.weight ?? 0) * reps;
}

export function calcSessionVolume(sets) {
  return sets.reduce((sum, s) => sum + calcSetVolume(s), 0);
}

export function calcAvgRpe(sets) {
  const valid = sets.filter((s) => s.rpe != null);
  if (!valid.length) return 0;
  return valid.reduce((sum, s) => sum + s.rpe, 0) / valid.length;
}

export function calcAdherence(plannedSessions, { month, year } = {}) {
  let filtered = plannedSessions.filter((p) => p.status === 'done' || p.status === 'missed');

  if (year !== undefined) {
    filtered = filtered.filter((p) => parseInt(p.dateISO.slice(0, 4), 10) === year);
  }
  if (month !== undefined) {
    filtered = filtered.filter((p) => parseInt(p.dateISO.slice(5, 7), 10) === month);
  }

  const done = filtered.filter((p) => p.status === 'done').length;
  const total = filtered.length;
  if (total === 0) return { done: 0, total: 0, rate: 0 };

  return { done, total, rate: Math.round((done / total) * 100) };
}

export function groupByPeriod(dateISO, period) {
  if (period === 'week') {
    const d = new Date(dateISO);
    const monday = new Date(d);
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    return monday.toISOString().slice(0, 10);
  }
  if (period === 'month') return dateISO.slice(0, 7);
  if (period === 'year') return dateISO.slice(0, 4);
  return dateISO;
}

export function getWeightProgression(sessionsWithSets, exerciseName) {
  const points = [];

  for (const session of sessionsWithSets) {
    const exerciseSets = session.sets.filter((s) => s.exerciseName === exerciseName);
    if (!exerciseSets.length) continue;

    const maxWeight = Math.max(...exerciseSets.map((s) => s.weight ?? 0));
    points.push({ dateISO: session.dateISO, weight: maxWeight });
  }

  return points.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}

export function getRpeProgression(sessionsWithSets, exerciseName) {
  const points = [];

  for (const session of sessionsWithSets) {
    const exerciseSets = session.sets.filter((s) => s.exerciseName === exerciseName);
    if (!exerciseSets.length) continue;

    const avgRpe = calcAvgRpe(exerciseSets);
    points.push({ dateISO: session.dateISO, rpe: Math.round(avgRpe * 10) / 10 });
  }

  return points.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}

export function getVolumeByPeriod(sessionsWithSets, period = 'week') {
  const map = new Map();

  for (const session of sessionsWithSets) {
    const key = groupByPeriod(session.dateISO, period);
    const volume = calcSessionVolume(session.sets);
    map.set(key, (map.get(key) ?? 0) + volume);
  }

  return [...map.entries()]
    .map(([key, volume]) => ({ key, volume: Math.round(volume) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function getPersonalRecords(sessionsWithSets) {
  const byExercise = new Map();

  for (const session of sessionsWithSets) {
    for (const set of session.sets) {
      if (!set.exerciseName) continue;
      const reps = set.repsActual ?? parseRepsRange(set.repsTarget).mid;
      const weight = set.weight ?? 0;
      const volume = weight * reps;
      const rm1 = estimate1RM(weight, reps);

      if (!byExercise.has(set.exerciseName)) {
        byExercise.set(set.exerciseName, {
          exerciseName: set.exerciseName,
          maxWeight: 0,
          maxVolume: 0,
          max1RM: 0,
          maxWeightDate: null,
          max1RMDate: null,
        });
      }

      const rec = byExercise.get(set.exerciseName);
      if (weight > rec.maxWeight) {
        rec.maxWeight = weight;
        rec.maxWeightDate = session.dateISO;
      }
      if (volume > rec.maxVolume) {
        rec.maxVolume = volume;
      }
      if (rm1 > rec.max1RM) {
        rec.max1RM = Math.round(rm1 * 10) / 10;
        rec.max1RMDate = session.dateISO;
      }
    }
  }

  return [...byExercise.values()].sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}

export function getSessionTypeFrequency(sessionsWithSets, plannedSessions) {
  const freq = new Map();

  for (const session of sessionsWithSets) {
    let typeName = 'Autre';

    if (session.plannedSessionId) {
      const planned = plannedSessions.find((p) => p.id === session.plannedSessionId);
      if (planned) typeName = planned.sessionName;
    } else if (session.type === 'extra') {
      typeName = 'Hors planning';
    } else if (session.type === 'catchup') {
      typeName = 'Rattrapage';
    }

    freq.set(typeName, (freq.get(typeName) ?? 0) + 1);
  }

  return [...freq.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getUniqueExercises(sessionsWithSets) {
  const names = new Set();
  for (const session of sessionsWithSets) {
    for (const set of session.sets) {
      if (set.exerciseName) names.add(set.exerciseName);
    }
  }
  return [...names].sort();
}

export function getGlobalStats(plannedSessions, sessionsWithSets) {
  const adherence = calcAdherence(plannedSessions);
  const now = new Date();
  const monthAdherence = calcAdherence(plannedSessions, {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const yearAdherence = calcAdherence(plannedSessions, { year: now.getFullYear() });
  const weekVolume = getVolumeByPeriod(sessionsWithSets, 'week');
  const currentWeekKey = groupByPeriod(now.toISOString().slice(0, 10), 'week');
  const thisWeekVolume = weekVolume.find((w) => w.key === currentWeekKey)?.volume ?? 0;

  return {
    adherence,
    monthAdherence,
    yearAdherence,
    thisWeekVolume,
    totalSessions: sessionsWithSets.length,
    totalSets: sessionsWithSets.reduce((sum, s) => sum + s.sets.length, 0),
  };
}
