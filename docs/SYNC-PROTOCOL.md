# SYNC-PROTOCOL.md

## Principe général

La synchronisation est basée sur un **journal d'événements** (Event Sourcing), pas sur le remplacement de base.

Chaque modification sur le téléphone génère un `SyncEvent` stocké dans IndexedDB.  
Ces événements sont poussés au serveur lors de la reconnexion.

## Format d'un événement

```ts
interface SyncEventRecord {
  eventId: string;          // UUID unique
  deviceId: string;         // Identifiant de l'appareil source
  entityType: string;       // 'workout_session' | 'performed_set' | ...
  entityId: string;         // UUID de l'entité modifiée
  operation: 'create' | 'update' | 'delete' | 'restore';
  payload: any;             // L'entité complète au moment de la modification
  baseVersion: number | null;
  clientSequence: number;   // Ordre local croissant
  serverSequence?: number;  // Attribué par le serveur
  createdAtClient: string;  // ISO 8601
  idempotencyKey: string;   // Clé unique pour déduplication
  schemaVersion: number;
}
```

## Routes de synchronisation

```
POST /sync/push
  Body: SyncEventRecord[]
  Retour: { success: true, processed: N }

GET /sync/pull?after=<serverSequence>
  Retour: { events: SyncEventRecord[] }
```

## Séquence de synchronisation

```
1. Téléphone → pushPendingEvents()
   → Envoie tous les événements sans serverSequence
   → Le serveur les insert avec MAX(serverSequence)+1
   → Idempotency: si idempotencyKey existe déjà → ignoré

2. Téléphone → pullNewEvents()
   → Récupère tous les événements après son maxServerSequence local
   → Applique chaque événement localement (LWW)
   → Sauvegarde les événements en local (évite re-pull)
```

## Résolution de conflits (LWW)

**Last Write Wins** basé sur `updatedAt` :

| Situation | Résultat |
|-----------|---------|
| Donnée locale plus récente | Local prime, sera poussé au serveur |
| Donnée serveur plus récente | Écrase le local |
| Suppression vs modification | Soft-delete conservé, champ `deletedAt` |
| Même `eventId` reçu deux fois | Ignoré (idempotencyKey UNIQUE) |

## Idempotence

Chaque événement est identifié par `idempotencyKey` (contrainte UNIQUE en SQLite).  
Une répétition de la même requête ne duplique jamais les données.

## Fonctionnement hors-ligne

```
PC éteint → téléphone continue :
  - Séances enregistrées dans IndexedDB
  - SyncEvents accumulés localement
  
PC rallumé → reconnexion :
  1. pushPendingEvents() → envoie le backlog
  2. pullNewEvents() → récupère les modifications PC
  3. Conflits éventuels résolus par LWW
```

## Types d'entités supportées

| entityType | Table IndexedDB | Table SQLite |
|---|---|---|
| `athlete_profile` | `athleteProfile` | `sync_events` |
| `program` | `programs` | `sync_events` |
| `workout_session` | `workoutSessions` | `sync_events` |
| `performed_set` | `performedSets` | `sync_events` |
| `recommendation` | `recommendations` | `sync_events` |
