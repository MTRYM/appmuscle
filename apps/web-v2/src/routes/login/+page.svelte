<script lang="ts">
  let password = $state('');
  let error = $state('');
  let loading = $state(false);
  let isFirstLogin = $state(false);

  async function handleLogin() {
    if (!password.trim()) {
      error = 'Entrez votre mot de passe.';
      return;
    }
    loading = true;
    error = '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      if (res.ok) {
        window.location.href = '/';
      } else {
        const data = await res.json();
        error = data.error || 'Erreur inconnue';
      }
    } catch (e: any) {
      error = 'Impossible de contacter le serveur.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>AppMuscu — Connexion</title>
</svelte:head>

<div class="login-page">
  <div class="login-card">
    <div class="logo">
      <span class="logo-icon">🏋️</span>
      <h1>AppMuscu</h1>
      <p class="tagline">Votre coach personnel</p>
    </div>

    <form class="login-form" onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
      <label for="password" class="field-label">
        Mot de passe
      </label>
      <input
        id="password"
        type="password"
        placeholder="••••••••"
        bind:value={password}
        disabled={loading}
        autocomplete="current-password"
      />

      <p class="hint">
        Première connexion ? Le mot de passe que vous entrez deviendra votre mot de passe permanent.
      </p>

      {#if error}
        <div class="error-msg">{error}</div>
      {/if}

      <button type="submit" class="btn-primary" disabled={loading}>
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  </div>
</div>

<style>
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-base, #070706);
    padding: 1.5rem;
  }

  .login-card {
    width: 100%;
    max-width: 380px;
    background: var(--bg-elevated, #1a1918);
    border: 1px solid var(--border, #2a2928);
    border-radius: 16px;
    padding: 2.5rem 2rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .logo {
    text-align: center;
    margin-bottom: 2rem;
  }

  .logo-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 0.5rem;
  }

  .logo h1 {
    font-size: 1.6rem;
    font-weight: 800;
    margin: 0;
    color: var(--text-primary, #f5f5f4);
  }

  .tagline {
    font-size: 0.85rem;
    color: var(--text-muted, #8a8886);
    margin: 0.25rem 0 0;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .field-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted, #8a8886);
  }

  input {
    width: 100%;
    box-sizing: border-box;
    background: var(--bg-base, #070706);
    border: 1px solid var(--border, #2a2928);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    color: var(--text-primary, #f5f5f4);
    font-size: 1rem;
    letter-spacing: 0.05em;
    transition: border-color 0.2s;
  }

  input:focus {
    outline: none;
    border-color: var(--accent, #e8a54b);
  }

  .hint {
    font-size: 0.75rem;
    color: var(--text-muted, #8a8886);
    line-height: 1.4;
  }

  .error-msg {
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    color: #ef4444;
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
    font-size: 0.85rem;
  }

  .btn-primary {
    width: 100%;
    padding: 0.75rem;
    background: var(--accent, #e8a54b);
    color: #000;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s;
    margin-top: 0.5rem;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
