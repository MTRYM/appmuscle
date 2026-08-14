import Dexie, { type Table } from 'dexie';
import type {
  SettingRecord,
  AthleteProfileRecord,
  ExerciseRecord,
  ProgramRecord,
  TrainingBlockRecord,
  WorkoutTemplateRecord,
  PlannedExerciseRecord,
  PlannedSessionRecord,
  PlannedSetRecord,
  WorkoutSessionRecord,
  PerformedSetRecord,
  CheckInRecord,
  MeasurementRecord,
  PersonalRecordRecord,
  VacationRecord,
  RecommendationRecord,
  ProgramChangeRecord,
  ImportRecord,
  ExportRecord,
  AuditEventRecord,
  SyncEventRecord
} from '@appmuscu/shared-schema';

export class TrainingDatabase extends Dexie {
  // --- Sync Engine ---
  syncEvents!: Table<SyncEventRecord, string>;
  coachProposals!: Table<CoachProposalRecord, string>;

  // --- Core ---
  appSettings!: Table<SettingRecord, string>;
  athleteProfile!: Table<AthleteProfileRecord, string>;

  // --- Programme & Planning ---
  exercises!: Table<ExerciseRecord, string>;
  programs!: Table<ProgramRecord, string>;
  trainingBlocks!: Table<TrainingBlockRecord, string>;
  workoutTemplates!: Table<WorkoutTemplateRecord, string>;
  plannedExercises!: Table<PlannedExerciseRecord, string>;
  plannedSets!: Table<PlannedSetRecord, string>;
  plannedWorkouts!: Table<PlannedSessionRecord, string>;

  // --- Données d'entraînement ---
  workoutSessions!: Table<WorkoutSessionRecord, string>;
  performedSets!: Table<PerformedSetRecord, string>;

  // --- Suivi & Santé ---
  checkIns!: Table<CheckInRecord, string>;
  measurements!: Table<MeasurementRecord, string>;
  personalRecords!: Table<PersonalRecordRecord, string>;
  vacationsV3!: Table<VacationRecord, string>;

  // --- IA & Recommandations ---
  recommendations!: Table<RecommendationRecord, string>;
  programChanges!: Table<ProgramChangeRecord, string>;

  // --- Système ---
  imports!: Table<ImportRecord, string>;
  exports!: Table<ExportRecord, string>;
  auditEvents!: Table<AuditEventRecord, string>;

  // Legacy Tables for backwards compatibility & migration
  settings!: Table<any, string>;
  plannedSessions!: Table<any, number>;
  sessions!: Table<any, number>;
  sets!: Table<any, number>;
  vacations!: Table<any, number>;

  constructor() {
    super('AppMuscuDB');

    // Version 1 (Existing schema)
    this.version(1).stores({
      settings: 'id',
      plannedSessions: '++id, dateISO, cycleIndex, sessionIndex, status',
      sessions: '++id, dateISO, plannedSessionId, type, status',
      sets: '++id, sessionId, exerciseName, [sessionId+exerciseName]'
    });

    // Version 2 (Existing schema update)
    this.version(2).stores({
      vacations: '++id, startDateISO, endDateISO'
    });

    // Version 3 (New UUID-based schema + keeping old tables)
    this.version(3).stores({
      // Legacy tables
      settings: 'id',
      plannedSessions: '++id, dateISO, cycleIndex, sessionIndex, status',
      sessions: '++id, dateISO, plannedSessionId, type, status',
      sets: '++id, sessionId, exerciseName, [sessionId+exerciseName]',
      vacations: '++id, startDateISO, endDateISO',
      // New V3 tables
      appSettings: 'id',
      athleteProfile: 'id',
      exercises: 'id',
      programs: 'id',
      trainingBlocks: 'id, programId',
      workoutTemplates: 'id, blockId',
      plannedExercises: 'id, workoutTemplateId, exerciseId',
      plannedSets: 'id, plannedSessionId, plannedExerciseId',
      plannedWorkouts: 'id, dateISO, status, legacyId', 
      workoutSessions: 'id, dateISO, plannedSessionId, status, legacyId',
      performedSets: 'id, sessionId, exerciseId, legacyId',
      checkIns: 'id, dateISO',
      measurements: 'id, dateISO, type',
      personalRecords: 'id, exerciseId, dateISO',
      vacationsV3: 'id, startDateISO, endDateISO, legacyId',
      recommendations: 'id, dateISO',
      programChanges: 'id, dateISO',
      imports: 'id, fileHash',
      exports: 'id',
      auditEvents: 'id'
    });

    // Version 4 (Updated indexes for IA queries)
    this.version(4).stores({
      recommendations: 'id, status, type, targetExerciseId',
      programChanges: 'id, dateISO, targetExerciseName, targetExerciseId',
      coachProposals: 'id, status, createdAt'
    });

    // Version 5 (Add Sync Events)
    this.version(5).stores({
      syncEvents: 'eventId, entityType, entityId, clientSequence'
    });
  }
}

export const db = new TrainingDatabase();
