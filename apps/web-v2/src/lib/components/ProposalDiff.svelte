<script lang="ts">
  import type { CoachAction, CoachProposalRecord } from '@appmuscu/shared-schema';
  import { Check, X, UserCheck, Dumbbell, Clock, Brain, Loader2 } from 'lucide-svelte';

  let { actions = [], reasoning = '' } = $props<{actions?: CoachAction[], reasoning?: string}>();
  
  let processing = $state(false);
  let hasBeenProcessed = $state(false);
  let appliedStatus = $state<'accepted' | 'rejected' | null>(null);
  let statusFeedback = $state('');

  async function handleDecision(decision: 'accepted' | 'rejected') {
    if (processing || hasBeenProcessed) return;
    processing = true;

    try {
      if (decision === 'accepted') {
        for (const action of actions) {
          if (action.type === 'updateAthleteProfile' || (action as any).type === 'updateProfile') {
            // Call API to update the athlete profile in DB and local file
            await fetch('/api/athlete-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                section: action.targetName || 'Mise à jour automatique',
                content: `${action.proposedValue}${action.reason ? ` (${action.reason})` : ''}`
              })
            });
          }

          if (action.type === 'addMemory') {
            // Save to coach memory in database
            await fetch('/api/coach/memory', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                category: action.targetName || 'preference',
                content: String(action.proposedValue)
              })
            }).catch(() => {});
          }
        }
      }

      appliedStatus = decision;
      hasBeenProcessed = true;
      statusFeedback = decision === 'accepted' ? 'Modifications enregistrées dans ton profil !' : 'Modifications ignorées.';
    } catch (err: any) {
      console.error('Failed to apply decision:', err);
      statusFeedback = 'Erreur lors de l\'enregistrement.';
    } finally {
      processing = false;
    }
  }

  function formatAction(action: CoachAction) {
    if (action.type === 'updateAthleteProfile' || (action as any).type === 'updateProfile') return 'Mise à jour du profil athlète';
    if (action.type === 'updateWeight') return 'Modifier la charge';
    if (action.type === 'updateReps') return 'Modifier les répétitions';
    if (action.type === 'updateRestTime') return 'Modifier le temps de repos';
    if (action.type === 'addMemory') return 'Mémoriser cette information';
    return action.type;
  }

  function getActionIcon(action: CoachAction) {
    if (action.type === 'updateAthleteProfile' || (action as any).type === 'updateProfile') return UserCheck;
    if (action.type === 'updateWeight' || action.type === 'updateReps') return Dumbbell;
    if (action.type === 'updateRestTime') return Clock;
    return Brain;
  }
</script>

<div class="diff-container {hasBeenProcessed ? 'processed' : ''}">
  <div class="diff-header">
    <Brain size={15} class="diff-header-icon" />
    <strong>Le Coach propose une mise à jour :</strong>
  </div>
  
  <div class="diff-actions">
    {#each actions as action}
      {@const ActionIcon = getActionIcon(action)}
      <div class="diff-item">
        <div class="item-type-row">
          <ActionIcon size={14} class="action-icon" />
          <span class="item-type">{formatAction(action)}</span>
        </div>

        {#if action.targetName}
          <div class="item-target">Élément : <strong>{action.targetName}</strong></div>
        {/if}

        <div class="item-change">
          <span class="change-label">Nouvelle valeur :</span>
          <span class="highlight">{action.proposedValue}</span>
        </div>

        {#if action.reason}
          <div class="item-reason">💡 <em>{action.reason}</em></div>
        {/if}
      </div>
    {/each}
  </div>

  {#if !hasBeenProcessed}
    <div class="diff-controls">
      <button type="button" class="btn-reject" disabled={processing} onclick={() => handleDecision('rejected')}>
        <X size={15} /> Refuser
      </button>
      <button type="button" class="btn-accept" disabled={processing} onclick={() => handleDecision('accepted')}>
        {#if processing}
          <Loader2 size={15} class="spin" />
        {:else}
          <Check size={15} />
        {/if}
        <span>Valider et mettre à jour</span>
      </button>
    </div>
  {:else}
    <div class="diff-status {appliedStatus}">
      {#if appliedStatus === 'accepted'}
        <Check size={16} /> <span>{statusFeedback}</span>
      {:else}
        <X size={16} /> <span>{statusFeedback}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .diff-container {
    background: var(--bg-card);
    border: 1px solid color-mix(in srgb, var(--pink) 45%, var(--border));
    border-radius: 14px;
    padding: 1rem 1.15rem;
    margin-top: 0.75rem;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
  }

  .diff-container.processed {
    border-color: var(--border);
    opacity: 0.85;
  }

  .diff-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.88rem;
    margin-bottom: 0.85rem;
    color: var(--text-heading);
  }

  .diff-header-icon {
    color: var(--pink);
  }

  .diff-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .diff-item {
    background: var(--bg-elevated);
    border-radius: 10px;
    padding: 0.85rem 1rem;
    border-left: 3px solid var(--pink);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .item-type-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .action-icon {
    color: var(--pink);
  }

  .item-type {
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--pink);
    font-family: 'Montserrat', sans-serif;
  }

  .item-target {
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  .item-target strong {
    color: var(--text-heading);
  }

  .item-change {
    font-size: 0.84rem;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.2rem;
  }

  .change-label {
    color: var(--text-muted);
  }

  .highlight {
    color: #4ade80;
    font-weight: 700;
    background: color-mix(in srgb, #4ade80 18%, transparent);
    border: 1px solid color-mix(in srgb, #4ade80 35%, transparent);
    padding: 0.15rem 0.5rem;
    border-radius: 6px;
    font-family: 'Montserrat', monospace;
    font-size: 0.85rem;
  }

  .item-reason {
    font-size: 0.78rem;
    color: var(--text-muted);
    margin-top: 0.3rem;
    padding-top: 0.4rem;
    border-top: 1px dashed var(--border);
    line-height: 1.4;
  }

  .diff-controls {
    display: flex;
    gap: 0.65rem;
    margin-top: 1rem;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .btn-accept, .btn-reject {
    display: flex !important;
    align-items: center !important;
    gap: 0.45rem !important;
    padding: 0.5rem 1rem !important;
    font-size: 0.85rem !important;
    border-radius: 10px !important;
    border: none !important;
    cursor: pointer !important;
    font-weight: 700 !important;
    min-height: 38px !important;
    font-family: 'Montserrat', sans-serif !important;
    transition: all 0.15s ease !important;
  }

  .btn-accept {
    background: var(--pink) !important;
    color: #070706 !important;
  }

  .btn-accept:hover:not(:disabled) {
    background: color-mix(in srgb, var(--pink) 85%, #fff) !important;
    transform: translateY(-1px);
  }

  .btn-reject {
    background: transparent !important;
    color: var(--destructive) !important;
    border: 1px solid color-mix(in srgb, var(--destructive) 40%, transparent) !important;
  }

  .btn-reject:hover:not(:disabled) {
    background: color-mix(in srgb, var(--destructive) 15%, transparent) !important;
  }

  .btn-accept:disabled, .btn-reject:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .diff-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.85rem;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .diff-status.accepted {
    color: #4ade80;
  }

  .diff-status.rejected {
    color: var(--text-muted);
  }
</style>
