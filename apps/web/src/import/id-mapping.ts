export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback if randomUUID is not available (e.g. older browsers or non-secure contexts)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class IdMapping {
  private idMap: Map<string, string> = new Map();

  /**
   * Registers or retrieves a UUID for a given legacy entity and ID.
   * Format of map key: `<entityType>:<legacyId>`
   */
  getUuid(entityType: string, legacyId: number | string): string {
    const key = `${entityType}:${legacyId}`;
    if (this.idMap.has(key)) {
      return this.idMap.get(key)!;
    }
    
    const newUuid = generateId();
    this.idMap.set(key, newUuid);
    return newUuid;
  }
}
