<script lang="ts">
  import type { CoachAction, CoachProposalRecord } from '@appmuscu/shared-schema';
  import { db } from '../db/database';
  import { syncClient } from '../sync/client';
  import { generateId } from '../import/id-mapping';
  import { Check, X } from 'lucide-svelte';

  export let actions: CoachAction[] = [];
  export let reasoning: string = '';
  
  let processing = false;
  let hasBeenProcessed = false;
  let appliedStatus: 'accepted' | 'rejected' | null = null;

  async function handleDecision(decision: 'accepted' | 'rejected') {
    if (processing || hasBeenProcessed) return;
    processing = true;

    try {
      const now = new Date().toISOString();
      const proposal: CoachProposalRecord = {
        id: generateId(),
        actions,
        status: decision,
        confidence: 'medium',
        coachReasoning: reasoning,
        createdAt: now,
        updatedAt: now
      };

      await db.coachProposals.put(proposal);

      if (decision === 'accepted') {
        // Apply actions to local DB
        for (const action of actions) {
          if (action.type === 'updateWeight' && action.targetId) {
            // Find exercise in latest planned sessions and update targetReps/Weight
            // Simplified for demonstration: we could log a program change
            const programChange = {
              id: generateId(),
              dateISO: now.split('T')[0],
              type: 'weight_override',
              targetExerciseId: action.targetId,
              targetExerciseName: action.targetName || 'Exercice inconnu',
              overrideValue: String(action.proposedValue),
              createdAt: now
            };
            await db.programChanges.put(programChange);
          }
          if (action.type === 'addMemory') {
            // Sync this to the server so Ollama remembers it
            const memoryEvent = {
              eventId: generateId(),
              deviceId: localStorage.getItem('deviceId') || 'local',
              entityType: 'coach_memory',
              entityId: generateId(),
              operation: 'create' as const,
              payload: {
                content: action.proposedValue,
                category: 'preference'
              },
              baseVersion: null,
              clientSequence: Date.now(),
              createdAtClient: now,
              idempotencyKey: generateId(),
              schemaVersion: 1
            };
            await db.syncEvents.put(memoryEvent);
          }
        }
      }

      appliedStatus = decision;
      hasBeenProcessed = true;
      
      // Trigger a background push to server
      if (decision === 'accepted') {
        syncClient.pushPendingEvents().catch(console.error);
      }
    } catch (err) {
      console.error('Failed to apply decision:', err);
    } finally {
      processing = false;
    }
  }

  function formatAction(action: CoachAction) {
    if (action.type === 'updateWeight') return 'Modifier la charge';
    if (action.type === 'updateReps') return 'Modifier les répétitions';
    if (action.type === 'updateRestTime') return 'Modifier le temps de repos';
    if (action.type === 'addMemory') return 'Ajouter à la mémoire';
    return action.type;
  }
</script>

<div class="diff-container {hasBeenProcessed ? 'processed' : ''}">
  <div class="diff-header">
    <strong>Le Coach propose :</strong>
  </div>
  
  <div class="diff-actions">
    {#each actions as action}
      <div class="diff-item">
        <div class="item-type">{formatAction(action)}</div>
        {#if action.targetName}
          <div class="item-target">Cible : <span>{action.targetName}</span></div>
        {/if}
        <div class="item-change">
          <span>Nouvelle valeur suggérée :</span>
          <span class="highlight">{action.proposedValue}</span>
        </div>
        {#if action.reason}
          <div class="item-reason"><em>{action.reason}</em></div>
        {/if}
      </div>
    {/each}
  </div>

  {#if !hasBeenProcessed}
    <div class="diff-controls">
      <button class="btn-reject" disabled={processing} on:click={() => handleDecision('rejected')}>
        <X size={16} /> Refuser
      </button>
      <button class="btn-accept" disabled={processing} on:click={() => handleDecision('accepted')}>
        <Check size={16} /> Valider la modification
      </button>
    </div>
  {:else}
    <div class="diff-status {appliedStatus}">
      {#if appliedStatus === 'accepted'}
        <Check size={14} /> Modification acceptée et appliquée
      {:else}
        <X size={14} /> Modification refusée
      {/if}
    </div>
  {/if}
</div>

<style>
  .diff-container {
    background: var(--bg-base);
    border: 1px solid var(--accent);
    border-radius: 8px;
    padding: 1rem;
    margin-top: 0.5rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  .diff-container.processed {
    border-color: var(--border);
    opacity: 0.8;
  }
  .diff-header {
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
    color: var(--text-primary);
  }
  .diff-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .diff-item {
    background: var(--bg-elevated);
    border-radius: 6px;
    padding: 0.75rem;
    border-left: 3px solid var(--accent);
  }
  .item-type {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-primary);
  }
  .item-target, .item-change {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 0.3rem;
  }
  .highlight {
    color: var(--success);
    font-weight: bold;
    background: color-mix(in srgb, var(--success) 20%, transparent);
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    font-family: monospace;
  }
  .item-reason {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.4rem;
    padding-top: 0.4rem;
    border-top: 1px dashed var(--border);
  }
  .diff-controls {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    justify-content: flex-end;
  }
  .btn-accept, .btn-reject {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: 600;
  }
  .btn-accept {
    background: var(--success);
    color: #000;
  }
  .btn-reject {
    background: transparent;
    color: var(--danger);
    border: 1px solid var(--danger);
  }
  .diff-status {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 1rem;
    font-size: 0.85rem;
    font-weight: 600;
  }
  .diff-status.accepted {
    color: var(--success);
  }
  .diff-status.rejected {
    color: var(--text-muted);
  }
</style>
