<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Play, Pause, Square, RotateCcw } from 'lucide-svelte';

  let {
    targetSeconds = 20,
    exerciseName = '',
    onTimeRecorded = (seconds: number) => {},
  } = $props<{
    targetSeconds?: number;
    exerciseName?: string;
    onTimeRecorded?: (seconds: number) => void;
  }>();

  // State
  let prepCountdown = $state(true); // 3-second preparation countdown
  let state = $state<'idle' | 'prepping' | 'running' | 'paused' | 'finished'>('idle');
  let prepRemaining = $state(3);
  let timerTarget = $state(20);
  let currentSeconds = $state(20);
  let elapsedSec = $state(0);
  let recordedSeconds = $state(20);

  let activeInterval: ReturnType<typeof setInterval> | null = null;
  let prepInterval: ReturnType<typeof setInterval> | null = null;
  let startTime = 0;
  let accumulatedTime = 0;

  // Sync initial target
  $effect(() => {
    if (state === 'idle') {
      const initial = targetSeconds > 0 ? targetSeconds : 20;
      timerTarget = initial;
      currentSeconds = initial;
      elapsedSec = 0;
    }
  });

  // Clean Web Audio beeper
  function playTone(freq: number, durationSec: number) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationSec);
    } catch {
      // Audio not permitted or unavailable
    }
  }

  function vibrate(pattern: number | number[]) {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore
    }
  }

  function playPrepTone() {
    playTone(520, 0.15);
    vibrate(60);
  }

  function playGoTone() {
    playTone(980, 0.35);
    vibrate([100, 50, 150]);
  }

  function playFinishTone() {
    playTone(880, 0.25);
    setTimeout(() => playTone(1100, 0.4), 180);
    vibrate([200, 100, 200, 100, 400]);
  }

  function start() {
    if (state === 'running' || state === 'prepping') return;

    if (prepCountdown && state === 'idle') {
      state = 'prepping';
      prepRemaining = 3;
      playPrepTone();

      prepInterval = setInterval(() => {
        prepRemaining -= 1;
        if (prepRemaining > 0) {
          playPrepTone();
        } else {
          if (prepInterval) clearInterval(prepInterval);
          prepInterval = null;
          playGoTone();
          runActiveTimer();
        }
      }, 1000);
    } else {
      runActiveTimer();
    }
  }

  function cancelPrep() {
    if (prepInterval) clearInterval(prepInterval);
    prepInterval = null;
    state = 'idle';
    prepRemaining = 3;
  }

  function runActiveTimer() {
    state = 'running';
    startTime = Date.now();

    if (activeInterval) clearInterval(activeInterval);
    activeInterval = setInterval(() => {
      const now = Date.now();
      const delta = (now - startTime) / 1000;
      const totalElapsed = accumulatedTime + delta;
      elapsedSec = Math.floor(totalElapsed);

      const remaining = Math.max(0, timerTarget - totalElapsed);
      currentSeconds = Math.ceil(remaining);

      if (remaining <= 0) {
        finishTimer(timerTarget);
      }
    }, 100);
  }

  function pause() {
    if (state !== 'running') return;
    if (activeInterval) clearInterval(activeInterval);
    activeInterval = null;
    accumulatedTime += (Date.now() - startTime) / 1000;
    elapsedSec = Math.floor(accumulatedTime);
    state = 'paused';
  }

  function resume() {
    if (state !== 'paused') return;
    runActiveTimer();
  }

  function stopAndSave() {
    if (activeInterval) clearInterval(activeInterval);
    activeInterval = null;
    const currentDelta = startTime ? (Date.now() - startTime) / 1000 : 0;
    const totalElapsed = accumulatedTime + currentDelta;
    const finalSec = Math.max(1, Math.round(totalElapsed));
    finishTimer(finalSec);
  }

  function finishTimer(sec: number) {
    if (activeInterval) clearInterval(activeInterval);
    activeInterval = null;
    if (prepInterval) clearInterval(prepInterval);
    prepInterval = null;

    state = 'finished';
    recordedSeconds = Math.max(1, Math.round(sec));
    currentSeconds = 0;
    playFinishTone();
    onTimeRecorded(recordedSeconds);
  }

  function reset() {
    if (activeInterval) clearInterval(activeInterval);
    activeInterval = null;
    if (prepInterval) clearInterval(prepInterval);
    prepInterval = null;

    state = 'idle';
    accumulatedTime = 0;
    startTime = 0;
    elapsedSec = 0;
    currentSeconds = timerTarget;
    prepRemaining = 3;
  }

  function adjustTarget(delta: number) {
    if (state !== 'idle') return;
    timerTarget = Math.max(5, timerTarget + delta);
    currentSeconds = timerTarget;
  }

  onDestroy(() => {
    if (activeInterval) clearInterval(activeInterval);
    if (prepInterval) clearInterval(prepInterval);
  });

  // Calculate circular progress percentage (matching Chrono.svelte)
  let progressPct = $derived.by(() => {
    if (state === 'prepping') {
      return ((3 - prepRemaining) / 3) * 100;
    }
    if (state === 'finished') {
      return 100;
    }
    if (timerTarget <= 0) return 0;
    return Math.min(100, Math.max(0, ((timerTarget - currentSeconds) / timerTarget) * 100));
  });

  function formatDisplayTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) {
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return `${s}s`;
  }
