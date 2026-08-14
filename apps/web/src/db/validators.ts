import { z } from 'zod';

export const baseRecordSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const migratedRecordSchema = z.object({
  legacyId: z.number().optional(),
});

// --- Core ---
export const settingRecordSchema = baseRecordSchema.extend({
  programStartDate: z.string(), // ISO date YYYY-MM-DD
  theme: z.enum(['dark', 'light']),
});

export const athleteProfileRecordSchema = baseRecordSchema.extend({
  data: z.string(),
});

// --- Programme & Planning ---
export const exerciseRecordSchema = baseRecordSchema.extend({
  name: z.string(),
  type: z.enum(['reps', 'isometrique']),
});

export const programRecordSchema = baseRecordSchema.extend({
  name: z.string(),
});

export const trainingBlockRecordSchema = baseRecordSchema.extend({
  programId: z.string().uuid(),
  name: z.string(),
  order: z.number(),
});

export const workoutTemplateRecordSchema = baseRecordSchema.extend({
  blockId: z.string().uuid(),
  name: z.string(),
  dayOfWeek: z.string(),
});

export const plannedExerciseRecordSchema = baseRecordSchema.extend({
  workoutTemplateId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  group: z.string().nullable(),
  order: z.number(),
  sets: z.number(),
  targetReps: z.string(),
  targetRpe: z.number().nullable(),
  targetRestSec: z.number(),
  description: z.string(),
});

export const plannedSessionRecordSchema = baseRecordSchema.merge(migratedRecordSchema).extend({
  dateISO: z.string(),
  cycleIndex: z.number(),
  sessionIndex: z.number(),
  cycleName: z.string(),
  sessionName: z.string(),
  jour: z.string(),
  status: z.enum(['pending', 'done', 'missed']),
});

export const plannedSetRecordSchema = baseRecordSchema.extend({
  plannedSessionId: z.string().uuid(),
  plannedExerciseId: z.string().uuid(),
  setNumber: z.number(),
});

// --- Données d'entraînement ---
export const workoutSessionFeedbackSchema = z.object({
  rpeRessenti: z.number().nullable(),
  energieAvant: z.number().nullable(),
  energieApres: z.number().nullable(),
  sommeil: z.number().nullable(),
  courbatures: z.number().nullable(),
  motivation: z.number().nullable(),
  douleur: z.boolean().nullable(),
  douleurDetail: z.string(),
  notes: z.string(),
});

export const workoutSessionRecordSchema = baseRecordSchema.merge(migratedRecordSchema).extend({
  dateISO: z.string(),
  plannedSessionId: z.string().uuid().nullable(),
  type: z.enum(['planned', 'catchup', 'extra']),
  status: z.enum(['completed', 'in_progress']),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  durationSec: z.number(),
  avgRpe: z.number().nullable(),
  feedback: workoutSessionFeedbackSchema.nullable(),
});

export const performedSetRecordSchema = baseRecordSchema.merge(migratedRecordSchema).extend({
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid().nullable(),
  exerciseName: z.string(),
  exerciseType: z.enum(['reps', 'isometrique']),
  setNumber: z.number(),
  weight: z.number(),
  repsActual: z.number(),
  repsTarget: z.string(),
  rpe: z.number().nullable(),
  restSecActual: z.number().nullable(),
});

// --- Suivi & Santé ---
export const checkInRecordSchema = baseRecordSchema.extend({
  dateISO: z.string(),
  weight: z.number().nullable(),
  notes: z.string(),
});

export const measurementRecordSchema = baseRecordSchema.extend({
  dateISO: z.string(),
  type: z.string(),
  value: z.number(),
});

export const personalRecordRecordSchema = baseRecordSchema.extend({
  exerciseId: z.string().uuid(),
  dateISO: z.string(),
  weight: z.number(),
  reps: z.number(),
});

export const vacationRecordSchema = baseRecordSchema.merge(migratedRecordSchema).extend({
  startDateISO: z.string(),
  endDateISO: z.string(),
  days: z.number(),
  shiftedSessions: z.number(),
});

// --- IA & Recommandations ---
export const recommendationRecordSchema = baseRecordSchema.extend({
  dateISO: z.string(),
  context: z.string(),
  recommendation: z.string(),
  applied: z.boolean(),
});

export const programChangeRecordSchema = baseRecordSchema.extend({
  dateISO: z.string(),
  changeType: z.string(),
  details: z.string(),
});

// --- Système ---
export const importRecordSchema = baseRecordSchema.extend({
  importedAt: z.string().datetime(),
  fileHash: z.string(),
  recordCount: z.number(),
});

export const exportRecordSchema = baseRecordSchema.extend({
  exportedAt: z.string().datetime(),
  recordCount: z.number(),
});

export const auditEventRecordSchema = baseRecordSchema.extend({
  eventType: z.string(),
  details: z.string(),
});
