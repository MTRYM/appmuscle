import { z } from 'zod';

export const legacySettingSchema = z.object({
  id: z.literal('main').or(z.string()),
  programStartDate: z.string(),
  theme: z.enum(['dark', 'light']).optional().default('dark')
});

export const legacyPlannedSessionSchema = z.object({
  id: z.number(),
  dateISO: z.string(),
  cycleIndex: z.number(),
  sessionIndex: z.number(),
  cycleName: z.string(),
  sessionName: z.string(),
  jour: z.string(),
  status: z.enum(['pending', 'done', 'missed']),
});

export const legacySessionFeedbackSchema = z.object({
  rpeRessenti: z.number().nullable(),
  energieAvant: z.number().nullable(),
  energieApres: z.number().nullable(),
  sommeil: z.number().nullable(),
  courbatures: z.number().nullable(),
  motivation: z.number().nullable(),
  douleur: z.boolean().nullable(),
  douleurDetail: z.string().optional().default(''),
  notes: z.string().optional().default('')
});

export const legacySessionSchema = z.object({
  id: z.number(),
  dateISO: z.string(),
  plannedSessionId: z.number().nullable(),
  type: z.enum(['planned', 'catchup', 'extra']),
  status: z.string(),
  startedAt: z.string(), // these might not be proper ISO 8601 in older exports
  completedAt: z.string(),
  durationSec: z.number(),
  avgRpe: z.number().nullable().optional(),
  feedback: legacySessionFeedbackSchema.nullable().optional()
});

export const legacySetSchema = z.object({
  id: z.number(),
  sessionId: z.number(),
  exerciseName: z.string(),
  exerciseType: z.enum(['reps', 'isometrique']),
  setNumber: z.number(),
  weight: z.number(),
  repsActual: z.number(),
  repsTarget: z.string(),
  rpe: z.number().nullable().optional(),
  restSecActual: z.number().nullable().optional()
});

export const legacyVacationSchema = z.object({
  id: z.number(),
  startDateISO: z.string(),
  endDateISO: z.string(),
  days: z.number(),
  shiftedSessions: z.number(),
  createdAt: z.string().optional()
});

export const legacyExportV1Schema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  settings: z.array(legacySettingSchema),
  plannedSessions: z.array(legacyPlannedSessionSchema),
  sessions: z.array(legacySessionSchema),
  sets: z.array(legacySetSchema)
});

export const legacyExportV2Schema = z.object({
  version: z.literal(2),
  exportedAt: z.string(),
  settings: z.array(legacySettingSchema),
  plannedSessions: z.array(legacyPlannedSessionSchema),
  sessions: z.array(legacySessionSchema),
  sets: z.array(legacySetSchema),
  vacations: z.array(legacyVacationSchema)
});

export const legacyExportSchema = z.union([legacyExportV1Schema, legacyExportV2Schema]);