</script>

<div class="hold-timer" class:finished={state === 'finished'}>
  <p class="timer-label">
    {#if state === 'prepping'}
      Préparation
    {:else if state === 'running'}
      Maintien en cours
    {:else if state === 'paused'}
      En pause
    {:else if state === 'finished'}
      Maintien terminé
    {:else}
      Chrono maintien
    {/if}
  </p>

  <div class="ring-wrap">
    <svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
      <circle class="ring-bg" cx="60" cy="60" r="52" />
      <circle
        class="ring-fill"
        class:is-prepping={state === 'prepping'}
        class:is-finished={state === 'finished'}
        cx="60"
        cy="60"
        r="52"
        style="stroke-dashoffset: {326.73 * (1 - progressPct / 100)}"
      />
    </svg>

    <div class="timer-center">
      {#if state === 'prepping'}
        <span class="prep-count">{prepRemaining}</span>
        <span class="timer-sub prep-sub">Préparez-vous</span>
      {:else}
        <span class="timer-time">{formatDisplayTime(currentSeconds)}</span>
        {#if state === 'finished'}
          <span class="timer-sub success-sub">{recordedSeconds}s validées</span>
        {:else}
          <span class="timer-sub">Cible : {timerTarget}s</span>
        {/if}
      {/if}
    </div>
  </div>

  <div class="timer-actions">
    {#if state === 'idle'}
      <div class="add-row">
        <button
          type="button"
          class="btn-add"
          onclick={() => adjustTarget(-5)}
          disabled={timerTarget <= 5}
          title="Diminuer de 5 secondes"
        >
          -5 s
        </button>
        <button
          type="button"
          class="btn-add"
          onclick={() => adjustTarget(+5)}
          title="Augmenter de 5 secondes"
        >
          +5 s
        </button>
        <button
          type="button"
          class="btn-add prep-toggle"
          class:active={prepCountdown}
          onclick={() => prepCountdown = !prepCountdown}
          title="Délai de préparation de 3 secondes"
        >
          {prepCountdown ? 'Prépa 3s' : 'Direct'}
        </button>
      </div>

      <button type="button" class="btn-primary timer-next" onclick={start}>
        <Play size={18} fill="currentColor" />
        <span>Lancer le maintien ({timerTarget}s)</span>
      </button>

    {:else if state === 'prepping'}
      <button type="button" class="btn-secondary timer-cancel" onclick={cancelPrep}>
        Annuler la préparation
      </button>

    {:else if state === 'running'}
      <div class="running-row">
        <button
          type="button"
          class="btn-icon"
          onclick={pause}
          title="Mettre en pause"
          aria-label="Pause"
        >
          <Pause size={20} />
        </button>
        <button type="button" class="btn-primary timer-next" onclick={stopAndSave}>
          <Square size={16} fill="currentColor" />
          <span>Fin du maintien ({elapsedSec}s)</span>
        </button>
      </div>

    {:else if state === 'paused'}
      <div class="paused-row">
        <button
          type="button"
          class="btn-icon"
          onclick={reset}
          title="Recommencer"
          aria-label="Recommencer"
        >
          <RotateCcw size={18} />
        </button>
        <button type="button" class="btn-secondary timer-resume" onclick={resume}>
          <Play size={16} fill="currentColor" />
          <span>Reprendre</span>
        </button>
        <button type="button" class="btn-primary timer-next" onclick={stopAndSave}>
          <span>Valider ({elapsedSec}s)</span>
        </button>
      </div>

    {:else if state === 'finished'}
      <p class="done-msg">Maintien validé : {recordedSeconds}s</p>
      <div class="finished-row">
        <button type="button" class="btn-add" onclick={reset}>
          <RotateCcw size={13} />
          <span>Recommencer</span>
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .hold-timer {
    text-align: center;
    padding: 0.5rem 0 1rem;
    margin: 0.25rem 0 0.75rem;
    background: transparent;
    border: none;
    box-shadow: none;
  }

  .timer-label {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--text-muted);
    margin: 0 0 0.75rem;
  }

  .ring-wrap {
    position: relative;
    width: 200px;
    height: 200px;
    margin: 0 auto 1.25rem;
  }

  .ring {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-bg {
    fill: none;
    stroke: rgba(255, 255, 255, 0.08);
    stroke-width: 4;
  }

  .ring-fill {
    fill: none;
    stroke: #06375a;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-dasharray: 326.73;
    transition: stroke-dashoffset 0.2s linear, stroke 0.3s ease;
  }

  .ring-fill.is-prepping {
    stroke: var(--beige);
  }

  .ring-fill.is-finished {
    stroke: #238656;
  }

  .timer-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .timer-time {
    font-family: 'Montserrat', sans-serif;
    font-size: 3rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text-heading);
    line-height: 1;
    margin: 0;
  }

  .prep-count {
    font-family: 'Montserrat', sans-serif;
    font-size: 3.5rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--beige);
    line-height: 1;
    margin: 0;
    animation: prepPop 1s infinite;
  }

  .timer-sub {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    margin-top: 0.35rem;
    font-weight: 600;
  }

  .prep-sub {
    color: var(--beige);
  }

  .success-sub {
    color: #238656;
  }

  .timer-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 320px;
    margin: 0 auto;
  }

  .add-row {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    align-items: center;
  }

  .btn-add {
    min-height: 40px;
    padding: 0.45rem 1rem;
    background: color-mix(in srgb, var(--beige) 10%, transparent);
    color: var(--beige);
    border: 1px solid color-mix(in srgb, var(--beige) 25%, transparent);
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    font-family: 'Montserrat', sans-serif;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .btn-add:active {
    background: color-mix(in srgb, var(--beige) 20%, transparent);
  }

  .btn-add:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .prep-toggle.active {
    background: color-mix(in srgb, var(--beige) 22%, transparent);
    border-color: var(--beige);
  }

  .timer-next {
    min-height: 54px;
    font-size: 1rem;
    background: #06375a;
    color: #f7f5f2;
    border: none;
    border-radius: 14px;
    font-weight: 700;
    box-shadow: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    width: 100%;
    font-family: 'Montserrat', sans-serif;
  }

  .timer-next:active {
    background: color-mix(in srgb, #06375a 80%, black);
    box-shadow: none;
    transform: scale(0.98);
  }

  .running-row,
  .paused-row {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    width: 100%;
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 54px;
    height: 54px;
    min-width: 54px;
    min-height: 54px;
    border-radius: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s, border-color 0.15s;
  }

  .btn-icon:hover {
    border-color: var(--beige);
    color: var(--beige);
  }

  .btn-secondary {
    min-height: 54px;
    padding: 0 1rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 14px;
    font-size: 0.92rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    font-family: 'Montserrat', sans-serif;
    transition: background 0.15s, border-color 0.15s;
  }

  .btn-secondary:hover {
    border-color: var(--beige);
  }

  .timer-cancel {
    width: 100%;
  }

  .timer-resume {
    flex: 1;
  }

  .done-msg {
    color: #238656;
    font-weight: 700;
    font-size: 0.98rem;
    margin: 0;
    font-family: 'Montserrat', sans-serif;
  }

  .finished-row {
    display: flex;
    justify-content: center;
    margin-top: 0.25rem;
  }

  @keyframes prepPop {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.12);
    }
  }
</style>
