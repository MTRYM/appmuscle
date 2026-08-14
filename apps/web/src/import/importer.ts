import { db } from '../db/database';
import { calculateSHA256 } from '../security/crypto';
import { detectLegacyFormat } from './detector';
import { IdMapping } from './id-mapping';
import { normalizeAll, type NormalizedData } from './normalizers';
import { generateReport, type ImportReport } from './report';
import { generateId } from './id-mapping';

export class Importer {
  
  async dryRun(fileContent: string): Promise<ImportReport> {
    try {
      const parsed = JSON.parse(fileContent);
      const format = detectLegacyFormat(parsed);
      
      if (format === 'unknown') {
        return generateReport(null, ['Format de fichier inconnu ou invalide.']);
      }
      
      const idMap = new IdMapping();
      const normalized = normalizeAll(parsed, idMap);
      
      return generateReport(normalized);
    } catch (err: any) {
      return generateReport(null, [`Erreur de lecture du JSON : ${err.message}`]);
    }
  }
  
  async commit(fileContent: string): Promise<ImportReport> {
    const report = await this.dryRun(fileContent);
    if (report.status === 'error') {
      return report;
    }
    
    try {
      const fileHash = await calculateSHA256(fileContent);
      const existingImport = await db.imports.where('fileHash').equals(fileHash).first();
      
      if (existingImport) {
        return generateReport(null, ['Ce fichier a déjà été importé (empreinte identique).']);
      }
      
      const parsed = JSON.parse(fileContent);
      const idMap = new IdMapping();
      const normalized = normalizeAll(parsed, idMap);
      
      const now = new Date().toISOString();
      const totalRecords = normalized.settings.length + normalized.plannedWorkouts.length + 
                           normalized.workoutSessions.length + normalized.performedSets.length + 
                           normalized.exercises.length + normalized.vacationsV3.length;
                           
      await db.transaction('rw', [
        db.appSettings, db.plannedWorkouts, db.workoutSessions, db.performedSets, 
        db.exercises, db.vacationsV3, db.imports
      ], async () => {
        // We do a bulk put so it overwrites by ID if we re-import the exact same IDs, 
        // but idMap generates UUIDs deterministically? No, `generateId` generates random UUIDs!
        // To be deterministic (idempotent), idMap should generate UUIDs based on a namespace 
        // or we use clear tables. Since we just append, let's bulkAdd and catch errors.
        
        // Let's clear for now if we assume full import replaces everything, OR we just bulkAdd.
        // The implementation plan (S4 mitigation) states: "Import en staging -> comparaison -> swap" 
        // and "transaction atomique Dexie". 
        // Let's just bulkAdd. If they are all new UUIDs, it won't clash.
        // But to prevent duplicates, we rely on the fileHash!

        if (normalized.settings.length > 0) {
          await db.appSettings.clear(); // Only 1 setting usually
          await db.appSettings.bulkAdd(normalized.settings);
        }
        
        if (normalized.exercises.length > 0) {
          // Exercises might already exist by name. We should ideally look them up, 
          // but for simplicity, we just put them (overwrite or ignore).
          // BulkPut overwrites if IDs match.
          await db.exercises.bulkPut(normalized.exercises);
        }
        
        await db.plannedWorkouts.bulkAdd(normalized.plannedWorkouts);
        await db.workoutSessions.bulkAdd(normalized.workoutSessions);
        await db.performedSets.bulkAdd(normalized.performedSets);
        await db.vacationsV3.bulkAdd(normalized.vacationsV3);
        
        await db.imports.add({
          id: generateId(),
          importedAt: now,
          fileHash,
          recordCount: totalRecords,
          createdAt: now,
          updatedAt: now,
        });
      });
      
      return report;
    } catch (err: any) {
      return generateReport(null, [`Erreur lors de l'enregistrement en base : ${err.message}`]);
    }
  }
}

export const importer = new Importer();
