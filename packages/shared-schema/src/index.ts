export interface BaseRecord {
  id: string; // UUID v4
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface MigratedRecord {
  legacyId: number; // L'ancien auto-increment
}

// --- Core ---
export interface SettingRecord extends BaseRecord {
  programStartDate: string;
  theme: 'dark' | 'light';
}

export interface AthleteProfileRecord extends BaseRecord {
  data: string; 
}

// --- Programme & Planning ---
export interface ExerciseRecord extends BaseRecord {
  name: string;
  type: 'reps' | 'isometrique';
}

export interface ProgramRecord extends BaseRecord {
  name: string;
}

export interface TrainingBlockRecord extends BaseRecord {
  programId: string;
  name: string;
  order: number;
}

export interface WorkoutTemplateRecord extends BaseRecord {
  blockId: string;
  name: string;
  dayOfWeek: string;
}

export interface PlannedExerciseRecord extends BaseRecord {
  workoutTemplateId: string;
  exerciseId: string;
  group: string | null;
  order: number;
  sets: number;
  targetReps: string;
  targetRpe: number | null;
  targetRestSec: number;
  description: string;
}

export interface PlannedSessionRecord extends BaseRecord, Partial<MigratedRecord> {
  dateISO: string;
  cycleIndex: number;
  sessionIndex: number;
  cycleName: string;
  sessionName: string;
  jour: string;
  status: 'pending' | 'done' | 'missed';
}

export interface PlannedSetRecord extends BaseRecord {
  plannedSessionId: string;
  plannedExerciseId: string;
  setNumber: number;
}

// --- Données d'entraînement ---
export interface WorkoutSessionFeedback {
  rpeRessenti: number | null;
  energieAvant: number | null;
  energieApres: number | null;
  sommeil: number | null;
  courbatures: number | null;
  motivation: number | null;
  douleur: boolean | null;
  douleurDetail: string;
  notes: string;
}

export interface WorkoutSessionRecord extends BaseRecord, Partial<MigratedRecord> {
  dateISO: string;
  plannedSessionId: string | null;
  type: 'planned' | 'catchup' | 'extra';
  status: 'completed' | 'in_progress';
  startedAt: string;
  completedAt: string;
  durationSec: number;
  avgRpe: number | null;
  feedback: WorkoutSessionFeedback | null;
}

export interface PerformedSetRecord extends BaseRecord, Partial<MigratedRecord> {
  sessionId: string;
  exerciseId: string | null;
  exerciseName: string;
  exerciseType: 'reps' | 'isometrique';
  setNumber: number;
  weight: number;
  repsActual: number;
  repsTarget: string;
  rpe: number | null;
  restSecActual: number | null;
}

// --- Suivi & Santé ---
export interface CheckInRecord extends BaseRecord {
  dateISO: string;
  weight: number | null;
  notes: string;
}

export interface MeasurementRecord extends BaseRecord {
  dateISO: string;
  type: string;
  value: number;
}

export interface PersonalRecordRecord extends BaseRecord {
  exerciseId: string;
  dateISO: string;
  weight: number;
  reps: number;
}

export interface VacationRecord extends BaseRecord, Partial<MigratedRecord> {
  startDateISO: string;
  endDateISO: string;
  days: number;
  shiftedSessions: number;
}

// --- IA & Recommandations ---
export interface CoachAction {
  type: 'updateWeight' | 'updateReps' | 'updateRestTime' | 'addMemory';
  targetId?: string; // Exercise ID or null for global
  targetName?: string;
  proposedValue: any;
  reason: string;
}

export interface CoachProposalRecord extends BaseRecord {
  actions: CoachAction[];
  status: 'pending' | 'accepted' | 'rejected' | 'reverted';
  confidence: 'low' | 'medium' | 'high';
  coachReasoning: string;
}

export interface ProgramChangeRecord {
  id: string;
  dateISO: string;
  type: 'weight_override' | 'volume_override' | 'rest_override';
  targetExerciseId: string;
  targetExerciseName: string;
  overrideValue: string;
  createdAt: string;
}

// --- Système ---
export interface ImportRecord extends BaseRecord {
  importedAt: string;
  fileHash: string;
  recordCount: number;
}

export interface ExportRecord extends BaseRecord {
  exportedAt: string;
  recordCount: number;
}

export interface AuditEventRecord extends BaseRecord {
  eventType: string;
  details: string;
}

// --- Sync Engine ---
export interface SyncEventRecord {
  eventId: string;
  deviceId: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete' | 'restore';
  payload: any;
  baseVersion: number | null;
  clientSequence: number;
  serverSequence?: number;
  createdAtClient: string;
  receivedAtServer?: string;
  idempotencyKey: string;
  schemaVersion: number;
}
