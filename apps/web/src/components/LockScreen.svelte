<script>
  import { Lock } from 'lucide-svelte';
  import { verifyCode, setUnlocked } from '../lib/auth.js';

  let { onUnlock = () => {} } = $props();

  let digits = $state([]);
  let error = $state(false);
  let shaking = $state(false);

  function pushDigit(n) {
    if (digits.length >= 6) return;
    error = false;
    digits = [...digits, n];
    if (digits.length === 6) {
      checkCode();
    }
  }

  function backspace() {
    error = false;
    digits = digits.slice(0, -1);
  }

  function checkCode() {
    const code = digits.join('');
    if (verifyCode(code)) {
      setUnlocked();
      onUnlock();
      return;
    }

    error = true;
    shaking = true;
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);

    setTimeout(() => {
      shaking = false;
      digits = [];
    }, 500);
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
</script>

<div class="lock-screen">
  <div class="lock-brand">
    <div class="lock-icon"><Lock size={28} strokeWidth={1.75} /></div>
    <h1>AppMuscu</h1>
    <p class="accent-text">Entrez votre code d'accès</p>
  </div>

  <div class="dots" class:shake={shaking} class:error>
    {#each Array.from({ length: 6 }) as _, i}
      <span class="dot" class:filled={i < digits.length}></span>
    {/each}
  </div>

  {#if error}
    <p class="error-msg">Code incorrect</p>
  {/if}

  <div class="keypad">
    {#each keys as key}
      {#if key === ''}
        <div class="key empty"></div>
      {:else if key === 'del'}
        <button type="button" class="key key-action" onclick={backspace} aria-label="Effacer">
          ⌫
        </button>
      {:else}
        <button type="button" class="key" onclick={() => pushDigit(key)}>
          {key}
        </button>
      {/if}
    {/each}
  </div>
</div>

<style>
  .lock-screen {
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.5rem;
    padding-top: calc(2rem + env(safe-area-inset-top));
    padding-bottom: calc(2rem + env(safe-area-inset-bottom));
    max-width: 480px;
    margin: 0 auto;
    width: 100%;
  }

  .lock-brand {
    text-align: center;
    margin-bottom: 2.5rem;
  }

  .lock-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--pink);
    margin-bottom: 1rem;
  }

  .lock-brand h1 {
    margin-bottom: 0.35rem;
  }

  .lock-brand p {
    margin: 0;
    font-size: 1.05rem;
  }

  .dots {
    display: flex;
    gap: 0.85rem;
    margin-bottom: 1rem;
  }

  .dots.shake {
    animation: shake 0.45s ease;
  }

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    20%,
    60% {
      transform: translateX(-8px);
    }
    40%,
    80% {
      transform: translateX(8px);
    }
  }

  .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid var(--border);
    background: transparent;
    transition: background 0.15s, border-color 0.15s, transform 0.15s;
  }

  .dot.filled {
    background: var(--pink);
    border-color: var(--pink);
    transform: scale(1.1);
  }

  .dots.error .dot.filled {
    background: var(--destructive);
    border-color: var(--destructive);
  }

  .error-msg {
    color: var(--destructive);
    font-size: 0.85rem;
    font-weight: 600;
    margin: 0 0 1.5rem;
    min-height: 1.25rem;
  }

  .keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.65rem;
    width: 100%;
    max-width: 320px;
  }

  .key {
    aspect-ratio: 1.2;
    min-height: 72px;
    font-family: 'Montserrat', sans-serif;
    font-size: 1.75rem;
    font-weight: 600;
    background: var(--bg-card);
    color: var(--text-heading);
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 3);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .key:active:not(.empty) {
    background: var(--bg-elevated);
    border-color: var(--pink);
  }

  .key.empty {
    background: transparent;
    border: none;
    pointer-events: none;
  }

  .key-action {
    font-size: 1.35rem;
    color: var(--text-muted);
  }
</style>
