<script>
  import { getExerciseGif } from '../lib/exerciseGifs.js';

  let { name = '', compact = false } = $props();

  const entry = $derived(getExerciseGif(name));
  let loaded = $state(false);
  let failed = $state(false);

  $effect(() => {
    name;
    loaded = false;
    failed = false;
  });
</script>

{#if entry && !failed}
  <figure class="exercise-gif" class:compact>
    <div class="gif-frame">
      {#if !loaded}
        <span class="gif-skeleton" aria-hidden="true"></span>
      {/if}
      <img
        src={entry.gifUrl}
        alt="Démonstration : {entry.sourceName}"
        loading="lazy"
        decoding="async"
        class:visible={loaded}
        onload={() => {
          loaded = true;
        }}
        onerror={() => {
          failed = true;
        }}
      />
    </div>
    {#if !compact}
      <figcaption class="gif-caption">
        Réf. visuelle : {entry.sourceName}
      </figcaption>
    {/if}
  </figure>
{/if}

<style>
  .exercise-gif {
    margin: 0 0 1rem;
  }

  .gif-frame {
    position: relative;
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
    aspect-ratio: 1;
    border-radius: calc(var(--radius) * 2);
    overflow: hidden;
    background: color-mix(in srgb, var(--beige) 8%, var(--bg-card));
    border: 1px solid var(--border);
  }

  .exercise-gif.compact .gif-frame {
    max-width: 220px;
    aspect-ratio: 4 / 3;
  }

  .gif-skeleton {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      110deg,
      color-mix(in srgb, var(--beige) 6%, var(--bg-card)) 8%,
      color-mix(in srgb, var(--beige) 14%, var(--bg-card)) 18%,
      color-mix(in srgb, var(--beige) 6%, var(--bg-card)) 33%
    );
    background-size: 200% 100%;
    animation: shimmer 1.2s ease-in-out infinite;
  }

  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }

  .gif-frame img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  .gif-frame img.visible {
    opacity: 1;
  }

  .gif-caption {
    margin-top: 0.45rem;
    text-align: center;
    font-size: 0.72rem;
    color: var(--text-muted);
    line-height: 1.3;
  }
</style>
