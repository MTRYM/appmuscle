<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Play, Pause, Square, RotateCcw, Plus, Minus, Volume2, VolumeX, Check, Flame } from 'lucide-svelte';

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
  let mode = $state<'countdown' | 'stopwatch'>('countdown');
  let prepCountdown = $state(true); // 3-second preparation countdown (3...2...1...GO)
  let soundEnabled = $state(true);

  let state = $state<'idle' | 'prepping' | 'running' | 'paused' | 'finished'>('idle');
  let prepRemaining = $state(3);
  let elapsedSinceStart = $state(0);
  let timerTarget = $state(20);
  let currentSeconds = $state(20);

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let startTime = 0;
  let accumulatedTime = 0;

  // Sync initial target
  $effect(() => {
    if (state === 'idle') {
      const initial = targetSeconds > 0 ? targetSeconds : 20;
      timerTarget = initial;
      currentSeconds = mode === 'countdown' ? initial : 0;
    }
  });

  // Sound generator with Web Audio API
  function playTone(freq: number, durationSec: number, type: OscillatorType = 'sine') {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
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
    playTone(980, 0.45, 'triangle');
    vibrate([100, 50, 150]);
  }

  function playFinishTone() {
    playTone(880, 0.25);
    setTimeout(() => playTone(1175, 0.5), 200);
    vibrate([200, 100, 200, 100, 400]);
  }

  function start() {
    if (state === 'running' || state === 'prepping') return;

    if (prepCountdown && state === 'idle') {
      state = 'prepping';
      prepRemaining = 3;
      playPrepTone();

      intervalId = setInterval(() => {
        prepRemaining -= 1;
        if (prepRemaining > 0) {
          playPrepTone();
        } else {
          clearInterval(intervalId!);
          intervalId = null;
          playGoTone();
          runActiveTimer();
        }
      }, 1000);
    } else {
      runActiveTimer();
    }
  }

  function runActiveTimer() {
    state = 'running';
    startTime = Date.now();

    intervalId = setInterval(() => {
      const now = Date.now();
      const currentDelta = (now - startTime) / 1000;
      const totalElapsed = accumulatedTime + currentDelta;
      elapsedSinceStart = Math.floor(totalElapsed);

      if (mode === 'countdown') {
        const remaining = Math.max(0, timerTarget - totalElapsed);
        currentSeconds = Math.ceil(remaining);

        if (remaining <= 0) {
          finishTimer(timerTarget);
        }
      } else {
        currentSeconds = Math.floor(totalElapsed);
      }
    }, 100);
  }

  function pause() {
    if (state !== 'running') return;
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    accumulatedTime += (Date.now() - startTime) / 1000;
    state = 'paused';
  }

  function resume() {
    if (state !== 'paused') return;
    runActiveTimer();
  }

  function finishTimer(recordedSec: number) {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    state = 'finished';
    const finalSec = Math.max(1, Math.round(recordedSec));
    playFinishTone();
    onTimeRecorded(finalSec);
  }

  function stopAndSave() {
    const finalSec = mode === 'countdown'
      ? Math.max(1, Math.round(timerTarget - currentSeconds))
      : Math.max(1, Math.round(currentSeconds));
    finishTimer(finalSec);
  }

  function reset() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    state = 'idle';
    accumulatedTime = 0;
    elapsedSinceStart = 0;
    currentSeconds = mode === 'countdown' ? timerTarget : 0;
    prepRemaining = 3;
  }

  function adjustTarget(delta: number) {
    if (state !== 'idle') return;
    timerTarget = Math.max(5, timerTarget + delta);
    currentSeconds = timerTarget;
  }

  function switchMode(newMode: 'countdown' | 'stopwatch') {
    if (state !== 'idle') reset();
    mode = newMode;
    currentSeconds = newMode === 'countdown' ? timerTarget : 0;
  }

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });

  // Calculate progress percentage for circular ring
  let progressPct = $derived.by(() => {
    if (mode === 'countdown') {
      if (timerTarget <= 0) return 0;
      return Math.min(100, Math.max(0, ((timerTarget - currentSeconds) / timerTarget) * 100));
    } else {
      if (timerTarget <= 0) return 0;
      return Math.min(100, (currentSeconds / timerTarget) * 100);
    }
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

<div class="hold-timer-card" class:running={state === 'running'} class:prepping={state === 'prepping'} class:finished={state === 'finished'}>
  <div class="timer-top-bar">
    <div class="mode-tabs">
      <button
        type="button"
        class="tab-btn"
        class:active={mode === 'countdown'}
        onclick={() => switchMode('countdown')}
        disabled={state !== 'idle'}
      >
        Décompte ({timerTarget}s)
      </button>
      <button
        type="button"
        class="tab-btn"
        class:active={mode === 'stopwatch'}
        onclick={() => switchMode('stopwatch')}
        disabled={state !== 'idle'}
      >
        Chrono libre
      </button>
    </div>

    <div class="top-toggles">
      <button
        type="button"
        class="icon-toggle"
        class:active={prepCountdown}
        onclick={() => prepCountdown = !prepCountdown}
        disabled={state !== 'idle'}
        title="Délai de préparation de 3 secondes pour se mettre en place"
      >
        <span>3s prépa</span>
      </button>

      <button
        type="button"
        class="icon-toggle"
        class:active={soundEnabled}
        onclick={() => soundEnabled = !soundEnabled}
        title={soundEnabled ? 'Son activé' : 'Son coupé'}
      >
        {#if soundEnabled}
          <Volume2 size={16} />
        {:else}
          <VolumeX size={16} />
        {/if}
      </button>
    </div>
  </div>

  <!-- Center Circular Display -->
  <div class="timer-display-wrap">
    <div class="circular-ring-container">
      <svg class="ring-svg" viewBox="0 0 160 160">
        <circle class="ring-bg" cx="80" cy="80" r="70" />
        <circle
          class="ring-progress"
          class:is-finished={state === 'finished'}
          cx="80"
          cy="80"
          r="70"
          style="stroke-dashoffset: {440 - (440 * progressPct) / 100}"
        />
      </svg>

      <div class="timer-inner-content">
        {#if state === 'prepping'}
          <div class="prep-indicator">
            <span class="prep-label">PRÉPAREZ-VOUS</span>
            <span class="prep-count">{prepRemaining}</span>
          </div>
        {:else}
          <div class="time-readout">
            <span class="main-time">{formatDisplayTime(currentSeconds)}</span>
            {#if mode === 'countdown'}
              <span class="sub-label">Cible : {timerTarget}s</span>
            {:else}
              <span class="sub-label">Chrono libre</span>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Quick Target Adjusters (when idle) -->
  {#if state === 'idle' && mode === 'countdown'}
    <div class="target-adjust-row">
      <button type="button" class="btn-adjust" onclick={() => adjustTarget(-5)} title="-5 secondes">
        <Minus size={14} /> 5s
      </button>
      <span class="adjust-label">Objectif : <strong>{timerTarget}s</strong></span>
      <button type="button" class="btn-adjust" onclick={() => adjustTarget(+5)} title="+5 secondes">
        <Plus size={14} /> 5s
      </button>
    </div>
  {/if}

  <!-- Action Controls -->
  <div class="timer-controls">
    {#if state === 'idle'}
      <button type="button" class="btn-timer-main start" onclick={start}>
        <Play size={20} fill="currentColor" />
        <span>Lancer le maintien ({timerTarget}s)</span>
      </button>
    {:else if state === 'prepping'}
      <button type="button" class="btn-timer-main cancel" onclick={reset}>
        <span>Annuler la prépa</span>
      </button>
    {:else if state === 'running'}
      <div class="running-controls">
        <button type="button" class="btn-ctrl pause" onclick={pause} title="Mettre en pause">
          <Pause size={18} />
        </button>
        <button type="button" class="btn-timer-main stop" onclick={stopAndSave}>
          <Square size={16} fill="currentColor" />
          <span>Fin du maintien ({currentSeconds}s)</span>
        </button>
      </div>
    {:else if state === 'paused'}
      <div class="running-controls">
        <button type="button" class="btn-ctrl reset" onclick={reset} title="Recommencer">
          <RotateCcw size={18} />
        </button>
        <button type="button" class="btn-timer-main resume" onclick={resume}>
          <Play size={18} fill="currentColor" />
          <span>Reprendre</span>
        </button>
        <button type="button" class="btn-timer-main stop" onclick={stopAndSave}>
          <Check size={18} />
          <span>Enregistrer ({currentSeconds}s)</span>
        </button>
      </div>
    {:else if state === 'finished'}
      <div class="finished-box">
        <div class="finished-badge">
          <span class="flame-icon"><Flame size={18} /></span>
          <span>Maintien réussi ! ({currentSeconds}s)</span>
        </div>
        <button type="button" class="btn-retry" onclick={reset}>
          <RotateCcw size={14} /> Recommencer
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .hold-timer-card {
    background: color-mix(in srgb, var(--bg-elevated) 85%, var(--bg-card));
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 1.15rem;
    margin: 0.75rem 0 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.85rem;
    position: relative;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
  }

  .hold-timer-card.running {
    border-color: color-mix(in srgb, var(--pink) 70%, var(--border));
    box-shadow: 0 0 24px color-mix(in srgb, var(--pink) 25%, transparent);
  }

  .hold-timer-card.prepping {
    border-color: var(--warning);
    box-shadow: 0 0 24px color-mix(in srgb, var(--warning) 25%, transparent);
  }

  .hold-timer-card.finished {
    border-color: #4ade80;
    box-shadow: 0 0 24px rgba(74, 222, 128, 0.25);
  }

  /* === Top Bar === */
  .timer-top-bar {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .mode-tabs {
    display: flex;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 2px;
    gap: 2px;
  }

  .tab-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.65rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    min-height: auto;
    font-family: 'Montserrat', sans-serif;
  }

  .tab-btn.active {
    background: var(--bg-elevated);
    color: var(--pink);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .top-toggles {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .icon-toggle {
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-muted);
    border-radius: 8px;
    padding: 0.25rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    transition: all 0.15s ease;
  }

  .icon-toggle.active {
    color: var(--pink);
    border-color: color-mix(in srgb, var(--pink) 50%, transparent);
    background: color-mix(in srgb, var(--pink) 12%, var(--bg-card));
  }

  /* === Center Display === */
  .timer-display-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.5rem 0;
  }

  .circular-ring-container {
    width: 150px;
    height: 150px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ring-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-bg {
    fill: none;
    stroke: color-mix(in srgb, var(--border) 60%, transparent);
    stroke-width: 8;
  }

  .ring-progress {
    fill: none;
    stroke: var(--pink);
    stroke-width: 9;
    stroke-linecap: round;
    stroke-dasharray: 440;
    transition: stroke-dashoffset 0.1s linear;
  }

  .ring-progress.is-finished {
    stroke: #4ade80;
  }

  .timer-inner-content {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .time-readout {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .main-time {
    font-family: 'Montserrat', sans-serif;
    font-size: 2.2rem;
    font-weight: 800;
    line-height: 1;
    color: var(--text-heading);
    letter-spacing: -0.02em;
  }

  .sub-label {
    font-size: 0.72rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .prep-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: scaleIn 0.3s ease;
  }

  .prep-label {
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--warning);
    letter-spacing: 0.08em;
  }

  .prep-count {
    font-family: 'Montserrat', sans-serif;
    font-size: 3rem;
    font-weight: 800;
    color: var(--warning);
    line-height: 1;
    animation: prepPulse 1s infinite;
  }

  /* === Adjust Row === */
  .target-adjust-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  .adjust-label strong {
    color: var(--pink);
  }

  .btn-adjust {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 8px;
    padding: 0.2rem 0.55rem;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    min-height: auto;
    transition: all 0.15s ease;
  }

  .btn-adjust:hover {
    border-color: var(--pink);
    color: var(--pink);
  }

  /* === Controls === */
  .timer-controls {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .btn-timer-main {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 0.55rem !important;
    width: 100% !important;
    padding: 0.75rem 1.25rem !important;
    border-radius: 12px !important;
    font-family: 'Montserrat', sans-serif !important;
    font-weight: 700 !important;
    font-size: 0.92rem !important;
    cursor: pointer !important;
    border: none !important;
    min-height: 48px !important;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }

  .btn-timer-main.start {
    background: linear-gradient(135deg, var(--pink), color-mix(in srgb, var(--pink) 80%, #fff)) !important;
    color: #070706 !important;
    box-shadow: 0 4px 16px rgba(230, 166, 178, 0.3) !important;
  }

  .btn-timer-main.start:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 20px rgba(230, 166, 178, 0.45) !important;
  }

  .btn-timer-main.stop {
    background: var(--destructive) !important;
    color: #fff !important;
  }

  .btn-timer-main.resume {
    background: var(--pink) !important;
    color: #070706 !important;
  }

  .btn-timer-main.cancel {
    background: var(--bg-card) !important;
    color: var(--text-muted) !important;
    border: 1px solid var(--border) !important;
  }

  .running-controls {
    display: flex;
    gap: 0.65rem;
    width: 100%;
  }

  .btn-ctrl {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 12px;
    width: 48px;
    height: 48px;
    min-height: 48px;
    min-width: 48px;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s ease;
    padding: 0;
  }

  .btn-ctrl:hover {
    border-color: var(--pink);
    color: var(--pink);
  }

  .finished-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: color-mix(in srgb, #4ade80 15%, var(--bg-card));
    border: 1px solid color-mix(in srgb, #4ade80 35%, transparent);
    border-radius: 12px;
    padding: 0.6rem 1rem;
  }

  .finished-badge {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: #4ade80;
    font-weight: 700;
    font-size: 0.88rem;
    font-family: 'Montserrat', sans-serif;
  }

  .flame-icon {
    display: inline-flex;
    animation: flameBounce 0.8s infinite alternate ease-in-out;
  }

  .btn-retry {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 8px;
    padding: 0.35rem 0.75rem;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    min-height: auto;
  }

  .btn-retry:hover {
    border-color: var(--pink);
    color: var(--pink);
  }

  @keyframes prepPulse {
    0% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 0.8; }
  }

  @keyframes scaleIn {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes flameBounce {
    from { transform: translateY(0); }
    to { transform: translateY(-3px); }
  }
</style>
