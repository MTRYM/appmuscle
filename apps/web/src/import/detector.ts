import { legacyExportSchema } from './legacy-schema';

export type LegacyFormatType = 'v1' | 'v2' | 'unknown';

export function detectLegacyFormat(parsedData: any): LegacyFormatType {
  if (!parsedData || typeof parsedData !== 'object') {
    return 'unknown';
  }

  // Version 2 has vacations array
  if (parsedData.version === 2 && Array.isArray(parsedData.vacations)) {
    const result = legacyExportSchema.safeParse(parsedData);
    if (result.success) return 'v2';
  }
  
  // Version 1 doesn't have vacations
  if (parsedData.version === 1 || parsedData.version === 2) {
     const result = legacyExportSchema.safeParse(parsedData);
     if (result.success) return 'v1';
  }

  return 'unknown';
}
