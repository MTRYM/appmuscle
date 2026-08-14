<script>
  let { feedback = $bindable({}), onComplete = () => {} } = $props();

  const steps = [
    {
      id: 'rpeRessenti',
      title: 'Effort global',
      subtitle: 'Comment a été la séance dans son ensemble ?',
      type: 'scale',
      min: 1,
      max: 10,
      required: true,
    },
    {
      id: 'energieAvant',
      title: 'Énergie avant',
      subtitle: 'Votre niveau d\'énergie en arrivant à la salle',
      type: 'scale',
      min: 1,
      max: 5,
      labels: ['Épuisé', 'Fatigué', 'Correct', 'Bien', 'Au top'],
      required: true,
    },
    {
      id: 'energieApres',
      title: 'Énergie après',
      subtitle: 'Votre niveau d\'énergie en terminant',
      type: 'scale',
      min: 1,
      max: 5,
      labels: ['Vidé', 'Fatigué', 'Correct', 'Bien', 'Au top'],
      required: true,
    },
    {
      id: 'sommeil',
      title: 'Sommeil',
      subtitle: 'Qualité de votre dernière nuit',
      type: 'scale',
      min: 1,
      max: 5,
      labels: ['Très mauvais', 'Mauvais', 'Moyen', 'Bon', 'Excellent'],
      required: true,
    },
    {
      id: 'courbatures',
      title: 'Courbatures',
      subtitle: 'Sensation de courbatures / fatigue musculaire',
      type: 'scale',
      min: 1,
      max: 5,
      labels: ['Aucune', 'Légères', 'Modérées', 'Fortes', 'Extrêmes'],
      required: true,
    },
    {
      id: 'motivation',
      title: 'Motivation',
      subtitle: 'Motivation pour cette séance',
      type: 'scale',
      min: 1,
      max: 5,
      labels: ['Nulle', 'Faible', 'Moyenne', 'Bonne', 'Maximale'],
      required: true,
    },
    {
      id: 'douleur',
      title: 'Douleur anormale',
      subtitle: 'Avez-vous ressenti une douleur inhabituelle ?',
      type: 'boolean',
      required: true,
    },
    {
      id: 'notes',
      title: 'Notes',
      subtitle: 'Commentaires libres (optionnel)',
      type: 'text',
      required: false,
    },
  ];

  let stepIndex = $state(0);
  let douleurDetail = $state('');
  let notesText = $state('');

  let currentStep = $derived(steps[stepIndex]);
  let isLast = $derived(stepIndex >= steps.length - 1);

  function selectValue(value) {
    feedback = { ...feedback, [currentStep.id]: value };
    if (!isLast) {
      stepIndex += 1;
    }
  }

  function selectBoolean(value) {
    feedback = { ...feedback, douleur: value };
    if (!value) {
      feedback = { ...feedback, douleurDetail: '' };
      douleurDetail = '';
    }
    if (!isLast) stepIndex += 1;
  }

  function saveNotes() {
    feedback = {
      ...feedback,
      notes: notesText.trim(),
    };
  }

  function nextFromNotes() {
    saveNotes();
    submit();
  }

  function canProceed() {
    const step = currentStep;
    if (step.type === 'text') return true;
    if (step.type === 'boolean') return feedback.douleur !== undefined;
    return feedback[step.id] !== undefined;
  }

  function back() {
    if (stepIndex > 0) stepIndex -= 1;
  }

  function submit() {
    if (feedback.douleur && douleurDetail.trim()) {
      feedback = { ...feedback, douleurDetail: douleurDetail.trim() };
    }
    onComplete(feedback);
  }

  function finishStep() {
    if (currentStep.type === 'text') {
      saveNotes();
      submit();
      return;
    }
    if (canProceed() && isLast) submit();
  }

  function range(min, max) {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }
</script>

