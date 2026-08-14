import { db } from '../db/database';
import type { SyncEventRecord } from '@appmuscu/shared-schema';
import { generateId } from '../import/id-mapping';

export class SyncClient {
  get serverUrl() {
    return localStorage.getItem('coachServerUrl') || 'http://127.0.0.1:3000';
  }
  private deviceId = localStorage.getItem('deviceId') || this.generateDeviceId();

  private generateDeviceId() {
    const id = generateId();
    localStorage.setItem('deviceId', id);
    return id;
  }

  /**
   * Pushes all local events that haven't been acknowledged by the server (serverSequence is missing or 0)
   */
  async pushPendingEvents() {
    // We assume any event without a valid serverSequence is pending
    const pendingEvents = await db.syncEvents.filter(e => !e.serverSequence).toArray();
    
    if (pendingEvents.length === 0) return { pushed: 0 };

    try {
      const response = await fetch(`${this.serverUrl}/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingEvents)
      });
      
      if (response.ok) {
        const result = await response.json();
        return { pushed: result.processed };
      }
      return { pushed: 0, error: 'Server rejected push' };
    } catch (err) {
      console.error('Failed to push events', err);
      return { pushed: 0, error: err };
    }
  }

  /**
   * Pulls new events from the server and applies them locally using LWW (Last Write Wins)
   */
  async pullNewEvents() {
    // Find highest serverSequence we know about
    const allEvents = await db.syncEvents.toArray();
    let maxServerSeq = 0;
    for (const e of allEvents) {
      if (e.serverSequence && e.serverSequence > maxServerSeq) {
        maxServerSeq = e.serverSequence;
      }
    }

    try {
      const response = await fetch(`${this.serverUrl}/sync/pull?after=${maxServerSeq}`);
      if (!response.ok) return { pulled: 0, error: 'Failed to pull' };

      const { events } = await response.json() as { events: SyncEventRecord[] };
      
      if (events.length > 0) {
        await db.transaction('rw', db.syncEvents, db.tables, async () => {
          for (const ev of events) {
            await this.applyEventLocally(ev);
            // Save the event in our local log to avoid re-pulling it
            await db.syncEvents.put(ev);
          }
        });
      }
      return { pulled: events.length };
    } catch (err) {
      console.error('Failed to pull events', err);
      return { pulled: 0, error: err };
    }
  }

  /**
   * Core Conflict Resolution (LWW)
   */
  private async applyEventLocally(ev: SyncEventRecord) {
    // Determine target table based on entityType (basic mapping)
    const tableMap: Record<string, string> = {
      'athlete_profile': 'athleteProfile',
      'program': 'programs',
      'workout_session': 'workoutSessions',
      'performed_set': 'performedSets',
      'recommendation': 'recommendations'
      // ... mapping others as needed
    };

    const tableName = tableMap[ev.entityType];
    if (!tableName) return; // Unknown entity type, ignore

    const table = db.table(tableName);
    const existingRecord = await table.get(ev.entityId);

    // Rule: LWW based on client timestamp, or skip if we have newer local data
    if (existingRecord && ev.operation !== 'delete') {
      const localTime = new Date(existingRecord.updatedAt).getTime();
      const incomingTime = new Date(ev.payload.updatedAt || ev.createdAtClient).getTime();

      // Conflict resolution: if local is newer, we keep local (our pending PUSH will overwrite server eventually)
      if (localTime > incomingTime) {
        return; 
      }
    }

    // Apply operation
    if (ev.operation === 'delete') {
      // Soft delete if possible, otherwise hard delete
      if (existingRecord) {
        await table.put({ ...existingRecord, deletedAt: ev.createdAtClient, updatedAt: ev.createdAtClient });
      }
    } else {
      // Create or Update
      await table.put(ev.payload);
    }
  }
}

export const syncClient = new SyncClient();
