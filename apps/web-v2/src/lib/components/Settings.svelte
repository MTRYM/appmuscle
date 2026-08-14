<script>
  import { getSettings, updateSettings } from '$lib/api';
  import { applyTheme } from '$lib/theme';
  import { todayISO } from '$lib/programme';
  import { onMount } from 'svelte';

  let settings = $state(null);
  let startDate = $state('');
  let theme = $state('dark');
  let message = $state('');

  onMount(async () => {
    settings = await getSettings();
    startDate = settings.programStartDate ?? todayISO();
    theme = settings.theme ?? 'dark';
  });

  async function saveStartDate() {
    if (!startDate) return;
    await updateSettings({ programStartDate: startDate });
    settings = await getSettings();
    message = 'Date de début enregistrée.';
  }

  async function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    await updateSettings({ theme });
    applyTheme(theme);
    settings = await getSettings();
  }

</script>

<div class="settings">
  <h1>Réglages</h1>

  {#if message}
    <div class="card message">{message}</div>
  {/if}

  <div class="card">
    <h2>Programme</h2>
    <label>
      <span class="label">Date de début du programme</span>
      <div class="date-field">
        <input type="date" bind:value={startDate} />
      </div>
    </label>
    <button type="button" class="btn-primary save-date-btn" onclick={saveStartDate}>
      Enregistrer la date
    </button>
  </div>

  <div class="card">
    <h2>Apparence</h2>
    <button type="button" class="btn-secondary" onclick={toggleTheme}>
      Thème : {theme === 'dark' ? 'Sombre' : 'Clair'} — Appuyer pour changer
    </button>
  </div>
</div>

<style>
  .settings {
    width: 100%;
  }

  .label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 0.35rem;
  }

  .save-date-btn {
    margin-top: 0.75rem;
  }

  .message {
    background: color-mix(in srgb, var(--success) 15%, var(--bg-card));
    border-color: var(--success);
    color: var(--text);
  }
</style>