<div class="debrief">
  <div class="debrief-header">
    <span class="step-count">{stepIndex + 1} / {steps.length}</span>
    <div class="step-bar">
      <div class="step-fill" style="width: {((stepIndex + 1) / steps.length) * 100}%"></div>
    </div>
  </div>

  <h2>{currentStep.title}</h2>
  <p class="subtitle accent-text">{currentStep.subtitle}</p>

  {#if currentStep.type === 'scale'}
    <div class="scale-grid" class:compact={currentStep.max <= 5}>
      {#each range(currentStep.min, currentStep.max) as n}
        <button
          type="button"
          class="scale-btn"
          class:selected={feedback[currentStep.id] === n}
          onclick={() => selectValue(n)}
        >
          <span class="scale-num">{n}</span>
          {#if currentStep.labels}
            <span class="scale-label">{currentStep.labels[n - currentStep.min]}</span>
          {/if}
        </button>
      {/each}
    </div>
  {:else if currentStep.type === 'boolean'}
    <div class="bool-row">
      <button
        type="button"
        class="bool-btn no"
        class:selected={feedback.douleur === false}
        onclick={() => selectBoolean(false)}
      >
        Non, tout va bien
      </button>
      <button
        type="button"
        class="bool-btn yes"
        class:selected={feedback.douleur === true}
        onclick={() => {
          feedback = { ...feedback, douleur: true };
        }}
      >
        Oui, douleur
      </button>
    </div>
    {#if feedback.douleur === true}
      <label class="detail-field">
        <span>Où / quelle douleur ?</span>
        <input type="text" bind:value={douleurDetail} placeholder="Ex. épaule droite, genou…" />
      </label>
      <button type="button" class="btn-primary" disabled={!douleurDetail.trim()} onclick={() => (isLast ? submit() : (stepIndex += 1))}>
        Continuer
      </button>
    {/if}
  {:else if currentStep.type === 'text'}
    <label class="notes-field">
      <textarea
        bind:value={notesText}
        placeholder="Douleurs, sensations, contexte, humeur…"
        rows="4"
      ></textarea>
    </label>
    <button type="button" class="btn-primary finish-btn" onclick={nextFromNotes}>
      Terminer et enregistrer
    </button>
  {/if}

  <div class="nav-row">
    {#if stepIndex > 0}
      <button type="button" class="btn-ghost" onclick={back}>← Retour</button>
    {/if}
    {#if currentStep.type === 'scale' && feedback[currentStep.id] !== undefined && isLast}
      <button type="button" class="btn-primary finish-btn" onclick={finishStep}>Terminer</button>
    {/if}
  </div>
</div>

<style>
  .debrief {
    width: 100%;
  }

  .debrief-header {
    margin-bottom: 1.5rem;
  }

  .step-count {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .step-bar {
    height: 4px;
    background: var(--border);
    border-radius: 999px;
    margin-top: 0.5rem;
    overflow: hidden;
  }

  .step-fill {
    height: 100%;
    background: var(--pink);
    border-radius: 999px;
    transition: width 0.3s ease;
  }

  .subtitle {
    margin-bottom: 1.5rem;
    font-size: 1.05rem;
  }

  .scale-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.45rem;
    margin-bottom: 1rem;
  }

  .scale-grid.compact {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .scale-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 56px;
    padding: 0.5rem;
    background: var(--bg-elevated);
    color: var(--text);
    border: 2px solid var(--border);
    gap: 0.15rem;
  }

  .scale-grid.compact .scale-btn {
    flex-direction: row;
    justify-content: flex-start;
    gap: 1rem;
    padding: 0.85rem 1rem;
    min-height: 52px;
  }

  .scale-btn.selected {
    border-color: var(--pink);
    background: color-mix(in srgb, var(--pink) 18%, var(--bg-elevated));
  }

  .scale-num {
    font-family: 'Montserrat', sans-serif;
    font-size: 1.25rem;
    font-weight: 800;
  }

  .scale-label {
    font-size: 0.65rem;
    color: var(--text-muted);
    text-align: center;
    line-height: 1.2;
  }

  .scale-grid.compact .scale-label {
    font-size: 0.9rem;
    text-align: left;
  }

  .bool-row {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .bool-btn {
    min-height: 64px;
    font-size: 1rem;
    border: 2px solid var(--border);
    background: var(--bg-elevated);
    color: var(--text);
  }

  .bool-btn.selected.no {
    border-color: var(--deepblue);
    background: color-mix(in srgb, var(--deepblue) 20%, var(--bg-elevated));
  }

  .bool-btn.selected.yes {
    border-color: var(--destructive);
    background: color-mix(in srgb, var(--destructive) 18%, var(--bg-elevated));
  }

  .detail-field,
  .notes-field {
    display: block;
    margin-bottom: 1rem;
  }

  .detail-field span {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 0.35rem;
  }

  textarea {
    font-family: 'Open Sans', sans-serif;
    font-size: 1rem;
    padding: 1rem;
    border: 1px solid var(--input);
    border-radius: calc(var(--radius) * 2);
    background: var(--bg-elevated);
    color: var(--text);
    width: 100%;
    resize: vertical;
    min-height: 120px;
  }

  .finish-btn {
    min-height: 64px;
    font-size: 1.05rem;
    margin-top: 0.5rem;
  }

  .nav-row {
    display: flex;
    justify-content: space-between;
    margin-top: 1rem;
  }
</style>
