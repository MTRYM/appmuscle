<script>
  let { value = $bindable(undefined), disabled = false } = $props();

  const labels = {
    1: 'Très facile',
    2: 'Facile',
    3: 'Modéré',
    4: 'Un peu dur',
    5: 'Dur',
    6: 'Dur+',
    7: 'Très dur',
    8: 'Extrême',
    9: 'Quasi max',
    10: 'Max',
  };

  function getColor(rpe) {
    if (rpe <= 6) return 'low';
    if (rpe <= 8) return 'mid';
    return 'high';
  }

  function select(rpe) {
    if (disabled) return;
    value = rpe;
  }
</script>

<div class="rpe-input" class:disabled>
  <p class="rpe-title">RPE — Effort perçu</p>
  {#if value}
    <p class="rpe-selected">RPE {value} — {labels[value]}</p>
  {:else}
    <p class="rpe-hint">Sélectionnez votre RPE (obligatoire)</p>
  {/if}

  <div class="rpe-grid">
    {#each Array.from({ length: 10 }, (_, i) => i + 1) as rpe}
      <button
        type="button"
        class="rpe-btn {getColor(rpe)}"
        class:selected={value === rpe}
        {disabled}
        onclick={() => select(rpe)}
      >
        {rpe}
      </button>
    {/each}
  </div>
</div>

<style>
  .rpe-input {
    margin: 1rem 0;
  }

  .rpe-input.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .rpe-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-heading);
    margin-bottom: 0.25rem;
    text-align: center;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .rpe-selected {
    text-align: center;
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--accent);
    margin-bottom: 0.75rem;
  }

  .rpe-hint {
    text-align: center;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
  }

  .rpe-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
  }

  .rpe-btn {
    min-height: 64px;
    font-family: 'Montserrat', sans-serif;
    font-size: 1.5rem;
    font-weight: 800;
    border-radius: calc(var(--radius) * 2);
    border: 2px solid transparent;
    color: var(--offwhite);
    padding: 0;
  }

  .rpe-btn.low {
    background: var(--deepblue);
  }

  .rpe-btn.mid {
    background: color-mix(in srgb, var(--beige) 75%, var(--ink));
    color: var(--ink);
  }

  .rpe-btn.high {
    background: var(--accent);
    color: var(--accent-foreground);
  }

  .rpe-btn.selected {
    border-color: var(--text-heading);
    box-shadow: 0 0 0 3px var(--bg), 0 0 0 5px var(--accent);
    transform: scale(1.05);
  }
</style>
