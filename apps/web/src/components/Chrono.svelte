<script>
  import { onMount, onDestroy } from 'svelte';

  let {
    duration = 90,
    autoStart = true,
    onComplete = () => {},
    onSkip = () => {},
  } = $props();

  let endAt = $state(null);
  let startedAt = $state(null);
  let remaining = $state(duration);
  let finished = $state(false);
  let intervalId = null;
  let totalDuration = $state(duration);

  function syncRemaining() {
    if (!endAt || finished) return;
    const left = Math.ceil((endAt - Date.now()) / 1000);
    remaining = Math.max(0, left);
    if (remaining <= 0) {
      complete();
    }
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1100;
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.4);
      }, 350);
    } catch {
      /* audio unavailable */
    }

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
  }

  function beginTimer(secs) {
    stopTimer();
    totalDuration = secs;
    remaining = secs;
    finished = false;
    startedAt = Date.now();
    endAt = startedAt + secs * 1000;
    intervalId = setInterval(syncRemaining, 250);
    syncRemaining();
  }

  function stopTimer() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function actualRestSec() {
    if (!startedAt) return 0;
    return Math.round((Date.now() - startedAt) / 1000);
  }

  function complete() {
    if (finished) return;
    stopTimer();
    finished = true;
    remaining = 0;
    playBeep();
    onComplete({ actualRestSec: actualRestSec() });
  }

  function skip() {
    if (finished) return;
    stopTimer();
    finished = true;
    remaining = 0;
    onSkip({ actualRestSec: actualRestSec() });
  }

  function addTime(secs) {
    if (finished || !endAt) return;
    endAt += secs * 1000;
    syncRemaining();
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      syncRemaining();
    }
  }

  function onPageShow() {
    syncRemaining();
  }

  onMount(() => {
    beginTimer(duration);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('focus', onPageShow);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('focus', onPageShow);
    };
  });

  onDestroy(() => stopTimer());

  let progressPct = $derived(
    totalDuration > 0 ? ((totalDuration - remaining) / totalDuration) * 100 : 0,
  );
</script>

<div class="chrono" class:finished class:urgent={remaining <= 10 && !finished}>
  <p class="chrono-label">Repos</p>
  <div class="ring-wrap">
    <svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
      <circle class="ring-bg" cx="60" cy="60" r="52" />
      <circle
        class="ring-fill"
        cx="60"
        cy="60"
        r="52"
        style="stroke-dashoffset: {326.73 * (1 - progressPct / 100)}"
      />
    </svg>
    <p class="chrono-time">{formatTime(remaining)}</p>
  </div>

  {#if !finished}
    <div class="chrono-actions">
      <div class="add-row">
        <button type="button" class="btn-add" onclick={() => addTime(15)}>+15 s</button>
        <button type="button" class="btn-add" onclick={() => addTime(30)}>+30 s</button>
      </div>
      <button type="button" class="btn-primary chrono-next" onclick={skip}>Série suivante</button>
    </div>
  {:else}
    <p class="done-msg">Repos terminé — prêt !</p>
  {/if}
</div>

<style>
  .chrono {
    background: var(--bg-elevated);
    border-radius: calc(var(--radius) * 4);
    padding: 1.5rem 1.25rem;
    text-align: center;
    margin: 1rem 0;
    border: 2px solid var(--border);
  }

  .chrono.finished {
    border-color: var(--deepblue);
  }

  .chrono.urgent {
    border-color: var(--pink);
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.75;
    }
  }

  .chrono-label {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
  }

  .ring-wrap {
    position: relative;
    width: 160px;
    height: 160px;
    margin: 0 auto 1.25rem;
  }

  .ring {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-bg {
    fill: none;
    stroke: var(--border);
    stroke-width: 6;
  }

  .ring-fill {
    fill: none;
    stroke: var(--pink);
    stroke-width: 6;
    stroke-linecap: round;
    stroke-dasharray: 326.73;
    transition: stroke-dashoffset 0.25s linear;
  }

  .chrono-time {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Montserrat', sans-serif;
    font-size: 2.5rem;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    color: var(--text-heading);
    margin: 0;
    line-height: 1;
  }

  .chrono-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .add-row {
    display: flex;
    gap: 0.5rem;
  }

  .btn-add {
    flex: 1;
    min-height: 48px;
    background: var(--secondary);
    color: var(--text);
    border: 1px solid var(--border);
    font-size: 0.85rem;
  }

  .chrono-next {
    min-height: 64px;
    font-size: 1.05rem;
  }

  .done-msg {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    color: var(--pink);
    font-weight: 500;
    font-size: 1.15rem;
    margin: 0;
  }
</style>
