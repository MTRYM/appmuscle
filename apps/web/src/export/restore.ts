import { db } from '../db/database';
import { decryptExport, type EncryptedExport, type ExportDataV3 } from './exporter';
import { generateId } from '../import/id-mapping';
import { calculateSHA256 } from '../security/crypto';

export async function restoreDatabaseV3(data: ExportDataV3 | EncryptedExport, password?: string): Promise<{ success: boolean; message: string }> {
  try {
    let clearData: ExportDataV3;

    if ('isEncrypted' in data && data.isEncrypted) {
      if (!password) {
        return { success: false, message: 'Mot de passe requis pour déchiffrer la sauvegarde.' };
      }
      clearData = await decryptExport(data as EncryptedExport, password);
    } else {
      clearData = data as ExportDataV3;
    }

    if (clearData.version !== 3) {
      return { success: false, message: 'Format de sauvegarde non supporté par la restauration V3.' };
    }
    
    // Hash to prevent duplicate imports if we want, but for restore we usually overwrite
    const now = new Date().toISOString();

    await db.transaction('rw', [
      db.appSettings, db.athleteProfile, db.exercises, db.programs, db.trainingBlocks, 
      db.workoutTemplates, db.plannedExercises, db.plannedSets, db.plannedWorkouts, 
      db.workoutSessions, db.performedSets, db.checkIns, db.measurements, 
      db.personalRecords, db.vacationsV3, db.recommendations, db.programChanges, db.imports
    ], async () => {
      // Clear existing V3 data
      await db.appSettings.clear();
      await db.athleteProfile.clear();
      await db.exercises.clear();
      await db.programs.clear();
      await db.trainingBlocks.clear();
      await db.workoutTemplates.clear();
      await db.plannedExercises.clear();
      await db.plannedSets.clear();
      await db.plannedWorkouts.clear();
      await db.workoutSessions.clear();
      await db.performedSets.clear();
      await db.checkIns.clear();
      await db.measurements.clear();
      await db.personalRecords.clear();
      await db.vacationsV3.clear();
      await db.recommendations.clear();
      await db.programChanges.clear();

      // Bulk add
      if (clearData.appSettings?.length) await db.appSettings.bulkAdd(clearData.appSettings);
      if (clearData.athleteProfile?.length) await db.athleteProfile.bulkAdd(clearData.athleteProfile);
      if (clearData.exercises?.length) await db.exercises.bulkAdd(clearData.exercises);
      if (clearData.programs?.length) await db.programs.bulkAdd(clearData.programs);
      if (clearData.trainingBlocks?.length) await db.trainingBlocks.bulkAdd(clearData.trainingBlocks);
      if (clearData.workoutTemplates?.length) await db.workoutTemplates.bulkAdd(clearData.workoutTemplates);
      if (clearData.plannedExercises?.length) await db.plannedExercises.bulkAdd(clearData.plannedExercises);
      if (clearData.plannedSets?.length) await db.plannedSets.bulkAdd(clearData.plannedSets);
      if (clearData.plannedWorkouts?.length) await db.plannedWorkouts.bulkAdd(clearData.plannedWorkouts);
      if (clearData.workoutSessions?.length) await db.workoutSessions.bulkAdd(clearData.workoutSessions);
      if (clearData.performedSets?.length) await db.performedSets.bulkAdd(clearData.performedSets);
      if (clearData.checkIns?.length) await db.checkIns.bulkAdd(clearData.checkIns);
      if (clearData.measurements?.length) await db.measurements.bulkAdd(clearData.measurements);
      if (clearData.personalRecords?.length) await db.personalRecords.bulkAdd(clearData.personalRecords);
      if (clearData.vacationsV3?.length) await db.vacationsV3.bulkAdd(clearData.vacationsV3);
      if (clearData.recommendations?.length) await db.recommendations.bulkAdd(clearData.recommendations);
      if (clearData.programChanges?.length) await db.programChanges.bulkAdd(clearData.programChanges);
      
      const fileHash = await calculateSHA256(JSON.stringify(clearData));
      await db.imports.add({
         id: generateId(),
         importedAt: now,
         fileHash,
         recordCount: clearData.workoutSessions?.length || 0,
         createdAt: now,
         updatedAt: now,
      });
    });

    return { success: true, message: 'Restauration V3 effectuée avec succès.' };
  } catch (err: any) {
    return { success: false, message: `Erreur lors de la restauration: ${err.message}` };
  }
}
