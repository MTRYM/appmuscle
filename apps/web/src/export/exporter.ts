import { db } from '../db/database';
import { encryptData, decryptData } from '../security/crypto';

export interface ExportDataV3 {
  version: 3;
  exportedAt: string;
  appSettings: any[];
  athleteProfile: any[];
  exercises: any[];
  programs: any[];
  trainingBlocks: any[];
  workoutTemplates: any[];
  plannedExercises: any[];
  plannedSets: any[];
  plannedWorkouts: any[];
  workoutSessions: any[];
  performedSets: any[];
  checkIns: any[];
  measurements: any[];
  personalRecords: any[];
  vacationsV3: any[];
  recommendations: any[];
  programChanges: any[];
}

export interface EncryptedExport {
  isEncrypted: boolean;
  version: 3;
  exportedAt: string;
  data: {
    encrypted: string;
    salt: string;
    iv: string;
  };
}

export async function exportDatabaseV3(): Promise<ExportDataV3> {
  const [
    appSettings, athleteProfile, exercises, programs, trainingBlocks, workoutTemplates,
    plannedExercises, plannedSets, plannedWorkouts, workoutSessions, performedSets,
    checkIns, measurements, personalRecords, vacationsV3, recommendations, programChanges
  ] = await Promise.all([
    db.appSettings.toArray(),
    db.athleteProfile.toArray(),
    db.exercises.toArray(),
    db.programs.toArray(),
    db.trainingBlocks.toArray(),
    db.workoutTemplates.toArray(),
    db.plannedExercises.toArray(),
    db.plannedSets.toArray(),
    db.plannedWorkouts.toArray(),
    db.workoutSessions.toArray(),
    db.performedSets.toArray(),
    db.checkIns.toArray(),
    db.measurements.toArray(),
    db.personalRecords.toArray(),
    db.vacationsV3.toArray(),
    db.recommendations.toArray(),
    db.programChanges.toArray()
  ]);

  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    appSettings,
    athleteProfile,
    exercises,
    programs,
    trainingBlocks,
    workoutTemplates,
    plannedExercises,
    plannedSets,
    plannedWorkouts,
    workoutSessions,
    performedSets,
    checkIns,
    measurements,
    personalRecords,
    vacationsV3,
    recommendations,
    programChanges
  };
}

export async function generateEncryptedExport(password: string): Promise<EncryptedExport> {
  const data = await exportDatabaseV3();
  const jsonString = JSON.stringify(data);
  const encryptedPayload = await encryptData(jsonString, password);
  
  return {
    isEncrypted: true,
    version: 3,
    exportedAt: data.exportedAt,
    data: encryptedPayload
  };
}

export async function decryptExport(encryptedPayload: EncryptedExport, password: string): Promise<ExportDataV3> {
  if (!encryptedPayload.isEncrypted || !encryptedPayload.data) {
    throw new Error("Invalid encrypted payload");
  }
  
  const { encrypted, salt, iv } = encryptedPayload.data;
  try {
    const jsonString = await decryptData(encrypted, salt, iv, password);
    return JSON.parse(jsonString) as ExportDataV3;
  } catch (err) {
    throw new Error("Mot de passe incorrect ou données corrompues");
  }
}
